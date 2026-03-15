"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  nextPath: string;
  children?: React.ReactNode;
};

export function SignOutAndRedirect({ nextPath, children }: Props) {
  const router = useRouter();

  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
    >
      <LogOut className="h-4 w-4" />
      {children ?? "Sign out and use correct account"}
    </button>
  );
}
