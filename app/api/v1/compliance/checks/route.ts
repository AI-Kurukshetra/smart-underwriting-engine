import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { runComplianceChecks } from "@/lib/compliance/checks";
import { listApplications } from "@/lib/repositories/applications";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const { data: applications, mode } = await listApplications(profile.tenantId);
  return NextResponse.json({
    data: applications.map((application) => ({ applicationId: application.id, applicantName: application.applicantName, checks: runComplianceChecks(application) })),
    meta: { mode, version: "v1" },
  });
}
