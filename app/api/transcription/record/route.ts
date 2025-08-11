import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { recordTranscriptionUsage } from '@/app/lib/transcriptionUtils';

export async function POST(request: Request) {
  const supabase = await createSupabaseServer(); // <-- IMPORTANT
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { minutes } = await request.json();
  const res = await recordTranscriptionUsage(supabase, user.id, minutes);
  return NextResponse.json(res);
}
