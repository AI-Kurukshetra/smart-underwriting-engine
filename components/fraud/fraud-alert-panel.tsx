"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, Search, ShieldOff, ArrowUpRight, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, usePagination } from "@/components/ui/pagination";
import type { FraudAlert } from "@/lib/repositories/features";

const severityTone = {
  critical: "danger" as const,
  high: "warning" as const,
  medium: "info" as const,
  low: "neutral" as const,
};

const statusConfig = {
  open: { label: "Open", tone: "danger" as const, icon: AlertTriangle },
  investigating: { label: "Investigating", tone: "warning" as const, icon: Eye },
  resolved: { label: "Resolved", tone: "success" as const, icon: CheckCircle2 },
  dismissed: { label: "Dismissed", tone: "neutral" as const, icon: ShieldOff },
};

const alertTypeLabels: Record<string, string> = {
  identity_mismatch: "Identity Mismatch",
  income_anomaly: "Income Anomaly",
  document_forgery: "Document Forgery",
  velocity_check: "Velocity Check",
  network_link: "Network Link",
};

type Props = {
  initialAlerts: FraudAlert[];
};

export function FraudAlertPanel({ initialAlerts }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<"all" | "open" | "investigating" | "resolved" | "dismissed">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.status === filter);
  const { paginatedItems: pageItems } = usePagination(filtered, page, pageSize);

  function handleAction(alertId: string, action: "investigate" | "dismiss" | "resolve" | "escalate") {
    setActionPending(`${alertId}-${action}`);
    setFeedback(null);

    const alert = alerts.find((a) => a.id === alertId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/fraud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId,
            action,
            notes: notes[alertId] || undefined,
            applicationId: alert?.applicationId,
            alertType: alert?.alertType,
            severity: alert?.severity,
            description: alert?.description,
            confidence: alert?.confidence,
          }),
        });

        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Action failed");

        const statusMap: Record<string, FraudAlert["status"]> = {
          investigate: "investigating",
          dismiss: "dismissed",
          resolve: "resolved",
          escalate: "investigating",
        };

        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: statusMap[action] ?? a.status } : a)),
        );

        setNotes((prev) => ({ ...prev, [alertId]: "" }));
        setExpandedId(null);
        setFeedback(`Alert ${action === "investigate" ? "moved to investigation" : action === "dismiss" ? "dismissed" : action === "resolve" ? "resolved" : "escalated"}.`);

        router.refresh();
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "Action failed");
      } finally {
        setActionPending(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "open", "investigating", "resolved", "dismissed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? "bg-accent-light text-accent" : "text-muted hover:bg-surface-dim hover:text-foreground"}`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span className="ml-1 font-mono">({alerts.filter((a) => a.status === f).length})</span>}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" />
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        {pageItems.length > 0 ? pageItems.map((alert) => {
          const config = statusConfig[alert.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedId === alert.id;

          return (
            <div key={alert.id} className="rounded-xl border border-line p-4 transition hover:border-accent/20 hover:shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{alert.applicantName}</p>
                    <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge>
                    <Badge tone={config.tone}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                    <Badge tone="neutral">{alertTypeLabels[alert.alertType] ?? alert.alertType}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{alert.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                    <span>Detected: {alert.detectedAt}</span>
                    <span className="text-line">|</span>
                    <span>Confidence: {alert.confidence.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim">
                    <span className="text-xs font-bold text-foreground">{alert.confidence.toFixed(0)}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                  >
                    {isExpanded ? "Close" : "Actions"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 rounded-xl border border-accent/20 bg-accent-light/30 p-4">
                  <textarea
                    value={notes[alert.id] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                    placeholder="Investigation notes (optional)..."
                    rows={2}
                    className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
                  />
                  <div className="flex flex-wrap gap-2">
                    {alert.status === "open" && (
                      <>
                        <button type="button" onClick={() => handleAction(alert.id, "investigate")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-60">
                          <Search className="h-3 w-3" />
                          {actionPending === `${alert.id}-investigate` ? "..." : "Investigate"}
                        </button>
                        <button type="button" onClick={() => handleAction(alert.id, "escalate")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
                          <ArrowUpRight className="h-3 w-3" />
                          {actionPending === `${alert.id}-escalate` ? "..." : "Escalate"}
                        </button>
                        <button type="button" onClick={() => handleAction(alert.id, "dismiss")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60">
                          <XCircle className="h-3 w-3" />
                          {actionPending === `${alert.id}-dismiss` ? "..." : "Dismiss"}
                        </button>
                      </>
                    )}
                    {alert.status === "investigating" && (
                      <>
                        <button type="button" onClick={() => handleAction(alert.id, "resolve")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
                          <CheckCircle2 className="h-3 w-3" />
                          {actionPending === `${alert.id}-resolve` ? "..." : "Mark resolved"}
                        </button>
                        <button type="button" onClick={() => handleAction(alert.id, "dismiss")} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60">
                          <XCircle className="h-3 w-3" />
                          {actionPending === `${alert.id}-dismiss` ? "..." : "Dismiss"}
                        </button>
                      </>
                    )}
                    {(alert.status === "resolved" || alert.status === "dismissed") && (
                      <p className="text-xs text-muted">This alert has been {alert.status}. No further actions available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            No alerts match the current filter.
          </div>
        )}
      </div>

      {filtered.length > pageSize && (
        <PaginationControls
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          className="rounded-xl border border-line bg-surface p-4"
        />
      )}
    </div>
  );
}
