"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function BootstrapForm({ defaultName, email }: { defaultName: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [workspaceExists, setWorkspaceExists] = useState<{ name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setWorkspaceExists(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") || ""),
      organizationName: String(formData.get("organizationName") || ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (response.ok && body.data?.hasInvite && body.data?.inviteToken) {
        router.push(`/setup?invite=${encodeURIComponent(body.data.inviteToken)}`);
        router.refresh();
        return;
      }
      if (!response.ok) {
        if (body.error?.message?.includes("already have a workspace")) {
          // User has profile; redirect to dashboard (avoids stuck-on-setup when session was stale)
          router.push("/");
          router.refresh();
          return;
        }
        if (body.workspaceExists && body.workspaceName) {
          setWorkspaceExists({ name: body.workspaceName });
          return;
        }
        setError(body.error?.message ?? "Failed to create workspace.");
        return;
      }

      setMessage("Workspace created. Redirecting...");
      router.push("/");
      router.refresh();
    });
  }

  if (workspaceExists) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">
            Workspace &quot;{workspaceExists.name}&quot; already exists.
          </p>
          <p className="mt-2 text-sm text-muted">
            Contact the admin of that workspace to request access. They can invite you from the{" "}
            <strong>Team</strong> page. Your access request has been recorded.
          </p>
        </div>
        <p className="text-sm text-muted">
          To create a <strong>new</strong> workspace, use a different name below and try again.
        </p>
        <button
          type="button"
          onClick={() => setWorkspaceExists(null)}
          className="rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-dim"
        >
          Try different workspace name
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Full name</span>
        <input
          name="fullName"
          defaultValue={defaultName}
          required
          className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Google account</span>
        <input
          value={email}
          readOnly
          className="w-full rounded-lg border border-line bg-surface-dim px-4 py-2.5 text-muted outline-none"
        />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Workspace name</span>
        <input
          name="organizationName"
          required
          placeholder="Enter new workspace or existing workspace name"
          className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
        <span className="text-xs text-muted">New name = create workspace (you become admin). Existing name = request access.</span>
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Continue"}
      </button>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
