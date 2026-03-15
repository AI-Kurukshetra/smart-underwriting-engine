"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { TeamMember } from "@/lib/repositories/team-members";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "underwriter", label: "Underwriter" },
  { value: "analyst", label: "Analyst" },
  { value: "reviewer", label: "Reviewer" },
] as const;

type Props = {
  initialMembers: TeamMember[];
  currentUserId: string;
};

export function TeamMembersList({ initialMembers, currentUserId }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: string) {
    setError(null);
    setEditingId(memberId);

    const response = await fetch(`/api/v1/team-members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    const body = await response.json();
    setEditingId(null);

    if (!response.ok) {
      setError(body.error?.message ?? "Failed to update role.");
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole as TeamMember["role"] } : m))
    );
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    setError(null);
    setRemovingId(memberId);

    const response = await fetch(`/api/v1/team-members/${memberId}`, {
      method: "DELETE",
    });

    const body = await response.json();
    setRemovingId(null);

    if (!response.ok) {
      setError(body.error?.message ?? "Failed to remove member.");
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    router.refresh();
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted">No team members yet. Invite someone to get started.</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-dim">
              <th className="px-4 py-3 text-left font-medium text-foreground">Member</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Role</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.id === currentUserId;
              const isEditing = editingId === member.id;
              const isRemoving = removingId === member.id;

              return (
                <tr key={member.id} className="border-b border-line-subtle last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {member.fullName || member.email}
                        {isCurrentUser && (
                          <Badge tone="neutral" className="ml-2">
                            You
                          </Badge>
                        )}
                      </p>
                      {member.fullName && member.email !== member.fullName ? (
                        <p className="text-xs text-muted">{member.email}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={isEditing}
                      className="rounded border border-line bg-background px-2 py-1.5 text-foreground outline-none focus:border-accent disabled:opacity-60"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      disabled={isCurrentUser || isRemoving}
                      className="rounded px-2 py-1 text-sm font-medium text-muted transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
