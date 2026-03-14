import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { generateDecisionExplanation } from "@/lib/ai/explanations";
import { getApplication } from "@/lib/repositories/applications";

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

  const explanation = await generateDecisionExplanation(application);
  return NextResponse.json({ data: explanation, meta: { version: "v1" } });
}
