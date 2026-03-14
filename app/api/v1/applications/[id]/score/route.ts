import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getApplication } from "@/lib/repositories/applications";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const { id } = await params;
  const application = await getApplication(id, profile.tenantId);
  if (!application) {
    return NextResponse.json({ error: { code: "not_found", message: "Application not found." } }, { status: 404 });
  }

  const score = calculateRealtimeScore(application);
  const decision = evaluateDecision(application, score);

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    await supabase.from("risk_scores").insert({
      tenant_id: profile.tenantId,
      application_id: application.id,
      model_version: score.modelVersion,
      total_score: score.totalScore,
      summary: score.summary,
      reason_codes: score.reasonCodes,
      factor_breakdown: score.factors,
    });

    await supabase.from("audit_logs").insert({
      tenant_id: profile.tenantId,
      application_id: application.id,
      event_type: "realtime_score_computed",
      payload: {
        score,
        decision,
        sources: score.sources,
      },
    });
  }

  return NextResponse.json({ data: score, meta: { version: "v1" }, decision });
}
