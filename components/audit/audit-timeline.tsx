"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  LayoutList,
  Scale,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, usePagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: string;
  applicationId: string;
  applicantName: string;
  eventType: string;
  details: string;
  actor: string;
  timestamp: string;
  metadata: Record<string, string>;
};

type Props = {
  entries: AuditEntry[];
};

const eventConfig: Record<string, { icon: typeof FileText; label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  application_created: { icon: FileText, label: "Application Created", tone: "info" },
  score_generated: { icon: Brain, label: "Score Generated", tone: "info" },
  decision_made: { icon: ShieldCheck, label: "Decision Made", tone: "success" },
  document_uploaded: { icon: Upload, label: "Document Uploaded", tone: "neutral" },
  manual_override: { icon: UserCheck, label: "Manual Override", tone: "warning" },
  compliance_check: { icon: Scale, label: "Compliance Check", tone: "success" },
};

const eventTypeOptions = [
  { value: "all", label: "All Events" },
  { value: "application_created", label: "Application Created" },
  { value: "score_generated", label: "Score Generated" },
  { value: "decision_made", label: "Decision Made" },
  { value: "document_uploaded", label: "Document Uploaded" },
  { value: "manual_override", label: "Manual Override" },
  { value: "compliance_check", label: "Compliance Check" },
];

type ViewMode = "timeline" | "table";

export function AuditTimeline({ entries }: Props) {
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesQuery = !query.trim() ||
        entry.applicantName.toLowerCase().includes(query.trim().toLowerCase()) ||
        entry.details.toLowerCase().includes(query.trim().toLowerCase()) ||
        entry.actor.toLowerCase().includes(query.trim().toLowerCase());
      const matchesEvent = eventFilter === "all" || entry.eventType === eventFilter;
      return matchesQuery && matchesEvent;
    });
  }, [entries, query, eventFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const entry of filtered) {
      const key = entry.applicantName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const { paginatedItems: pageGroups } = usePagination(grouped, page, pageSize);
  const { paginatedItems: pageRows } = usePagination(filtered, page, viewMode === "table" ? pageSize : filtered.length);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.eventType] = (counts[entry.eventType] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const uniqueActors = useMemo(() => new Set(entries.map((e) => e.actor)).size, [entries]);

  function toggleGroup(name: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function expandAll() {
    setExpandedGroups(new Set(grouped.map(([name]) => name)));
  }

  function collapseAll() {
    setExpandedGroups(new Set());
  }

  function exportCsv() {
    const headers = ["Timestamp", "Applicant", "Event Type", "Details", "Actor", "Risk Score", "Decision", "Model"];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.applicantName,
      eventConfig[e.eventType]?.label ?? e.eventType,
      `"${e.details.replace(/"/g, '""')}"`,
      e.actor,
      e.metadata.riskScore ?? "",
      e.metadata.decision ?? "",
      e.metadata.model ?? "",
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line-subtle p-4">
          <p className="text-xs font-medium text-muted">Total Events</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{entries.length}</p>
          <p className="mt-0.5 text-[11px] text-muted">Across all applications</p>
        </div>
        <div className="rounded-xl border border-line-subtle p-4">
          <p className="text-xs font-medium text-muted">Applications Tracked</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{new Set(entries.map((e) => e.applicantName)).size}</p>
          <p className="mt-0.5 text-[11px] text-muted">With complete audit chain</p>
        </div>
        <div className="rounded-xl border border-line-subtle p-4">
          <p className="text-xs font-medium text-muted">Unique Actors</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{uniqueActors}</p>
          <p className="mt-0.5 text-[11px] text-muted">System and human actors</p>
        </div>
        <div className="rounded-xl border border-line-subtle p-4">
          <p className="text-xs font-medium text-muted">Filtered Results</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</p>
          <p className="mt-0.5 text-[11px] text-muted">Matching current filters</p>
        </div>
      </div>

      {/* Event type breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(eventConfig).map(([type, config]) => {
          const count = eventCounts[type] ?? 0;
          const Icon = config.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setEventFilter(eventFilter === type ? "all" : type); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                eventFilter === type
                  ? "border-accent/30 bg-accent-light text-accent"
                  : "border-line bg-surface text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {config.label}
              <span className="font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="space-y-3 rounded-xl border border-line bg-surface-dim p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by applicant, detail, or actor..."
              className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "timeline" ? "bg-accent text-white" : "text-muted hover:text-foreground",
                )}
              >
                <Clock className="h-3 w-3" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "table" ? "bg-accent text-white" : "text-muted hover:text-foreground",
                )}
              >
                <LayoutList className="h-3 w-3" />
                Table
              </button>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>
        </div>

        {viewMode === "timeline" && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {grouped.length} applicant{grouped.length !== 1 ? "s" : ""} &middot; {filtered.length} events
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={expandAll} className="text-accent hover:underline">Expand all</button>
              <span className="text-line">|</span>
              <button type="button" onClick={collapseAll} className="text-accent hover:underline">Collapse all</button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="space-y-3">
          {pageGroups.map(([name, events]) => {
            const isExpanded = expandedGroups.has(name);
            const decisionEntry = events.find((e) => e.eventType === "decision_made");
            const decision = decisionEntry?.metadata.decision ?? "pending";
            const riskScore = events[0]?.metadata.riskScore ?? "--";

            return (
              <div key={name} className="rounded-xl border border-line bg-surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(name)}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-surface-dim"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-[11px] text-muted">{events.length} events &middot; Score: {riskScore}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={decision === "approve" ? "success" : decision === "review" ? "warning" : decision === "reject" ? "danger" : "neutral"}>
                      {decision}
                    </Badge>
                    <span className="text-[11px] text-muted">{events[0]?.timestamp}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-line px-4 pb-4 pt-2">
                    <div className="relative space-y-0 border-l-2 border-line-subtle pl-5">
                      {events.map((entry) => {
                        const config = eventConfig[entry.eventType] ?? eventConfig.application_created;
                        const Icon = config.icon;
                        return (
                          <div key={entry.id} className="relative pb-4 last:pb-0">
                            <div className="absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-surface-dim">
                              <Icon className="h-2.5 w-2.5 text-accent" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={config.tone}>{config.label}</Badge>
                              <span className="text-[11px] text-muted">{entry.timestamp}</span>
                              <span className="rounded bg-surface-dim px-1.5 py-0.5 text-[10px] font-mono text-muted">{entry.actor}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">{entry.details}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {Object.entries(entry.metadata).map(([k, v]) => (
                                <span key={k} className="rounded bg-surface-dim px-1.5 py-0.5 text-[10px] font-mono text-muted">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {pageGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-line p-8 text-center">
              <p className="text-sm font-medium text-foreground">No audit events match the current filters.</p>
              <p className="mt-1 text-xs text-muted">Adjust the search or event type filter.</p>
            </div>
          )}

          {grouped.length > pageSize && (
            <PaginationControls
              currentPage={page}
              totalItems={grouped.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              className="rounded-xl border border-line bg-surface p-4"
            />
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-dim text-left text-muted">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {pageRows.map((entry) => {
                  const config = eventConfig[entry.eventType] ?? eventConfig.application_created;
                  return (
                    <tr key={entry.id} className="text-foreground transition hover:bg-surface-dim">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-muted">{entry.timestamp}</td>
                      <td className="px-4 py-2.5 font-medium">{entry.applicantName}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={config.tone}>{config.label}</Badge>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-muted">{entry.details}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-surface-dim px-1.5 py-0.5 font-mono text-[10px] text-muted">{entry.actor}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{entry.metadata.riskScore ?? "--"}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={entry.metadata.decision === "approve" ? "success" : entry.metadata.decision === "review" ? "warning" : entry.metadata.decision === "reject" ? "danger" : "neutral"}>
                          {entry.metadata.decision ?? "—"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">No audit events match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
      )}
    </div>
  );
}
