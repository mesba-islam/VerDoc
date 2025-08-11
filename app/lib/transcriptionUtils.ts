import type { SupabaseClient } from '@supabase/supabase-js';

function assertIsSupabaseClient(x: any): asserts x is SupabaseClient {
  if (!x || typeof x.auth?.getUser !== 'function') {
    throw new Error('checkTranscriptionLimit: first arg must be a SupabaseClient');
  }
}

export async function checkTranscriptionLimit(supabase: SupabaseClient, userId: string) {
  assertIsSupabaseClient(supabase);
  console.log('Checking transcription limits for user:', userId);

  const now = new Date();
  const formatDateForPG = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nowISO = formatDateForPG(now);

  const { data: { user } } = await supabase.auth.getUser();
  console.log('session uid:', user?.id); // should now be defined

  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select(`*, subscription_plans!inner(*)`)
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('starts_at', nowISO)
    .or(`ends_at.is.null,ends_at.gte.${nowISO}`)
    .order('starts_at', { ascending: false })
    .limit(1);

  if (subError) throw subError;

  const subscription = subscriptions?.[0] || null;
  const plan = subscription?.subscription_plans;

  if (!subscription || !plan) {
    return {
      canTranscribe: false,
      message: 'No active subscription found. Please subscribe to transcribe audio.',
      remainingMinutes: 0, planLimit: 0, usedMinutes: 0, billingInterval: null
    };
  }

  if (plan.transcription_mins === 0) {
    return {
      canTranscribe: false,
      message: 'Your current plan does not include transcription minutes. Please upgrade your plan.',
      remainingMinutes: 0, planLimit: 0, usedMinutes: 0, billingInterval: plan.billing_interval
    };
  }

  const periodStart = plan.billing_interval === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), 0, 1);
  const periodStartISO = formatDateForPG(periodStart);

  const { data: usage, error: usageError } = await supabase
    .from('transcription_usage')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('created_at', periodStartISO)
    .lte('created_at', nowISO);

  if (usageError) throw usageError;

  const usedMinutes = usage?.reduce((s, r) => s + r.duration_minutes, 0) || 0;
  const remainingMinutes = Math.max(0, plan.transcription_mins - usedMinutes);

  return {
    canTranscribe: remainingMinutes > 0,
    message: remainingMinutes > 0
      ? `You have ${remainingMinutes.toFixed(1)} minutes remaining`
      : `You've reached your ${plan.billing_interval}ly limit of ${plan.transcription_mins} minutes`,
    remainingMinutes,
    planLimit: plan.transcription_mins,
    usedMinutes,
    billingInterval: plan.billing_interval
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
