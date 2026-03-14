import { createClient } from "@supabase/supabase-js";
import { getRequiredServiceRoleKey, getRequiredSupabaseUrl, hasSupabaseAdminEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  return createClient(getRequiredSupabaseUrl(), getRequiredServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
