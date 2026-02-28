// Shared helpers for subscription lookups and automatic Free plan provisioning
import supabaseAdmin from '@/lib/supabase/admin';

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  auto_renew?: boolean | null;
  paddle_subscription_id?: string | null;
  cancel_at?: string | null;
};

export type PlanRow = {
  id: string;
  name: string;
  upload_limit_mb: number;
  transcription_mins: number;
  summarization_limit: number | null;
  billing_interval: string | null;
  price?: number | null;
  doc_export_limit?: number | null;
  premium_templates?: boolean | null;
  archive_access?: boolean | null;
};

const FREE_PLAN_NAME = 'Free';
const PADDLE_API_URL =
  process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : process.env.PADDLE_API_URL ?? 'https://api.paddle.com';
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const CURRENT_PADDLE_STATUSES = new Set(['active', 'trialing']);

type SubscriptionWithPlanRow = SubscriptionRow & {
  subscription_plans: PlanRow | null;
};

type PaddleSubscriptionData = {
  status?: string | null;
  current_billing_period?: {
    starts_at?: string | null;
    ends_at?: string | null;
  } | null;
  scheduled_change?: {
    action?: string | null;
    effective_at?: string | null;
  } | null;
  items?: Array<{ price?: { id?: string | null } | null } | null> | null;
  price?: { id?: string | null } | null;
};

const startOfCurrentMonth = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfNextMonth = () => {
  const d = startOfCurrentMonth();
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
};

const isCurrentWindow = (subscription: Pick<SubscriptionRow, 'starts_at' | 'ends_at'>, now = new Date()) => {
  const startsAt = new Date(subscription.starts_at).getTime();
  const endsAt = subscription.ends_at ? new Date(subscription.ends_at).getTime() : Number.POSITIVE_INFINITY;
  const nowMs = now.getTime();

  return Number.isFinite(startsAt) && startsAt <= nowMs && endsAt >= nowMs;
};

async function fetchLatestActiveSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      plan_id,
      status,
      starts_at,
      ends_at,
      auto_renew,
      paddle_subscription_id,
      cancel_at,
      subscription_plans:subscription_plans!plan_id (
        id,
        name,
        upload_limit_mb,
        transcription_mins,
        summarization_limit,
        billing_interval,
        price,
        doc_export_limit,
        premium_templates,
        archive_access
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('ends_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<SubscriptionWithPlanRow>();

  if (error) throw error;
  return data ?? null;
}

async function fetchFreePlan() {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, upload_limit_mb, transcription_mins, summarization_limit, billing_interval, price, doc_export_limit, premium_templates, archive_access')
    .eq('name', FREE_PLAN_NAME)
    .limit(1)
    .maybeSingle<PlanRow>();

  if (error) throw error;
  return data ?? null;
}

async function resolvePlanFromPaddle(data: PaddleSubscriptionData): Promise<PlanRow | null> {
  const paddlePriceId = data.items?.[0]?.price?.id ?? data.price?.id ?? null;
  if (!paddlePriceId) return null;

  const { data: plan, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, upload_limit_mb, transcription_mins, summarization_limit, billing_interval, price, doc_export_limit, premium_templates, archive_access')
    .eq('paddle_price_id', paddlePriceId)
    .limit(1)
    .maybeSingle<PlanRow>();

  if (error) throw error;
  return plan ?? null;
}

async function callPaddle(path: string, init: RequestInit) {
  if (!PADDLE_API_KEY) {
    throw new Error('PADDLE_API_KEY is not set');
  }

  const response = await fetch(`${PADDLE_API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ??
      payload?.message ??
      `Paddle request failed (${response.status})`;
    throw new Error(message);
  }

  return response.status === 204 ? null : await response.json();
}

async function fetchPaddleSubscription(subscriptionId: string): Promise<PaddleSubscriptionData | null> {
  const payload = await callPaddle(`/subscriptions/${subscriptionId}`, { method: 'GET' });
  return payload?.data ?? null;
}

async function markSubscriptionInactive(subscription: SubscriptionRow, status = 'canceled') {
  const endedAt = subscription.ends_at ?? new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status,
      auto_renew: false,
      ends_at: endedAt,
      cancel_at: subscription.cancel_at ?? endedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) throw error;
}

async function refreshFreeSubscription(subscription: SubscriptionRow) {
  const startsAt = startOfCurrentMonth().toISOString();
  const endsAt = startOfNextMonth().toISOString();

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      starts_at: startsAt,
      ends_at: endsAt,
      auto_renew: false,
      cancel_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) throw error;

  return {
    ...subscription,
    status: 'active',
    starts_at: startsAt,
    ends_at: endsAt,
    auto_renew: false,
    cancel_at: null,
  };
}

async function syncExpiredPaidSubscription(
  subscription: SubscriptionWithPlanRow
): Promise<{ subscription: SubscriptionRow | null; plan: PlanRow | null }> {
  if (!subscription.paddle_subscription_id) {
    await markSubscriptionInactive(subscription);
    return { subscription: null, plan: null };
  }

  const paddleSubscription = await fetchPaddleSubscription(subscription.paddle_subscription_id);
  if (!paddleSubscription) {
    await markSubscriptionInactive(subscription);
    return { subscription: null, plan: null };
  }

  const remoteStartsAt = paddleSubscription.current_billing_period?.starts_at
    ? new Date(paddleSubscription.current_billing_period.starts_at).toISOString()
    : subscription.starts_at;
  const remoteEndsAt = paddleSubscription.current_billing_period?.ends_at
    ? new Date(paddleSubscription.current_billing_period.ends_at).toISOString()
    : subscription.ends_at;
  const scheduledChangeAt = paddleSubscription.scheduled_change?.effective_at
    ? new Date(paddleSubscription.scheduled_change.effective_at).toISOString()
    : null;
  const resolvedPlan = await resolvePlanFromPaddle(paddleSubscription);
  const nextPlan = resolvedPlan ?? subscription.subscription_plans;
  const hasCurrentAccess =
    remoteStartsAt !== null &&
    isCurrentWindow({ starts_at: remoteStartsAt, ends_at: remoteEndsAt ?? null });

  if (hasCurrentAccess || CURRENT_PADDLE_STATUSES.has(paddleSubscription.status ?? '')) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_id: nextPlan?.id ?? subscription.plan_id,
        status: 'active',
        starts_at: remoteStartsAt,
        ends_at: remoteEndsAt,
        auto_renew: scheduledChangeAt ? false : paddleSubscription.status !== 'canceled',
        cancel_at: scheduledChangeAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (error) throw error;

    return {
      subscription: {
        ...subscription,
        plan_id: nextPlan?.id ?? subscription.plan_id,
        status: 'active',
        starts_at: remoteStartsAt,
        ends_at: remoteEndsAt,
        auto_renew: scheduledChangeAt ? false : paddleSubscription.status !== 'canceled',
        cancel_at: scheduledChangeAt,
      },
      plan: nextPlan,
    };
  }

  await markSubscriptionInactive(
    {
      ...subscription,
      ends_at: remoteEndsAt,
      cancel_at: scheduledChangeAt ?? remoteEndsAt,
    },
    paddleSubscription.status === 'paused' ? 'paused' : 'canceled'
  );
  return { subscription: null, plan: null };
}

async function provisionFreeSubscription(
  userId: string,
  freePlan: PlanRow
): Promise<{ subscription: SubscriptionRow | null; plan: PlanRow | null }> {
  const startsAt = startOfCurrentMonth().toISOString();
  const endsAt = startOfNextMonth().toISOString();

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      starts_at: startsAt,
      ends_at: endsAt,
      auto_renew: false,
      paddle_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .select('id, user_id, plan_id, status, starts_at, ends_at, auto_renew, paddle_subscription_id, cancel_at')
    .maybeSingle<SubscriptionRow>();

  if (!insertErr) {
    return { subscription: inserted, plan: freePlan };
  }

  if (insertErr.code === '23505') {
    const existing = await fetchLatestActiveSubscription(userId);
    if (existing?.subscription_plans) {
      const { subscription_plans, ...subscription } = existing;
      return { subscription, plan: subscription_plans };
    }
  }

  throw insertErr;
}

export async function ensureActiveSubscription(
  userId: string
): Promise<{ subscription: SubscriptionRow | null; plan: PlanRow | null }> {
  // 1) Existing active subscription row (may need reconciliation if dates are stale)
  const existing = await fetchLatestActiveSubscription(userId);

  if (existing?.subscription_plans) {
    if (isCurrentWindow(existing)) {
      const { subscription_plans, ...subscription } = existing;
      return { subscription, plan: subscription_plans };
    }

    if (existing.subscription_plans.name === FREE_PLAN_NAME || !existing.paddle_subscription_id) {
      const refreshed = await refreshFreeSubscription(existing);
      return {
        subscription: refreshed,
        plan: existing.subscription_plans,
      };
    }

    try {
      const reconciled = await syncExpiredPaidSubscription(existing);
      if (reconciled.subscription && reconciled.plan) {
        return reconciled;
      }
    } catch (error) {
      console.error('[subscription] failed to reconcile subscription with Paddle', error);
      throw error;
    }
  }

  // 2) No current subscription -> provision Free
  const freePlan = await fetchFreePlan();
  if (!freePlan) {
    // Free plan not seeded; caller can handle missing plan gracefully
    return { subscription: null, plan: null };
  }

  return provisionFreeSubscription(userId, freePlan);
}
