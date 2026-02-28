import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { recordExportUsage } from "@/app/lib/exportUtils";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const count = typeof body?.count === "number" && body.count > 0 ? body.count : 1;
    const summaryId = typeof body?.summaryId === "string" ? body.summaryId : undefined;

    const result = await recordExportUsage(supabase, user.id, count, summaryId);

    if (!result.success) {
      return NextResponse.json({ error: result.error, updatedLimits: result.updatedLimits }, { status: 429 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record export";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

