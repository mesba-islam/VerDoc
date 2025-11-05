import { withSubscription } from '@/app/api/middleware/withSubscription';
import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { checkTranscriptionLimit } from '@/app/lib/transcriptionUtils';

export async function GET(req: NextRequest) {
  return withSubscription(req, async ({ userId, plan }) => {
    try {
      const supabase = await createSupabaseServer();
      const limits = await checkTranscriptionLimit(supabase, userId);

      return new Response(
        JSON.stringify({
          userId,
          plan,
          canTranscribe: limits.canTranscribe,
          remainingMinutes: limits.remainingMinutes,
          usage: {
            planLimit: limits.planLimit,
            usedMinutes: limits.usedMinutes,
            billingInterval: limits.billingInterval,
            periodStart: limits.periodStart,
            periodEnd: limits.periodEnd,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      console.error('[subscription-status] failed to resolve limits', error);
      return new Response(
        JSON.stringify({
          userId,
          plan,
          canTranscribe: plan.transcription_mins > 0,
          remainingMinutes: plan.transcription_mins,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
  });
}
