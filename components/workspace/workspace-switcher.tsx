"use client";

import { Building2 } from "lucide-react";
import type { Workspace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type Props = {
  workspaces: Workspace[];
  currentTenantId: string;
};

export function WorkspaceSwitcher({ workspaces, currentTenantId }: Props) {
  if (workspaces.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-dim px-3 py-2">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span className="truncate text-xs font-medium text-foreground">
          {workspaces[0]?.tenantName ?? "Workspace"}
        </span>
      </div>
    );
  }

  function handleSwitch(tenantId: string) {
    if (tenantId === currentTenantId) return;
    document.cookie = `aegis-tenant-id=${tenantId}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="space-y-1">
      {workspaces.map((ws) => {
        const active = ws.tenantId === currentTenantId;
        return (
          <button
            key={ws.tenantId}
            type="button"
            onClick={() => handleSwitch(ws.tenantId)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:bg-surface-dim hover:text-foreground",
            )}
            title={ws.tenantName}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{ws.tenantName}</span>
            <span className="shrink-0 text-[10px] uppercase text-muted">{ws.role}</span>
          </button>
        );
      })}
    </div>
  );
}
