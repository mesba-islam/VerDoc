// app/api/paddle/webhook/route.ts
import { NextResponse } from "next/server";
import { verifyPaddleSignature } from "@/lib/paddle/verify";
import supabaseAdmin from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PADDLE_API_URL = process.env.PADDLE_API_URL ?? "https://api.paddle.com";
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;

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
    const message = payload?.error?.message ?? payload?.message ?? `Paddle request failed (${response.status})`;
    throw new Error(message);
  }

  return response.status === 204 ? null : await response.json();
}

type PaddleItemPrice = { id: string };
type PaddleItem = { price?: PaddleItemPrice | null } | null;

type PaddleData = {
  id?: string; // subscription id (stable)
  subscription_id?: string; // some payloads use this
  transaction_id?: string;
  checkout?: { id?: string } | null;
  status?: string | null;
  custom_data?: { user_id?: string; plan_id?: string } | null;
  current_billing_period?: { starts_at?: string; ends_at?: string } | null;
  items?: PaddleItem[] | null;
  price?: { id?: string } | null;
  paddle_price_id?: string | null;
  last_payment?: { id?: string } | null;
};

type PaddleEvent = {
  event_id: string;
  event_type: string;
  data: PaddleData;
};

function isPaddleEvent(v: unknown): v is PaddleEvent {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.event_id === "string" && typeof o.event_type === "string" && typeof o.data === "object" && o.data !== null;
}

const toISO = (v?: string | Date | null): string | undefined =>
  v ? new Date(v).toISOString() : undefined;

async function resolvePlanId(data: PaddleData): Promise<string | null> {
  // Prefer Paddle price id from items/price fields
  const paddlePriceId =
    data.items?.[0]?.price?.id ??
    data.price?.id ??
    data.paddle_price_id ??
    null;

  if (paddlePriceId) {
    const { data: planRow, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("paddle_price_id", paddlePriceId)
      .maybeSingle();

    if (!error && planRow?.id) return planRow.id;
  }

  // Fallback to custom_data.plan_id if supplied
  return data.custom_data?.plan_id ?? null;
}

export async function POST(req: Request) {
  // 1) Read raw body and verify signature
  const rawBody = await req.text();
  const ok = await verifyPaddleSignature({ rawBody, headers: req.headers });
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  // 2) Parse & validate shape
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!isPaddleEvent(parsed)) {
    return NextResponse.json({ error: "unexpected payload shape" }, { status: 400 });
  }

  const { event_type: eventType, data } = parsed;

  // 3) Extract common fields (robust to Paddle variants)
  const paddleSubscriptionId =
    data.id ?? data.subscription_id ?? null;
  const paddleTransactionId =
    data.transaction_id ?? data.last_payment?.id ?? null;
  const paddleCheckoutId = data.checkout?.id ?? null;
  const userId = data.custom_data?.user_id ?? null;

  // Period window (fallback: now → now+1m)
  const startISO =
    toISO(data.current_billing_period?.starts_at) ?? new Date().toISOString();
  const endISO =
    toISO(data.current_billing_period?.ends_at) ??
    new Date(new Date(startISO).setMonth(new Date(startISO).getMonth() + 1)).toISOString();

  // Helper to upsert subscription by stable id
  // const upsertSubscription = async (fields: Record<string, unknown>) => {
  //   return supabaseAdmin
  //     .from("subscriptions")
  //     .upsert([fields], { onConflict: "paddle_subscription_id" });
  // };

  // function safeVal<T>(v: T | null | undefined): T | null {
  //   return v ?? null;
  // }
  
  
  
  try {
    switch (eventType) {
      // New or re-activated subscription
      case "subscription.created":
      case "subscription.activated": {
        const planId = await resolvePlanId(data);

        if (!userId || !planId || !paddleSubscriptionId) {
          return NextResponse.json({ error: "missing fields" }, { status: 400 });
        }

        // Ensure only one active sub per user (end others)
        // await supabaseAdmin
        //   .from("subscriptions")
        //   .update({ status: "canceled" })
        //   .eq("user_id", userId)
        //   .in("status", ["active"])
        //   .neq("paddle_subscription_id", paddleSubscriptionId);

        // const { error } = await upsertSubscription({
        //   user_id: userId,
        //   plan_id: planId,
        //   paddle_subscription_id: paddleSubscriptionId,
        //   paddle_transaction_id: safeVal(paddleTransactionId),
        //   paddle_checkout_id: safeVal(paddleCheckoutId),
        //   status: data.status ?? "active",
        //   starts_at: startISO,
        //   ends_at: endISO,
        //   updated_at: new Date().toISOString(),
        // });
        // if (error) throw error;

        const { data: existingActive, error: selErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id, paddle_subscription_id")
        .eq("user_id", userId)
        .in("status", ["active"])
        .maybeSingle();
      if (selErr) throw selErr;
    
      const payload = {
        plan_id: planId,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_transaction_id: paddleTransactionId ?? null,
        // only include checkout id if present
        ...(paddleCheckoutId ? { paddle_checkout_id: paddleCheckoutId } : {}),
        status: data.status ?? "active",
        starts_at: startISO,
        ends_at: endISO,
        auto_renew: data.status !== "canceled",
        updated_at: new Date().toISOString(),
      };
    
      if (existingActive) {
        const isDifferent =
          Boolean(existingActive.paddle_subscription_id) &&
          existingActive.paddle_subscription_id !== paddleSubscriptionId;

        if (isDifferent) {
          try {
            const cancelPayload = await callPaddle(
              `/subscriptions/${existingActive.paddle_subscription_id}/cancel`,
              {
                method: "POST",
                body: JSON.stringify({ effective_from: "immediately" }),
              },
            );
            const effectiveAt = cancelPayload?.data?.scheduled_change?.effective_at ?? new Date().toISOString();
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "canceled",
                auto_renew: false,
                ends_at: effectiveAt ? new Date(effectiveAt).toISOString() : new Date().toISOString(),
                cancel_at: effectiveAt ? new Date(effectiveAt).toISOString() : new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingActive.id);
          } catch (e) {
            console.error("[webhook] failed to cancel previous subscription", e);
            // Continue and record new subscription to avoid blocking the user
          }

          const { error } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              user_id: userId,
              ...payload,
            });
          if (error) throw error;

          return NextResponse.json({ ok: true });
        }
        // 2) Update the active row in place (avoids creating a second active row)
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update(payload)
          .eq("id", existingActive.id);
        if (error) throw error;
      } else {
        // 3) No active row → insert a new one
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            ...payload,
          });
        if (error) throw error;
      }
        return NextResponse.json({ ok: true });
      }

      // Renewal (advance period window)
      case "payment.succeeded": {
        if (!paddleSubscriptionId) return NextResponse.json({ ok: true });

        const { data: existing, error: selErr } = await supabaseAdmin
          .from("subscriptions")
          .select("ends_at")
          .eq("paddle_subscription_id", paddleSubscriptionId)
          .maybeSingle();
        if (selErr) throw selErr;

        const knownEnd = existing?.ends_at ? new Date(existing.ends_at).getTime() : 0;
        const incomingEnd = new Date(endISO).getTime();

        if (incomingEnd > knownEnd) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              starts_at: startISO,
              ends_at: endISO,
              status: "active",
              paddle_transaction_id: paddleTransactionId ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("paddle_subscription_id", paddleSubscriptionId);
          if (error) throw error;
        }
        return NextResponse.json({ ok: true });
      }

      // Plan changed (apply new plan_id; effective at next renewal by policy)
      case "subscription.updated": {
        if (!paddleSubscriptionId) return NextResponse.json({ ok: true });
        const planId = await resolvePlanId(data);
        if (planId) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ plan_id: planId, updated_at: new Date().toISOString() })
            .eq("paddle_subscription_id", paddleSubscriptionId);
          if (error) throw error;
        }
        return NextResponse.json({ ok: true });
      }

      // Cancel / Pause / Resume
      case "subscription.canceled":
      case "subscription.paused":
      case "subscription.resumed": {
        if (!paddleSubscriptionId) return NextResponse.json({ ok: true });
        const statusMap: Record<string, string> = {
          "subscription.canceled": "canceled",
          "subscription.paused": "paused",
          "subscription.resumed": "active",
        };
        const autoRenewMap: Record<string, boolean> = {
          "subscription.canceled": false,
          "subscription.paused": false,
          "subscription.resumed": true,
        };
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: statusMap[eventType],
            auto_renew: autoRenewMap[eventType],
            starts_at: startISO ?? undefined,
            ends_at: endISO ?? undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("paddle_subscription_id", paddleSubscriptionId);
        if (error) throw error;

        return NextResponse.json({ ok: true });
      }

      default:
        // Acknowledge other events to prevent retries
        return NextResponse.json({ received: true });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    console.error("Webhook handling error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
