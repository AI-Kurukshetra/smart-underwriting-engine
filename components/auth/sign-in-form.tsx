"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm({ canBootstrap, nextPath: nextPathProp }: { canBootstrap: boolean; nextPath?: string }) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleGoogleSignIn() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Public authentication settings are missing. Restart the app after updating .env.local and verify the public Supabase URL and key are set.");
      return;
    }

    const nextPath = nextPathProp ?? searchParams?.get("next") ?? "/";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Redirecting to Google..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {canBootstrap ? (
        <p className="text-sm text-muted">
          No platform admin yet. Sign in with Google first, then complete{" "}
          <Link href="/setup" className="font-medium text-accent hover:text-accent-strong">
            workspace setup
          </Link>.
        </p>
      ) : null}
    </div>
  );
}
