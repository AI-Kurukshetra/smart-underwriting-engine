import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { updateMemberRole, removeMember } from "@/lib/repositories/team-members";

const updateSchema = z.object({
  role: z.enum(["admin", "underwriter", "analyst", "reviewer"]),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can update team members." } }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid role" } }, { status: 400 });
  }

  const result = await updateMemberRole(id, profile.tenantId, parsed.data.role);
  if ("error" in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }
  return NextResponse.json({ data: { success: true } });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can remove team members." } }, { status: 403 });
  }

  const { id } = await params;

  if (id === profile.id) {
    return NextResponse.json(
      { error: { message: "You cannot remove yourself. Ask another admin to remove you." } },
      { status: 400 }
    );
  }

  const result = await removeMember(id, profile.tenantId);
  if ("error" in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }
  return NextResponse.json({ data: { success: true } });
}
