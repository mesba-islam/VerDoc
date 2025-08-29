// import { NextResponse } from 'next/server';
// import { createSupabaseServer } from '@/lib/supabase/server';
// import { checkTranscriptionLimit } from '@/app/lib/transcriptionUtils';

// export async function GET() {
//   const supabase = await createSupabaseServer(); // <-- IMPORTANT
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

//   const data = await checkTranscriptionLimit(supabase, user.id); // pass client in
//   return NextResponse.json(data);
// }

// app/api/transcription/limits/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server"; // your server.ts helper
import { checkTranscriptionLimit } from "@/app/lib/transcriptionUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      console.error("limits auth error:", authErr);
      return NextResponse.json({ error: "auth_error" }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limits = await checkTranscriptionLimit(supabase, user.id);
    return NextResponse.json(limits, { status: 200 });
  } catch (e) {
    // Return useful info so the client can show something better than just "500"
    const msg = e instanceof Error ? e.message : String(e);
    console.error("limits route error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
