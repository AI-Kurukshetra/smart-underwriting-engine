"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceAccessRequest } from "@/lib/repositories/workspace-requests";

const ROLES = [
  { value: "underwriter", label: "Underwriter" },
  { value: "analyst", label: "Analyst" },
  { value: "reviewer", label: "Reviewer" },
  { value: "admin", label: "Admin" },
] as const;

type Props = { initialRequests: WorkspaceAccessRequest[] };

export function AccessRequestsPanel({ initialRequests }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ email: string; link: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(requestId: string, role: string) {
    setError(null);
    setInviteLink(null);
    setApprovingId(requestId);

    const response = await fetch("/api/v1/workspace-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", requestId, role }),
    });

    const body = await response.json();
    setApprovingId(null);

    if (!response.ok) {
      setError(body.error?.message ?? "Failed to approve.");
      return;
    }

    setInviteLink({ email: requests.find((r) => r.id === requestId)?.email ?? "", link: body.data.inviteLink });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    router.refresh();
  }

  async function handleReject(requestId: string) {
    setError(null);
    setRejectingId(requestId);

    const response = await fetch("/api/v1/workspace-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", requestId }),
    });

    setRejectingId(null);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message ?? "Failed to reject.");
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">
        No pending access requests. Users who try to create a workspace that already exists will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {inviteLink ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">Invite created for {inviteLink.email}</p>
          <p className="mt-2 text-xs text-muted">Share this link — it expires in 7 days:</p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={inviteLink.link}
              className="flex-1 rounded-lg border border-line bg-surface-dim px-3 py-2 text-xs text-foreground"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(inviteLink.link)}
              className="rounded-lg border border-line bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-dim"
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setInviteLink(null)}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{req.email}</p>
              <p className="text-xs text-muted">
                {req.fullName ?? "—"} · Requested {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                id={`role-${req.id}`}
                className="rounded border border-line bg-background px-2 py-1.5 text-sm text-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const select = document.getElementById(`role-${req.id}`) as HTMLSelectElement;
                  handleApprove(req.id, select?.value ?? "underwriter");
                }}
                disabled={approvingId === req.id}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
              >
                {approvingId === req.id ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleReject(req.id)}
                disabled={rejectingId === req.id}
                className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-dim hover:text-danger"
              >
                {rejectingId === req.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
