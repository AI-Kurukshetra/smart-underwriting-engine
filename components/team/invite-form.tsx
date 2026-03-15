"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "underwriter", label: "Underwriter" },
  { value: "analyst", label: "Analyst" },
  { value: "reviewer", label: "Reviewer" },
  { value: "admin", label: "Admin" },
] as const;

export function InviteForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setInviteEmail(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const role = String(formData.get("role") || "underwriter");

    if (!email) {
      setError("Email is required.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/v1/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Failed to create invite.");
        return;
      }

      setInviteLink(body.data.inviteLink);
      setInviteEmail(body.data.email);
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="colleague@company.com"
            className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Role</span>
          <select
            name="role"
            className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create invite"}
        </button>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {inviteLink && inviteEmail ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">Invite created for {inviteEmail}</p>
          <p className="mt-2 text-xs text-muted">Share this link — it expires in 7 days:</p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 rounded-lg border border-line bg-surface-dim px-3 py-2 text-xs text-foreground"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
              }}
              className="rounded-lg border border-line bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-dim"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
