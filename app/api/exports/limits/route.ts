import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { checkExportLimit } from "@/app/lib/exportUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limits = await checkExportLimit(supabase, user.id);
    return NextResponse.json(limits, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load export limits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

