// app/api/middleware/withSubscription.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureActiveSubscription } from '@/app/lib/subscriptionHelpers';

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
      doc_export_limit?: number | null;
      premium_templates?: boolean | null;
      archive_access?: boolean | null;
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

  const { subscription, plan } = await ensureActiveSubscription(user.id);

  if (!subscription || !plan) {
    console.error('No active subscription');
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
  }

  return callback({
    userId: user.id,
    plan: {
      name: plan.name,
      upload_limit_mb: plan.upload_limit_mb,
      transcription_mins: plan.transcription_mins,
      summarization_limit: plan.summarization_limit,
      billing_interval: plan.billing_interval,
      doc_export_limit: plan.doc_export_limit,
      premium_templates: plan.premium_templates,
      archive_access: plan.archive_access,
    },
  });
}
