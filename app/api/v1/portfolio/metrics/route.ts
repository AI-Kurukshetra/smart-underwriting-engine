import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPortfolioSummary } from "@/lib/repositories/applications";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const summary = await getPortfolioSummary(profile.tenantId);
  return NextResponse.json({ data: summary, meta: { version: "v1" } });
}
