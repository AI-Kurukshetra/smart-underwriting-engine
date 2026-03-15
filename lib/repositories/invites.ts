import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AppRole = "admin" | "underwriter" | "analyst" | "reviewer";

export type InviteRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: AppRole;
  token: string;
  invitedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

function randomToken(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 16)}`;
}

export async function createInvite(
  tenantId: string,
  email: string,
  role: AppRole,
  invitedBy: string
): Promise<{ token: string; expiresAt: Date } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const normalizedEmail = email.toLowerCase().trim();

  // Block only if already in THIS workspace
  const profile = await admin.from("profiles").select("id, tenant_id").eq("email", normalizedEmail).maybeSingle();
  if (profile.data) {
    if (profile.data.tenant_id === tenantId) return { error: "This user is already in your team." };
    const { data: wm } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", profile.data.id)
      .maybeSingle();
    if (wm) return { error: "This user is already in your team." };
  }

  // Allow invite (including users already in other workspaces)

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const token = randomToken();

  const { error } = await admin.from("tenant_invites").insert({
    tenant_id: tenantId,
    email: normalizedEmail,
    role,
    token,
    invited_by: invitedBy,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { error: error.message };
  return { token, expiresAt };
}

export async function getPendingInviteForUser(
  tenantId: string,
  userEmail: string
): Promise<{ token: string; tenantName: string; role: AppRole } | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const normalizedEmail = userEmail.toLowerCase().trim();
  const { data, error } = await admin
    .from("tenant_invites")
    .select("token, role")
    .eq("tenant_id", tenantId)
    .eq("email", normalizedEmail)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  const tenant = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  return {
    token: row.token,
    tenantName: tenant.data?.name ?? "Unknown",
    role: row.role as AppRole,
  };
}

export async function getInviteByToken(token: string): Promise<{
  tenantId: string;
  tenantName: string;
  email: string;
  role: AppRole;
  expiresAt: string;
} | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("tenant_invites")
    .select("tenant_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || data.accepted_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const tenant = await admin.from("tenants").select("name").eq("id", data.tenant_id).maybeSingle();
  const tenantName = tenant.data?.name ?? "Unknown";

  return {
    tenantId: data.tenant_id,
    tenantName,
    email: data.email,
    role: data.role as AppRole,
    expiresAt: data.expires_at,
  };
}

export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
  userFullName: string
): Promise<{ success: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const invite = await getInviteByToken(token);
  if (!invite) return { error: "Invalid or expired invite." };

  const normalizedEmail = userEmail.toLowerCase().trim();
  if (normalizedEmail !== invite.email) {
    return { error: `This invite was sent to ${invite.email}. Sign in with that account to accept.` };
  }

  const existingProfile = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (existingProfile.data) {
    // User already has a profile (in another workspace) – add to this workspace
    const { error: wmError } = await admin.from("workspace_members").insert({
      user_id: userId,
      tenant_id: invite.tenantId,
      role: invite.role,
    });
    if (wmError) {
      if (wmError.code === "23505") return { error: "You are already a member of this workspace." };
      return { error: wmError.message };
    }
  } else {
    // New user – create profile and add to workspace_members
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      tenant_id: invite.tenantId,
      email: normalizedEmail,
      full_name: userFullName || userEmail,
      role: invite.role,
    });
    if (profileError) return { error: profileError.message };

    await admin.from("workspace_members").insert({
      user_id: userId,
      tenant_id: invite.tenantId,
      role: invite.role,
    });
  }

  await admin
    .from("tenant_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  return { success: true };
}

export async function listInvites(tenantId: string): Promise<InviteRecord[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: invites, error } = await admin
    .from("tenant_invites")
    .select("id, tenant_id, email, role, token, invited_by, expires_at, accepted_at, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !invites) return [];

  const tenant = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const tenantName = tenant.data?.name ?? "Unknown";

  return invites.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    tenantName,
    email: row.email,
    role: row.role as AppRole,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  }));
}
