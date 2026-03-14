export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
}

export function hasPublicSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function hasSupabaseAdminEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getRequiredSupabaseUrl() {
  const value = getSupabaseUrl();

  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

export function getRequiredSupabasePublicKey() {
  const value = getSupabasePublicKey();

  if (!value) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return value;
}

export function getRequiredServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
}
