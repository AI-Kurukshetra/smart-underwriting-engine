import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createInvite, listInvites } from "@/lib/repositories/invites";
import { sendInviteEmail } from "@/lib/email";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "underwriter", "analyst", "reviewer"]),
});

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can list invites." } }, { status: 403 });
  }

  const invites = await listInvites(profile.tenantId);
  return NextResponse.json({ data: invites });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: { message: "Only admins can create invites." } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid payload. Provide email and role." } }, { status: 400 });
  }

  const result = await createInvite(
    profile.tenantId,
    parsed.data.email,
    parsed.data.role,
    profile.id
  );

  if ("error" in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/setup?invite=${result.token}`;

  const admin = createSupabaseAdminClient();
  const tenant = admin ? await admin.from("tenants").select("name").eq("id", profile.tenantId).maybeSingle() : null;
  const workspaceName = tenant?.data?.name ?? "your workspace";

  const emailResult = await sendInviteEmail({
    to: parsed.data.email,
    inviteLink,
    workspaceName,
    role: parsed.data.role,
    expiresInDays: 7,
  });

  return NextResponse.json(
    {
      data: {
        token: result.token,
        inviteLink,
        email: parsed.data.email,
        role: parsed.data.role,
        expiresAt: result.expiresAt,
        emailSent: emailResult.sent,
      },
    },
    { status: 201 }
  );
}
