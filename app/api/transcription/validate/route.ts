import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { validateTranscriptionRequest } from '@/app/lib/transcriptionUtils';

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { minutes } = await req.json();
  const result = await validateTranscriptionRequest(supabase, user.id, minutes);
  return NextResponse.json(result);
}
