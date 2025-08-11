import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { checkTranscriptionLimit } from '@/app/lib/transcriptionUtils';

export async function GET() {
  const supabase = await createSupabaseServer(); // <-- IMPORTANT
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const data = await checkTranscriptionLimit(supabase, user.id); // pass client in
  return NextResponse.json(data);
}
