import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createInvite } from "./invites";
import { sendInviteEmail } from "@/lib/email";

export type WorkspaceAccessRequest = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  status: string;
  createdAt: string;
};

export async function getPendingAccessRequests(tenantId: string): Promise<WorkspaceAccessRequest[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("workspace_access_requests")
    .select("id, tenant_id, email, full_name, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function approveAccessRequest(
  requestId: string,
  tenantId: string,
  adminUserId: string,
  role: "underwriter" | "analyst" | "reviewer" | "admin" = "underwriter"
): Promise<{ inviteLink: string } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const { data: request, error: fetchError } = await admin
    .from("workspace_access_requests")
    .select("id, email, full_name")
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError || !request) return { error: "Request not found or already processed." };

  const inviteResult = await createInvite(tenantId, request.email, role, adminUserId);
  if ("error" in inviteResult) return { error: inviteResult.error };

  await admin
    .from("workspace_access_requests")
    .update({
      status: "approved",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/setup?invite=${inviteResult.token}`;

  const tenant = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const workspaceName = tenant.data?.name ?? "your workspace";

  await sendInviteEmail({
    to: request.email,
    inviteLink,
    workspaceName,
    role,
    expiresInDays: 7,
  });

  return { inviteLink };
}

export async function rejectAccessRequest(
  requestId: string,
  tenantId: string,
  adminUserId: string
): Promise<{ success: boolean } | { error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Database not configured" };

  const { error } = await admin
    .from("workspace_access_requests")
    .update({
      status: "rejected",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { success: true };
}
