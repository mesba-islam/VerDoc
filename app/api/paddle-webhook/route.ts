// app/api/paddle/webhook/route.ts
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const body = await req.json();

  console.log('Paddle Webhook Received:', body);

  const eventType = body.event_type;

  // Handle subscription created or activated
  if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
    const data = body.data;

    const { user_id, plan_id } = data.custom_data ?? {};
    const paddle_checkout_id = data.id; // subscription ID
    const starts_at = data.current_billing_period?.starts_at
      ? new Date(data.current_billing_period.starts_at)
      : new Date();

    const ends_at = data.current_billing_period?.ends_at
      ? new Date(data.current_billing_period.ends_at)
      : new Date(new Date(starts_at).setMonth(starts_at.getMonth() + 1));

    if (!user_id || !plan_id || !paddle_checkout_id) {
      console.error(' Missing required fields:', { user_id, plan_id, paddle_checkout_id });
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      [{
        user_id,
        plan_id,
        paddle_checkout_id,
        status: data.status ?? 'active',
        starts_at,
        ends_at,
      }],
      { onConflict: 'paddle_checkout_id' }
    );
  

    if (error) {
      console.error('❌ Supabase Insert Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
