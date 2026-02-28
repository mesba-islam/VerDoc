import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { ensureActiveSubscription } from "@/app/lib/subscriptionHelpers";

const PADDLE_API_URL = process.env.PADDLE_API_URL ?? "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

type Body = {
  planId?: string;
  paddlePriceId?: string;
  proration?: "immediate" | "next_billing_period";
  quantity?: number;
};

type SubscriptionRow = {
  id: string;
  plan_id: string | null;
  paddle_subscription_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type PaddleSubscriptionResponse = {
  data?: {
    current_billing_period?: {
      starts_at?: string | null;
      ends_at?: string | null;
    } | null;
  } | null;
} | null;

async function callPaddle(path: string, init: RequestInit) {
  if (!PADDLE_API_KEY) throw new Error("PADDLE_API_KEY is not set");
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
    const message = payload?.error?.message ?? payload?.message ?? `Paddle request failed (${response.status})`;
    throw new Error(message);
  }
  return response.status === 204 ? null : await response.json();
}

async function getActiveSubscriptionForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, plan_id, paddle_subscription_id, status, starts_at, ends_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .not("paddle_subscription_id", "is", null)
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (error) throw error;
  return data ?? null;
}

async function resolvePaddlePriceId({ planId, paddlePriceId }: { planId?: string; paddlePriceId?: string }) {
  if (paddlePriceId) return { paddlePriceId, planId: undefined } as const;
  if (!planId) return { paddlePriceId: undefined, planId: undefined } as const;

  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("id, paddle_price_id")
    .eq("id", planId)
    .maybeSingle<{ id: string; paddle_price_id: string | null }>();
  if (error) throw error;
  return { paddlePriceId: data?.paddle_price_id ?? undefined, planId } as const;
}

export async function POST(req: Request) {
  let body: Body | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const proration = body?.proration ?? "immediate";
  const quantity = body?.quantity ?? 1;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureActiveSubscription(user.id);

  // Find the active subscription we will amend
  const subscription = await getActiveSubscriptionForUser(user.id);
  if (!subscription || !subscription.paddle_subscription_id) {
    return NextResponse.json({ error: "No active subscription to change" }, { status: 404 });
  }

  // Determine the target Paddle price id
  const { paddlePriceId, planId } = await resolvePaddlePriceId({
    planId: body?.planId,
    paddlePriceId: body?.paddlePriceId,
  });

  if (!paddlePriceId) {
    return NextResponse.json({ error: "Missing target plan or paddlePriceId" }, { status: 400 });
  }

  // Build items for update/schedule
  const items = [
    {
      price_id: paddlePriceId,
      quantity,
    },
  ];

  try {
    let paddleResp: PaddleSubscriptionResponse = null;
    if (proration === "next_billing_period") {
      // Schedule the change at renewal using dedicated endpoint
      paddleResp = await callPaddle(
        `/subscriptions/${subscription.paddle_subscription_id}/schedule_change`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "update",
            items,
            effective_at: "next_billing_period",
          }),
        },
      );
    } else {
      // Immediate change: propagate new price and ask Paddle to prorate the invoice right away
      const updatePayload = {
        items,
        proration_billing_mode: "prorated_immediately",
      };

      paddleResp = await callPaddle(`/subscriptions/${subscription.paddle_subscription_id}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      });
    }

    // Optimistically update local plan_id for immediate UX; webhook will keep source of truth
    if (planId) {
      // Try to pick up the current billing window from Paddle response
      const startISO = paddleResp?.data?.current_billing_period?.starts_at
        ? new Date(paddleResp.data.current_billing_period.starts_at).toISOString()
        : subscription.starts_at;
      const endISO = paddleResp?.data?.current_billing_period?.ends_at
        ? new Date(paddleResp.data.current_billing_period.ends_at).toISOString()
        : subscription.ends_at;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id: planId,
          starts_at: startISO ?? subscription.starts_at,
          ends_at: endISO ?? subscription.ends_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
    }

    return NextResponse.json({ ok: true, paddle: paddleResp });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change plan";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
