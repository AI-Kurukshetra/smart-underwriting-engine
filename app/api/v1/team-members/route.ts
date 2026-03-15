import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/repositories/team-members";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can view team members." } }, { status: 403 });
  }

  const members = await listTeamMembers(profile.tenantId);
  return NextResponse.json({ data: members });
}
