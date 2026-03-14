import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FactorPayload = {
  factor_key: string;
  name: string;
  category: string;
  weight: number;
  max_score: number;
  description: string;
  enabled: boolean;
};

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 },
    );
  }

  let body: { factors: FactorPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.factors) || body.factors.length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "factors array is required." } },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "db_unavailable", message: "Database is not configured." } },
      { status: 503 },
    );
  }

  const tenantId = profile.tenantId;
  const errors: string[] = [];
  const saved: string[] = [];

  for (const factor of body.factors) {
    try {
      const { data: existing } = await supabase
        .from("risk_factor_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("factor_key", factor.factor_key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("risk_factor_configs")
          .update({
            name: factor.name,
            category: factor.category,
            weight: factor.weight,
            max_score: factor.max_score,
            description: factor.description,
            enabled: factor.enabled,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("risk_factor_configs")
          .insert({
            tenant_id: tenantId,
            factor_key: factor.factor_key,
            name: factor.name,
            category: factor.category,
            weight: factor.weight,
            max_score: factor.max_score,
            description: factor.description,
            enabled: factor.enabled,
            updated_by: profile.id,
          });

        if (error) throw error;
      }

      saved.push(factor.factor_key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to save factor ${factor.factor_key}:`, msg);
      errors.push(`${factor.factor_key}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: { code: "partial_failure", message: `${errors.length} factor(s) failed to save.`, details: errors },
        data: { saved, failed: errors.length },
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    data: { saved, count: saved.length },
    meta: { version: "v1" },
  });
}
