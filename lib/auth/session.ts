import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "underwriter" | "analyst" | "reviewer";

export type Workspace = { tenantId: string; tenantName: string; role: AppRole };

export type AppProfile = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  tenantId: string;
  tenantName: string;
  workspaces: Workspace[];
};

async function getTenantName(tenantId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return "Unknown tenant";

  const tenant = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  if (tenant.error || !tenant.data) return "Unknown tenant";
  return tenant.data.name;
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profileResult = await admin
    .from("profiles")
    .select("id, tenant_id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const profile = profileResult.data;

  const { data: memberships } = await admin
    .from("workspace_members")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  const tenantIds = new Set<string>([profile.tenant_id, ...(memberships ?? []).map((m) => m.tenant_id)]);

  let tenantId = profile.tenant_id;
  let role = (profile.role as AppRole) || "underwriter";

  const cookieStore = await cookies();
  const preferred = cookieStore.get("aegis-tenant-id")?.value;
  if (preferred && tenantIds.has(preferred)) {
    tenantId = preferred;
    const mem = memberships?.find((m) => m.tenant_id === preferred);
    if (mem) role = mem.role as AppRole;
  }

  const workspaces: Workspace[] = [];
  const seen = new Set<string>();

  if (profile.tenant_id && !seen.has(profile.tenant_id)) {
    seen.add(profile.tenant_id);
    workspaces.push({
      tenantId: profile.tenant_id,
      tenantName: await getTenantName(profile.tenant_id),
      role: (profile.role as AppRole) || "underwriter",
    });
  }
  for (const m of memberships ?? []) {
    if (!seen.has(m.tenant_id)) {
      seen.add(m.tenant_id);
      workspaces.push({
        tenantId: m.tenant_id,
        tenantName: await getTenantName(m.tenant_id),
        role: m.role as AppRole,
      });
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || user.user_metadata?.full_name || user.email || "Unknown user",
    role,
    tenantId,
    tenantName: await getTenantName(tenantId),
    workspaces,
  } satisfies AppProfile;
}

export async function requireProfile(roles?: AppRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (roles && !roles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}

export async function hasAnyProfiles() {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;

  const result = await admin.from("profiles").select("id", { head: true, count: "exact" });
  return (result.count ?? 0) > 0;
}
