// app/api/middleware/withSubscription.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function withSubscription(
  req: Request,
  callback: (context: {
    userId: string;
    plan: {
      name: string;
      upload_limit_mb: number;
      transcription_mins: number;
      summarization_limit: number | null;
      billing_interval: string | null;
    };
  }) => Promise<Response>
) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    // .select('*, subscription_plans(*)')
    .select(`
      *,
      subscription_plans!plan_id(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString())
    .single();
    // console.log('DEBUG: subscription:', subscription);

    

  if (subscriptionError || !subscription || !subscription.subscription_plans) {
    console.error('No active subscription:', subscriptionError);
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
  }

  const plan = subscription.subscription_plans;

  return callback({
    userId: user.id,
    plan: {
      name: plan.name,
      upload_limit_mb: plan.upload_limit_mb,
      transcription_mins: plan.transcription_mins,
      summarization_limit: plan.summarization_limit,
      billing_interval: plan.billing_interval,
    },
  });
}
