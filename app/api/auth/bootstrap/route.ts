import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPendingInviteForUser } from "@/lib/repositories/invites";

const schema = z.object({
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  if (!admin || !supabase) {
    return NextResponse.json({ error: { message: "Supabase credentials are not configured." } }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Sign in with Google before initializing the workspace." } }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid setup payload." } }, { status: 400 });
  }

  const existingProfile = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existingProfile.data) {
    return NextResponse.json({ error: { message: "You already have a workspace. Sign out and use a different account to create a new one." } }, { status: 409 });
  }

  const baseSlug = slugify(parsed.data.organizationName) || "aegis-org";
  const existingTenantBySlug = await admin.from("tenants").select("id, name").eq("slug", baseSlug).maybeSingle();

  if (existingTenantBySlug.data) {
    const tenantId = existingTenantBySlug.data.id;
    const tenantName = existingTenantBySlug.data.name ?? parsed.data.organizationName;
    const userEmail = (user.email || "").toLowerCase().trim();

    const pendingInvite = await getPendingInviteForUser(tenantId, userEmail);
    if (pendingInvite) {
      return NextResponse.json({
        data: {
          hasInvite: true,
          inviteToken: pendingInvite.token,
          workspaceName: tenantName,
        },
      });
    }

    const existingRequest = await admin.from("workspace_access_requests").select("id").eq("tenant_id", tenantId).eq("email", userEmail).eq("status", "pending").maybeSingle();

    if (!existingRequest.error && !existingRequest.data) {
      await admin.from("workspace_access_requests").insert({
        tenant_id: tenantId,
        email: userEmail,
        full_name: parsed.data.fullName,
        status: "pending",
      });
    }

    return NextResponse.json(
      { error: { message: "Workspace already exists.", workspaceExists: true, workspaceName: tenantName } },
      { status: 409 }
    );
  }

  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingTenant = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!existingTenant.data) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    attempts++;
  }

  const tenantResult = await admin
    .from("tenants")
    .insert({ name: parsed.data.organizationName.trim(), slug })
    .select("id")
    .single();

  if (tenantResult.error) {
    return NextResponse.json({ error: { message: tenantResult.error.message } }, { status: 500 });
  }

  const tenantId = tenantResult.data.id;

  const profileInsert = await admin.from("profiles").insert({
    id: user.id,
    tenant_id: tenantId,
    email: user.email || "",
    full_name: parsed.data.fullName,
    role: "admin",
  });

  if (profileInsert.error) {
    return NextResponse.json({ error: { message: profileInsert.error.message } }, { status: 500 });
  }

  await admin.from("workspace_members").insert({
    user_id: user.id,
    tenant_id: tenantId,
    role: "admin",
  });

  return NextResponse.json({ data: { initialized: true } }, { status: 201 });
}
