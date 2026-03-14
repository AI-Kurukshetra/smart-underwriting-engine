"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, ArrowUpRight, Filter, FileText, LayoutGrid, LayoutList, RotateCcw, Search, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, usePagination } from "@/components/ui/pagination";
import { UnderwritingApplication } from "@/lib/domain";
import { cn, formatCurrency } from "@/lib/utils";

type Props = {
  applications: UnderwritingApplication[];
  mode: "supabase" | "mock";
};

const statusOptions = [
  { value: "all", label: "All cases" },
  { value: "submitted", label: "Submitted" },
  { value: "manual_review", label: "Manual review" },
  { value: "approved", label: "Approved" },
] as const;

const sortOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "risk", label: "Risk score" },
  { value: "amount", label: "Requested amount" },
] as const;

function getDecisionTone(decision: UnderwritingApplication["decision"]) {
  if (decision === "approve") return "success" as const;
  if (decision === "review") return "warning" as const;
  if (decision === "reject") return "danger" as const;
  return "neutral" as const;
}

function getStatusTone(status: UnderwritingApplication["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "manual_review") return "warning" as const;
  return "info" as const;
}

type ViewMode = "cards" | "table";

export function ApplicationQueue({ applications, mode }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("submitted");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const visibleApplications = useMemo(() => {
    const filtered = applications.filter((application) => {
      const matchesQuery = [application.applicantName, application.product, application.decision, ...application.flags]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase());

      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      const matchesFlags = !flaggedOnly || application.flags.length > 0;
      return matchesQuery && matchesStatus && matchesFlags;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "risk") return a.riskScore - b.riskScore;
      if (sortBy === "amount") return a.requestedAmount - b.requestedAmount;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [applications, query, statusFilter, flaggedOnly, sortBy, sortDirection]);

  const { paginatedItems: pageItems, totalPages } = usePagination(visibleApplications, page, pageSize);

  const resetPage = () => setPage(1);

  const metrics = useMemo(() => {
    const manualReview = applications.filter((application) => application.status === "manual_review").length;
    const straightThrough = applications.filter((application) => application.decision === "approve").length;
    const documents = applications.reduce((sum, application) => sum + application.documents.length, 0);

    return [
      { label: "Visible", value: visibleApplications.length.toString(), note: "Current queue slice" },
      { label: "Manual review", value: manualReview.toString(), note: "Needs analyst action" },
      { label: "Auto rate", value: `${Math.round((straightThrough / Math.max(applications.length, 1)) * 100)}%`, note: "Approval share" },
      { label: "Documents", value: documents.toString(), note: "Evidence attached" },
    ];
  }, [applications, visibleApplications.length]);

  const hasFilters = query.trim() || statusFilter !== "all" || flaggedOnly || sortBy !== "submitted" || sortDirection !== "desc";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-line-subtle p-4">
            <p className="text-xs font-medium text-muted">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-surface-dim p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder="Search applicant, product, or reason code"
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { setStatusFilter(option.value); resetPage(); }}
              className={cn(
                "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                statusFilter === option.value
                  ? "border-accent/30 bg-accent-light text-accent"
                  : "border-line bg-surface text-muted hover:text-foreground",
              )}
            >
              <Filter className="mr-1.5 h-3 w-3" />
              {option.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => { setFlaggedOnly((value) => !value); resetPage(); }}
            className={cn(
              "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              flaggedOnly
                ? "border-warning/30 bg-warning-light text-warning"
                : "border-line bg-surface text-muted hover:text-foreground",
            )}
          >
            <AlertTriangle className="mr-1.5 h-3 w-3" />
            Flagged only
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => { setViewMode("table"); setPage(1); }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "table" ? "bg-accent text-white" : "text-muted hover:text-foreground",
                )}
                title="Compact table"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("cards"); setPage(1); }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "cards" ? "bg-accent text-white" : "text-muted hover:text-foreground",
                )}
                title="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as (typeof sortOptions)[number]["value"])}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-accent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortDirection === "asc" ? "Asc" : "Desc"}
            </button>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setSortBy("submitted");
                  setSortDirection("desc");
                  setFlaggedOnly(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{visibleApplications.length} results (page {page} of {totalPages})</span>
          <Badge tone={mode === "supabase" ? "success" : "warning"}>
            {mode === "supabase" ? "Live data" : "Preview mode"}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {pageItems.length ? (
          viewMode === "table" ? (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-line-subtle bg-surface-dim text-left text-xs font-medium text-muted">
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Applicant</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium hidden md:table-cell">Product</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Amount</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Score</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Status</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Decision</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium hidden sm:table-cell">Docs</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium hidden lg:table-cell">Flags</th>
                      <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {pageItems.map((application) => (
                      <tr key={application.id} className="group text-foreground transition hover:bg-surface-dim">
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <span className="font-medium">{application.applicantName}</span>
                          <span className="ml-1 text-muted md:hidden">· {application.product}</span>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted hidden md:table-cell">{application.product}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono whitespace-nowrap">${formatCurrency(application.requestedAmount)}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono font-medium">{application.riskScore}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <Badge tone={getStatusTone(application.status)}>{application.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <Badge tone={getDecisionTone(application.decision)}>{application.decision}</Badge>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted hidden sm:table-cell">{application.documents.length}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 hidden lg:table-cell">
                          {application.flags.length ? (
                            <span className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              {application.flags.length}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                          <Link
                            href={`/applications/${application.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1.5 text-xs font-medium text-accent transition hover:bg-accent hover:text-white"
                          >
                            Open
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            pageItems.map((application) => {
              const debtToIncome = Math.round((application.monthlyDebt / Math.max(application.annualIncome / 12, 1)) * 100);
              const documentCoverage = Math.min(100, application.documents.length * 25);

              return (
                <article
                  key={application.id}
                  className="group rounded-xl border border-line bg-surface p-4 transition hover:border-accent/30 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">{application.applicantName}</h2>
                        <Badge tone={getStatusTone(application.status)}>{application.status.replace("_", " ")}</Badge>
                        <Badge tone={getDecisionTone(application.decision)}>{application.decision}</Badge>
                        <Badge tone="neutral">{application.product}</Badge>
                      </div>

                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                        <div className="rounded-lg border border-line-subtle bg-surface-dim px-3 py-1.5">
                          <p className="text-[10px] font-medium text-muted">Requested</p>
                          <p className="font-mono text-sm font-semibold text-foreground">${formatCurrency(application.requestedAmount)}</p>
                        </div>
                        <div className="rounded-lg border border-line-subtle bg-surface-dim px-3 py-1.5">
                          <p className="text-[10px] font-medium text-muted">Risk score</p>
                          <p className="font-mono text-sm font-semibold text-foreground">{application.riskScore}</p>
                        </div>
                        <div className="rounded-lg border border-line-subtle bg-surface-dim px-3 py-1.5">
                          <p className="text-[10px] font-medium text-muted">Debt ratio</p>
                          <p className="text-sm font-semibold text-foreground">{debtToIncome}%</p>
                        </div>
                        <div className="rounded-lg border border-line-subtle bg-surface-dim px-3 py-1.5">
                          <p className="text-[10px] font-medium text-muted">Submitted</p>
                          <p className="text-sm font-semibold text-foreground">{application.submittedAt}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-line-subtle px-3 py-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">Evidence</span>
                            <span className="font-mono text-muted">{application.documents.length} docs</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-dim">
                            <div className="metric-bar h-full" style={{ width: `${documentCoverage}%` }} />
                          </div>
                        </div>
                        <div className="rounded-lg border border-line-subtle px-3 py-2">
                          <p className="text-xs text-muted">
                            {application.flags.length
                              ? `${application.flags.length} flag${application.flags.length > 1 ? "s" : ""}`
                              : "No policy flags"}
                          </p>
                        </div>
                      </div>

                      {application.flags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {application.flags.map((flag) => (
                            <Badge key={flag} tone="warning">{flag}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 xl:items-end">
                      <Link
                        href={`/applications/${application.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
                      >
                        Open workbench
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )
        ) : (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="font-medium text-foreground">No applications match the current filters.</p>
            <p className="mt-1 text-sm text-muted">Adjust the search or status filter to see results.</p>
          </div>
        )}
      </div>

      {visibleApplications.length > pageSize && (
        <PaginationControls
          currentPage={page}
          totalItems={visibleApplications.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          pageSizeOptions={viewMode === "table" ? [10, 25, 50, 100] : [10, 25, 50]}
          className="rounded-xl border border-line bg-surface p-4"
        />
      )}
    </div>
  );
}
