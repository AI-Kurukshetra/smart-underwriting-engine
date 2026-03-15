"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { InviteRecord } from "@/lib/repositories/invites";

type Props = { initialInvites: InviteRecord[] };

export function InviteList({ initialInvites }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingInvites = initialInvites.filter((i) => !i.acceptedAt);

  function copyLink(token: string, id: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/setup?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (pendingInvites.length === 0) {
    return (
      <p className="text-sm text-muted">
        No pending invites. Create one above to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pendingInvites.map((invite) => {
        const link = typeof window !== "undefined" ? `${window.location.origin}/setup?invite=${invite.token}` : "";
        const isExpired = new Date(invite.expiresAt) < new Date();

        return (
          <div
            key={invite.id}
            className="flex flex-col gap-2 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{invite.email}</p>
              <p className="text-xs text-muted">
                Role: {invite.role} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                {isExpired && (
                  <Badge tone="danger" className="ml-2">
                    Expired
                  </Badge>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyLink(invite.token, invite.id)}
              disabled={isExpired}
              className="shrink-0 rounded-lg border border-line bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copiedId === invite.id ? "Copied!" : "Copy link"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
