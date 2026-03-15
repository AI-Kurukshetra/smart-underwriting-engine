"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  tenantName: string;
  role: string;
};

export function JoinOrgForm({ token, tenantName, role }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Failed to join organization.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
        <p className="text-sm font-medium text-foreground">
          You&apos;ve been invited to join <strong>{tenantName}</strong> as <strong>{role}</strong>.
        </p>
        <p className="mt-1 text-xs text-muted">Click below to accept and get started.</p>
      </div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={isPending}
        className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Joining..." : "Accept invite & join organization"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
