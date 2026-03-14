import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "underwriter" | "analyst" | "reviewer";

export type AppProfile = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  tenantId: string;
  tenantName: string;
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

  return {
    id: profileResult.data.id,
    email: profileResult.data.email,
    fullName: profileResult.data.full_name || user.user_metadata.full_name || user.email || "Unknown user",
    role: (profileResult.data.role as AppRole) || "underwriter",
    tenantId: profileResult.data.tenant_id,
    tenantName: await getTenantName(profileResult.data.tenant_id),
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
