"use client";

import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  nextPath: string;
  children?: React.ReactNode;
  className?: string;
};

export function SignOutAndRedirect({ nextPath, children, className }: Props) {
  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // Full page navigation ensures a clean state for signing in with a different account
    const target = `/login?next=${encodeURIComponent(nextPath)}`;
    window.location.href = target;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className ?? "inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"}
    >
      <LogOut className="h-4 w-4" />
      {children ?? "Sign out and use correct account"}
    </button>
  );
}
