import type { SupabaseClient } from "@supabase/supabase-js";

function assertIsSupabaseClient(x: unknown): asserts x is SupabaseClient {
  const ok = !!x && typeof (x as SupabaseClient).auth?.getUser === "function";
  if (!ok) throw new Error("checkTranscriptionLimit: first arg must be a SupabaseClient");
}

type LimitResult = {
  canTranscribe: boolean;
  message: string;
  remainingMinutes: number;
  planLimit: number;
  usedMinutes: number;
  billingInterval: string | null;
  periodStart?: string;
  periodEnd?: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
};

type PlanRow = {
  id: string;
  transcription_mins: number | string;
  billing_interval: string | null;
};

export async function checkTranscriptionLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<LimitResult> {
  assertIsSupabaseClient(supabase);
  const nowISO = new Date().toISOString();

  // 1) Get active/trialing subscription whose window includes now
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id,user_id,plan_id,status,starts_at,ends_at")
    .eq("user_id", userId)
    .in("status", ["active"])          // include trials if used
    .lte("starts_at", nowISO)
    .or(`ends_at.is.null,ends_at.gte.${nowISO}`)   // ends_at NULL or >= now
    .order("starts_at", { ascending: false })
    .maybeSingle<SubscriptionRow>();

  if (subErr) throw subErr;

  if (!sub) {
    return {
      canTranscribe: false,
      message: "Subscribe to transcribe",
      remainingMinutes: 0,
      planLimit: 0,
      usedMinutes: 0,
      billingInterval: null,
    };
  }

  // 2) Fetch plan separately (avoid join headaches)
  const { data: plan, error: planErr } = await supabase
    .from("subscription_plans")
    .select("id,transcription_mins,billing_interval")
    .eq("id", sub.plan_id)
    .maybeSingle<PlanRow>();

  if (planErr) throw planErr;

  if (!plan) {
    return {
      canTranscribe: false,
      message: "Your subscription is missing a plan. Please contact support.",
      remainingMinutes: 0,
      planLimit: 0,
      usedMinutes: 0,
      billingInterval: null,
      periodStart: sub.starts_at,
      periodEnd: sub.ends_at ?? undefined,
    };
  }

  const planLimit = Number(plan.transcription_mins || 0);
  if (!planLimit) {
    return {
      canTranscribe: false,
      message: "Your current plan does not include transcription minutes. Please upgrade your plan.",
      remainingMinutes: 0,
      planLimit: 0,
      usedMinutes: 0,
      billingInterval: plan.billing_interval,
      periodStart: sub.starts_at,
      periodEnd: sub.ends_at ?? undefined,
    };
  }

  // 3) Sum usage inside the subscription window
  type UsageRow = { duration_minutes: number | string };
  const toEnd = sub.ends_at ?? nowISO; // if ends_at is NULL, cap at now
  const { data: usage, error: usageErr } = await supabase
    .from("transcription_usage")
    .select("duration_minutes")
    .eq("user_id", userId)
    .gte("created_at", sub.starts_at)
    .lt("created_at", toEnd);

  if (usageErr) throw usageErr;

  const usedMinutes = ((usage ?? []) as UsageRow[]).reduce(
    (sum, u) => sum + Number(u.duration_minutes ?? 0),
    0
  );

  const remainingMinutes = Math.max(0, planLimit - usedMinutes);

  return {
    canTranscribe: remainingMinutes > 0,
    message:
      remainingMinutes > 0
        ? `You have ${remainingMinutes.toFixed(1)} minutes remaining`
        : `You've reached your limit of ${planLimit} minutes for this period`,
    remainingMinutes,
    planLimit,
    usedMinutes,
    billingInterval: plan.billing_interval,
    periodStart: sub.starts_at,
    periodEnd: sub.ends_at ?? undefined,
  };
}


export async function validateTranscriptionRequest(
  supabase: SupabaseClient,
  userId: string,
  audioDurationMinutes: number
) {
  assertIsSupabaseClient(supabase);
  const limitCheck = await checkTranscriptionLimit(supabase, userId);
  if (!limitCheck.canTranscribe) {
    return {
      canProceed: false,
      error: limitCheck.message,
      suggestion: limitCheck.planLimit === 0
        ? 'Please subscribe to a plan with transcription minutes.'
        : 'Please upgrade your plan or wait for your next billing cycle.',
    };
  }

  if (audioDurationMinutes > limitCheck.remainingMinutes) {
    return {
      canProceed: false,
      error: `Audio duration (${audioDurationMinutes.toFixed(1)} min) exceeds your remaining minutes (${limitCheck.remainingMinutes.toFixed(1)} min)`,
      suggestion: `Try uploading a shorter audio file (max ${limitCheck.remainingMinutes.toFixed(1)} minutes) or upgrade your plan.`,
    };
  }

  const usagePercentage = (audioDurationMinutes / limitCheck.remainingMinutes) * 100;
  const warning = usagePercentage > 80 ? `This will use ${usagePercentage.toFixed(0)}% of your remaining minutes.` : null;

  return { canProceed: true, warning, remainingAfterUse: limitCheck.remainingMinutes - audioDurationMinutes };
}

export async function recordTranscriptionUsage(
  supabase: SupabaseClient,
  userId: string,
  durationMinutes: number
) {
  assertIsSupabaseClient(supabase);
  const now = new Date();
  const { data: usageRecord, error: insertError } = await supabase
    .from('transcription_usage')
    .insert({ user_id: userId, duration_minutes: durationMinutes, created_at: now.toISOString() })
    .select()
    .single();

  if (insertError) throw insertError;

  const updatedLimits = await checkTranscriptionLimit(supabase, userId);
  return { success: true, usageRecord, updatedLimits };
}

export function parseAudioDuration(durationString: string): number {
  const [m = '0', s = '0'] = durationString.split(':');
  return (parseInt(m) || 0) + (parseInt(s) || 0) / 60;
}
