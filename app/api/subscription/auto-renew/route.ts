import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";

const PADDLE_API_URL = process.env.PADDLE_API_URL ?? "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

const MANAGEABLE_STATUSES = new Set(["active", "trialing"]);

type SubscriptionRow = {
  id: string;
  auto_renew: boolean;
  status: string;
  ends_at: string | null;
  cancel_at: string | null;
  paddle_subscription_id: string | null;
};

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

  const { data, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, auto_renew, status, ends_at, cancel_at, paddle_subscription_id")
    .eq("user_id", user.id)
    .order("ends_at", { ascending: false, nullsFirst: false })
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

  const response = await fetch(`${PADDLE_API_URL}${path}`, {
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
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ?? payload?.message ?? `Paddle request failed (${response.status})`;
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
    const endpoint = desired
      ? `/subscriptions/${subscription.paddle_subscription_id}/resume`
      : `/subscriptions/${subscription.paddle_subscription_id}/cancel`;

    const payload = desired ? null : { effective_from: "next_billing_period" };

    const paddlePayload = await callPaddle(endpoint, {
      method: "POST",
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });

    const renewalEndsAt =
      paddlePayload?.data?.current_billing_period?.ends_at ??
      paddlePayload?.data?.next_payment?.date ??
      subscription.ends_at;

    const scheduledCancel =
      desired ? null : paddlePayload?.data?.scheduled_change?.effective_at ?? renewalEndsAt;

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        auto_renew: desired,
        status: paddlePayload?.data?.status ?? subscription.status,
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
