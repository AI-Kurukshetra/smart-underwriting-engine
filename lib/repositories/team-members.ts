import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "./invites";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  createdAt: string;
};

export async function listTeamMembers(tenantId: string): Promise<TeamMember[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: members, error } = await admin
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error || !members) return [];

  const result: TeamMember[] = [];
  for (const row of members) {
    const profile = await admin.from("profiles").select("email, full_name").eq("id", row.user_id).maybeSingle();
    result.push({
      id: row.user_id,
      email: profile.data?.email ?? "",
      fullName: profile.data?.full_name,
      role: row.role as AppRole,
      createdAt: row.created_at,
    });
  }
  return result;
}

export async function updateMemberRole(
  memberId: string,
  tenantId: string,
  newRole: AppRole
): Promise<{ success: boolean } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const validRoles: AppRole[] = ["admin", "underwriter", "analyst", "reviewer"];
  if (!validRoles.includes(newRole)) return { error: "Invalid role" };

  const { error } = await admin
    .from("workspace_members")
    .update({ role: newRole })
    .eq("user_id", memberId)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("tenant_id", tenantId);

  return { success: true };
}

export async function removeMember(
  memberId: string,
  tenantId: string
): Promise<{ success: boolean } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const { error } = await admin.from("workspace_members").delete().eq("user_id", memberId).eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  const profile = await admin.from("profiles").select("tenant_id").eq("id", memberId).maybeSingle();
  if (profile.data?.tenant_id === tenantId) {
    const { data: other } = await admin.from("workspace_members").select("tenant_id").eq("user_id", memberId).limit(1);
    if (other?.length) {
      await admin.from("profiles").update({ tenant_id: other[0].tenant_id }).eq("id", memberId);
    } else {
      await admin.from("profiles").delete().eq("id", memberId);
    }
  }

  return { success: true };
}
