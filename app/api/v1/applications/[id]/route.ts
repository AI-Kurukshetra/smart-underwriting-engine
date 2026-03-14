import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getApplication } from "@/lib/repositories/applications";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
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

  return NextResponse.json({ data: { ...application, scoring: score, workflow: decision }, meta: { version: "v1" } });
}
