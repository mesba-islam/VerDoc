import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";

const PADDLE_API_URL =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const CUSTOMER_PORTAL_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_PADDLE_CUSTOMER_PORTAL_URL ??
    process.env.PADDLE_CUSTOMER_PORTAL_URL ??
    null;
  return raw?.trim() ?? null;
})();

const BILLING_STATUSES = new Set(["active", "trialing"]);

type SubscriptionRow = {
  id: string;
  status: string;
  paddle_subscription_id: string | null;
};

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
    let raw = "";
    let payload: Record<string, unknown> | null = null;
    try {
      raw = await response.text();
      payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      // non-json body; keep raw string
    }

    const message =
      (payload?.error as { message?: string } | undefined)?.message ??
      (payload?.message as string | undefined) ??
      (raw ? `Paddle request failed (${response.status}): ${raw}` : `Paddle request failed (${response.status})`);

    throw new Error(message);
  }

  return response.status === 204 ? null : await response.json();
}

async function getPaddleSubscription(subscriptionId: string) {
  const payload = await callPaddle(`/subscriptions/${subscriptionId}`, { method: "GET" });
  return payload?.data ?? null;
}

async function getActiveSubscriptionForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status, paddle_subscription_id")
    .eq("user_id", userId)
    .order("ends_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

function resolveBillingUrl(req: Request) {
  const originHeader = req.headers.get("origin");
  const baseFromEnv = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? null;
  const fallBack = new URL(req.url).origin;
  const base = originHeader ?? baseFromEnv ?? fallBack;
  return `${base.replace(/\/$/, "")}/billing`;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subscription: SubscriptionRow | null = null;
  try {
    subscription = await getActiveSubscriptionForUser(user.id);
  } catch (subError) {
    console.error("[payment-method] subscription query failed", subError);
    return NextResponse.json({ error: "Unable to load subscription" }, { status: 500 });
  }

  if (!subscription || !subscription.paddle_subscription_id) {
    return NextResponse.json({ error: "No subscription to update" }, { status: 404 });
  }

  if (!BILLING_STATUSES.has(subscription.status)) {
    return NextResponse.json({ error: "Subscription cannot be updated" }, { status: 409 });
  }

  try {
    if (CUSTOMER_PORTAL_URL) {
      return NextResponse.json({ url: CUSTOMER_PORTAL_URL });
    }

    const redirectUrl = resolveBillingUrl(req);
    const paddleSubscription = await getPaddleSubscription(subscription.paddle_subscription_id);

    const customerId =
      paddleSubscription?.customer_id ??
      paddleSubscription?.customer?.id ??
      paddleSubscription?.customer?.paddle_id ??
      null;

    if (!customerId) {
    throw new Error("Paddle subscription is missing customer_id");
  }

    let portalUrl: string | null = null;

    try {
      const portalPayload = await callPaddle("/billing-portal/sessions", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId,
          return_url: redirectUrl,
        }),
      });

      portalUrl = portalPayload?.data?.url ?? null;
    } catch (portalError) {
      console.error("[payment-method] billing portal session failed, attempting direct update link", portalError);
    }

    if (!portalUrl) {
      const updatePayload = await callPaddle(
        `/subscriptions/${subscription.paddle_subscription_id}/update-payment-method`,
        {
          method: "POST",
          body: JSON.stringify({
            success_url: redirectUrl,
            cancel_url: redirectUrl,
          }),
        },
      );

      portalUrl =
        updatePayload?.data?.url ??
        updatePayload?.data?.update_payment_method_url ??
        updatePayload?.data?.update_payment_method?.url ??
        null;
    }

    if (!portalUrl || typeof portalUrl !== "string") {
      throw new Error("Paddle did not return a billing portal or update URL");
    }

    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to start payment method update";
    console.error("[payment-method] unable to create hosted session", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
