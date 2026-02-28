import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureActiveSubscription } from "@/app/lib/subscriptionHelpers";

function assertIsSupabaseClient(x: unknown): asserts x is SupabaseClient {
  const ok = !!x && typeof (x as SupabaseClient).auth?.getUser === "function";
  if (!ok) throw new Error("checkExportLimit: first arg must be a SupabaseClient");
}

export type ExportLimitResult = {
  canExport: boolean;
  message: string;
  remainingExports: number | null; // null => unlimited
  planLimit: number | null;
  usedExports: number;
  billingInterval: string | null;
  periodStart?: string;
  periodEnd?: string;
};

const toNumber = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

export async function checkExportLimit(supabase: SupabaseClient, userId: string): Promise<ExportLimitResult> {
  assertIsSupabaseClient(supabase);

  const { subscription: sub, plan } = await ensureActiveSubscription(userId);

  if (!sub || !plan) {
    return {
      canExport: false,
      message: "Subscribe to export documents",
      remainingExports: 0,
      planLimit: 0,
      usedExports: 0,
      billingInterval: null,
    };
  }

  const planLimit = toNumber(plan.doc_export_limit);

  // Unlimited exports
  if (planLimit === null) {
    return {
      canExport: true,
      message: "Unlimited document exports",
      remainingExports: null,
      planLimit: null,
      usedExports: 0,
      billingInterval: plan.billing_interval,
      periodStart: sub.starts_at,
      periodEnd: sub.ends_at ?? undefined,
    };
  }

  const toEnd = sub.ends_at ?? new Date().toISOString();

  const { data: usage, error: usageErr } = await supabase
    .from("export_usage")
    .select("quantity, created_at")
    .eq("user_id", userId)
    .gte("created_at", sub.starts_at)
    .lt("created_at", toEnd);

  if (usageErr) throw usageErr;

  const usedExports = (usage ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 1), 0);
  const remaining = Math.max(0, planLimit - usedExports);

  return {
    canExport: remaining > 0,
    message: remaining > 0
      ? `You have ${remaining} document exports remaining`
      : `You've reached your ${planLimit} export limit for this period`,
    remainingExports: remaining,
    planLimit,
    usedExports,
    billingInterval: plan.billing_interval,
    periodStart: sub.starts_at,
    periodEnd: sub.ends_at ?? undefined,
  };
}

export async function recordExportUsage(
  supabase: SupabaseClient,
  userId: string,
  count = 1,
  summaryId?: string | null
) {
  assertIsSupabaseClient(supabase);
  if (count <= 0) throw new Error("count must be > 0");

  const limitCheck = await checkExportLimit(supabase, userId);
  if (!limitCheck.canExport) {
    return {
      success: false,
      error: limitCheck.message,
      updatedLimits: limitCheck,
    };
  }

  if (limitCheck.planLimit !== null && limitCheck.remainingExports !== null && limitCheck.remainingExports < count) {
    return {
      success: false,
      error: `You only have ${limitCheck.remainingExports} exports remaining`,
      updatedLimits: limitCheck,
    };
  }

  const rows = Array.from({ length: 1 }).map(() => ({
    user_id: userId,
    summary_id: summaryId ?? null,
    quantity: count,
  }));

  const { error: insertErr } = await supabase
    .from("export_usage")
    .insert(rows);

  if (insertErr) throw insertErr;

  const updatedLimits = await checkExportLimit(supabase, userId);
  return { success: true, updatedLimits };
}
