import { NextResponse } from "next/server";
import { getInviteByToken } from "@/lib/repositories/invites";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: { message: "Token required" } }, { status: 400 });
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: { message: "Invalid or expired invite." } }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      tenantName: invite.tenantName,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  });
}
