import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  getPendingAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/repositories/workspace-requests";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can view access requests." } }, { status: 403 });
  }

  const requests = await getPendingAccessRequests(profile.tenantId);
  return NextResponse.json({ data: requests });
}

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  requestId: z.string().uuid(),
  role: z.enum(["admin", "underwriter", "analyst", "reviewer"]).optional(),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can process access requests." } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid payload." } }, { status: 400 });
  }

  if (parsed.data.action === "approve") {
    const result = await approveAccessRequest(
      parsed.data.requestId,
      profile.tenantId,
      profile.id,
      parsed.data.role ?? "underwriter"
    );
    if ("error" in result) {
      return NextResponse.json({ error: { message: result.error } }, { status: 400 });
    }
    return NextResponse.json({ data: { inviteLink: result.inviteLink } });
  }

  const result = await rejectAccessRequest(parsed.data.requestId, profile.tenantId, profile.id);
  if ("error" in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }
  return NextResponse.json({ data: { success: true } });
}
