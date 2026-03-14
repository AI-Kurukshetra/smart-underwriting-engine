"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ArrowUpRight, XCircle, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, usePagination } from "@/components/ui/pagination";
import { persistSetting } from "@/lib/api-client";

type WorkflowAlert = {
  applicationId: string;
  applicantName: string;
  flags: string[];
};

type Props = {
  alerts: WorkflowAlert[];
  initialResolvedFlags?: Record<string, string[]>;
  initialEscalatedApps?: string[];
  initialDismissedApps?: string[];
};

function buildResolvedMap(input: Record<string, string[]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [appId, flags] of Object.entries(input)) {
    map.set(appId, new Set(flags));
  }
  return map;
}

export function WorkflowPanel({ alerts: initialAlerts, initialResolvedFlags = {}, initialEscalatedApps = [], initialDismissedApps = [] }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [resolvedFlags, setResolvedFlags] = useState<Map<string, Set<string>>>(buildResolvedMap(initialResolvedFlags));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [escalatedApps, setEscalatedApps] = useState<Set<string>>(new Set(initialEscalatedApps));
  const [dismissedApps, setDismissedApps] = useState<Set<string>>(new Set(initialDismissedApps));

  function resolveFlag(appId: string, flag: string) {
    setResolvedFlags((prev) => {
      const next = new Map(prev);
      const existing = next.get(appId) ?? new Set();
      existing.add(flag);
      next.set(appId, existing);
      return next;
    });
    persistSetting("workflow_actions", "insert", {
      application_id: appId,
      action_type: "resolve_flag",
      flag,
    }).then(() => router.refresh()).catch(() => {});
  }

  function escalateApp(appId: string) {
    setEscalatedApps((prev) => new Set(prev).add(appId));
    persistSetting("workflow_actions", "insert", {
      application_id: appId,
      action_type: "escalate",
    }).then(() => router.refresh()).catch(() => {});
  }

  function dismissApp(appId: string) {
    setDismissedApps((prev) => new Set(prev).add(appId));
    persistSetting("workflow_actions", "insert", {
      application_id: appId,
      action_type: "dismiss_all_flags",
    }).then(() => router.refresh()).catch(() => {});
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<"all" | "escalated" | "resolved" | "active">("all");

  const activeAlerts = alerts.filter((a) => !dismissedApps.has(a.applicationId));

  const filteredAlerts = activeAlerts.filter((alert) => {
    const matchesSearch = !searchQuery.trim() || alert.applicantName.toLowerCase().includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;
    const isEscalated = escalatedApps.has(alert.applicationId);
    const resolved = resolvedFlags.get(alert.applicationId) ?? new Set();
    const allResolved = alert.flags.every((f) => resolved.has(f));
    if (filterStatus === "escalated") return isEscalated;
    if (filterStatus === "resolved") return allResolved;
    if (filterStatus === "active") return !isEscalated && !allResolved;
    return true;
  });

  const { paginatedItems: pageItems } = usePagination(filteredAlerts, page, pageSize);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-line bg-surface-dim p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search by applicant name..."
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "active", "escalated", "resolved"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilterStatus(f); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterStatus === f ? "bg-accent-light text-accent" : "text-muted hover:bg-surface-dim hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted">{filteredAlerts.length} cases</span>
        </div>
      </div>

      {pageItems.length > 0 ? (
        <div className="space-y-3">
          {pageItems.map((alert) => {
            const isExpanded = expandedId === alert.applicationId;
            const isEscalated = escalatedApps.has(alert.applicationId);
            const resolved = resolvedFlags.get(alert.applicationId) ?? new Set();
            const allResolved = alert.flags.every((f) => resolved.has(f));

            return (
              <div key={alert.applicationId} className={`rounded-xl border p-4 transition ${isEscalated ? "border-danger/30 bg-danger-light/30" : allResolved ? "border-success/30 bg-success-light/30" : "border-line-subtle"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <p className="text-sm font-medium text-foreground">{alert.applicantName}</p>
                      {isEscalated && <Badge tone="danger">Escalated</Badge>}
                      {allResolved && <Badge tone="success">All resolved</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alert.flags.map((flag) => (
                        <Badge key={flag} tone={resolved.has(flag) ? "success" : "warning"}>
                          {resolved.has(flag) ? "✓ " : ""}{flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : alert.applicationId)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                  >
                    {isExpanded ? "Close" : "Manage"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {alert.flags.map((flag) => (
                        <div key={flag} className="flex items-center justify-between rounded-lg border border-line-subtle bg-surface p-3">
                          <span className="text-xs text-foreground">{flag}</span>
                          {resolved.has(flag) ? (
                            <Badge tone="success">Resolved</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => resolveFlag(alert.applicationId, flag)}
                              className="inline-flex items-center gap-1 rounded-md bg-success-light px-2 py-1 text-[11px] font-medium text-success transition hover:opacity-80"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Resolve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-line-subtle pt-3">
                      {!isEscalated && (
                        <button
                          type="button"
                          onClick={() => escalateApp(alert.applicationId)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          Escalate case
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissApp(alert.applicationId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                      >
                        <XCircle className="h-3 w-3" />
                        Dismiss all flags
                      </button>
                      <a
                        href={`/applications/${alert.applicationId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-light"
                      >
                        <Eye className="h-3 w-3" />
                        View application
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No flagged cases match the current filter.
        </div>
      )}

      {filteredAlerts.length > pageSize && (
        <PaginationControls
          currentPage={page}
          totalItems={filteredAlerts.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          className="rounded-xl border border-line bg-surface p-4"
        />
      )}
    </div>
  );
}
