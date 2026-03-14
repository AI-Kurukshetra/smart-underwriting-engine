import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getRequiredSupabasePublicKey, getRequiredSupabaseUrl, hasPublicSupabaseEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasPublicSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(getRequiredSupabaseUrl(), getRequiredSupabasePublicKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
