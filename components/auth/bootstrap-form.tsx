"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function BootstrapForm({ defaultName, email }: { defaultName: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

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
      if (!response.ok) {
        setError(body.error?.message ?? "Failed to initialize workspace.");
        return;
      }

      setMessage("Workspace initialized. Redirecting to the control plane.");
      router.push("/");
      router.refresh();
    });
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
        <span className="font-medium text-foreground">Organization</span>
        <input
          name="organizationName"
          required
          className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Initializing..." : "Initialize workspace"}
      </button>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
