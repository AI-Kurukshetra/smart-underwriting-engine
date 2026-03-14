"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getRequiredSupabasePublicKey, getRequiredSupabaseUrl, hasPublicSupabaseEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasPublicSupabaseEnv()) {
    return null;
  }

  return createBrowserClient(getRequiredSupabaseUrl(), getRequiredSupabasePublicKey());
}
