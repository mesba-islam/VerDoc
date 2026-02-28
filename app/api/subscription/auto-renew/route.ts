import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { ensureActiveSubscription } from "@/app/lib/subscriptionHelpers";

const PADDLE_API_URL =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : process.env.PADDLE_API_URL ?? "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

const MANAGEABLE_STATUSES = new Set(["active"]);

type SubscriptionRow = {
  id: string;
  auto_renew: boolean;
  status: string;
  ends_at: string | null;
  cancel_at: string | null;
  paddle_subscription_id: string | null;
};

type PaddleResponse = {
  data?: {
    current_billing_period?: { ends_at?: string | null } | null;
    next_payment?: { date?: string | null } | null;
    scheduled_change?: { effective_at?: string | null } | null;
    status?: string | null;
  } | null;
} | null;

const toISO = (value?: string | null) => (value ? new Date(value).toISOString() : null);

async function getSessionAndSubscription() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    await ensureActiveSubscription(user.id);
  } catch (syncError) {
    console.error("[auto-renew] subscription sync error", syncError);
    return { errorResponse: NextResponse.json({ error: "Unable to sync subscription" }, { status: 500 }) };
  }

  const { data, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, auto_renew, status, ends_at, cancel_at, paddle_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .not("paddle_subscription_id", "is", null)
    .order("cancel_at", { ascending: true, nullsFirst: true })
    .order("ends_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (subError) {
    console.error("[auto-renew] subscription query error", subError);
    return { errorResponse: NextResponse.json({ error: subError.message }, { status: 500 }) };
  }

  return { userId: user.id, subscription: data ?? null };
}

async function callPaddle(path: string, init: RequestInit) {
  if (!PADDLE_API_KEY) {
    throw new Error("PADDLE_API_KEY is not set");
  }

  const url = `${PADDLE_API_URL}${path}`;
  console.log(`[paddle] ${init.method || "GET"} ${url}`);

  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let raw = "";
    let payload: Record<string, unknown> | null = null;
    try {
      raw = await response.text();
      payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      // ignore non-json errors
    }

    const message =
      (payload?.error as { message?: string } | undefined)?.message ??
      (payload?.message as string | undefined) ??
      (raw ? `Paddle request failed (${response.status}): ${raw}` : `Paddle request failed (${response.status})`);
    console.error(`[paddle] ${init.method || "GET"} ${path} failed with ${response.status}`, message);
    throw new Error(message);
  }

  return response.status === 204 ? null : await response.json();
}

export async function GET() {
  const { errorResponse, subscription } = await getSessionAndSubscription();
  if (errorResponse) return errorResponse;

  if (!subscription || !MANAGEABLE_STATUSES.has(subscription.status)) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  return NextResponse.json({
    autoRenew: subscription.auto_renew,
    status: subscription.status,
    renewsAt: subscription.ends_at,
    cancelAt: subscription.cancel_at,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const desired = body?.autoRenew;

  if (typeof desired !== "boolean") {
    return NextResponse.json({ error: "autoRenew must be a boolean" }, { status: 400 });
  }

  const { errorResponse, subscription } = await getSessionAndSubscription();
  if (errorResponse) return errorResponse;

  if (!subscription || !subscription.paddle_subscription_id) {
    return NextResponse.json({ error: "No active subscription to update" }, { status: 404 });
  }

  if (!MANAGEABLE_STATUSES.has(subscription.status)) {
    return NextResponse.json({ error: "Subscription is not active" }, { status: 409 });
  }

  if (subscription.auto_renew === desired) {
    return NextResponse.json({
      autoRenew: subscription.auto_renew,
      status: subscription.status,
      renewsAt: subscription.ends_at,
      cancelAt: subscription.cancel_at,
    });
  }

  try {
    let paddlePayload: PaddleResponse = null;

    if (desired) {
      paddlePayload = await callPaddle(
        `/subscriptions/${subscription.paddle_subscription_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ scheduled_change: null }),
        },
      );
    } else {
      paddlePayload = await callPaddle(
        `/subscriptions/${subscription.paddle_subscription_id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ effective_from: "next_billing_period" }),
        },
      );
    }

    const renewalEndsAt =
      paddlePayload?.data?.current_billing_period?.ends_at ??
      paddlePayload?.data?.next_payment?.date ??
      subscription.ends_at;

    const scheduledCancel = desired
      ? null
      : paddlePayload?.data?.scheduled_change?.effective_at ?? renewalEndsAt;

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        auto_renew: desired,
        status: (paddlePayload?.data?.status as string | undefined) ?? subscription.status,
        ends_at: toISO(renewalEndsAt) ?? subscription.ends_at,
        cancel_at: toISO(scheduledCancel),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select("auto_renew, status, ends_at, cancel_at")
      .single<SubscriptionRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to persist subscription update");
    }

    return NextResponse.json({
      autoRenew: data.auto_renew,
      status: data.status,
      renewsAt: data.ends_at,
      cancelAt: data.cancel_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update auto-renew";
    console.error("[auto-renew] update error", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
