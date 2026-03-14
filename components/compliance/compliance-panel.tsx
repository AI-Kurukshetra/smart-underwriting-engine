"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flag, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, usePagination } from "@/components/ui/pagination";
import { persistSetting } from "@/lib/api-client";

type ComplianceCheck = {
  code: string;
  status: string;
  message: string;
};

type ComplianceRow = {
  applicationId: string;
  applicantName: string;
  checks: ComplianceCheck[];
};

type Props = {
  rows: ComplianceRow[];
  initialReviewedChecks?: string[];
  initialFlaggedApps?: string[];
};

export function CompliancePanel({ rows: initialRows, initialReviewedChecks = [], initialFlaggedApps = [] }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewedChecks, setReviewedChecks] = useState<Set<string>>(new Set(initialReviewedChecks));
  const [flaggedApps, setFlaggedApps] = useState<Set<string>>(new Set(initialFlaggedApps));
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<"all" | "flagged" | "reviewed" | "pending">("all");

  const filteredRows = rows.filter((row) => {
    const matchesSearch = !searchQuery.trim() || row.applicantName.toLowerCase().includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === "flagged") return flaggedApps.has(row.applicationId);
    if (filterStatus === "reviewed") return row.checks.every((c) => c.status === "pass" || reviewedChecks.has(`${row.applicationId}:${c.code}`));
    if (filterStatus === "pending") return !row.checks.every((c) => c.status === "pass" || reviewedChecks.has(`${row.applicationId}:${c.code}`));
    return true;
  });

  const { paginatedItems: pageItems } = usePagination(filteredRows, page, pageSize);

  function markCheckReviewed(appId: string, checkCode: string) {
    const key = `${appId}:${checkCode}`;
    setReviewedChecks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    persistSetting("compliance_reviews", "insert", {
      application_id: appId,
      check_code: checkCode,
      status: "reviewed",
    }).then(() => router.refresh()).catch(() => {});
  }

  function toggleFlag(appId: string) {
    const nowFlagged = !flaggedApps.has(appId);
    setFlaggedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
    persistSetting("compliance_reviews", "insert", {
      application_id: appId,
      check_code: "application_flag",
      status: nowFlagged ? "flagged" : "unflagged",
      flagged: nowFlagged,
    }).then(() => router.refresh()).catch(() => {});
  }

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
          {(["all", "pending", "reviewed", "flagged"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilterStatus(f); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterStatus === f ? "bg-accent-light text-accent" : "text-muted hover:bg-surface-dim hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted">{filteredRows.length} results</span>
        </div>
      </div>

      <div className="space-y-3">
      {pageItems.map((row) => {
        const isExpanded = expandedId === row.applicationId;
        const isFlagged = flaggedApps.has(row.applicationId);
        const allReviewed = row.checks.every(
          (c) => c.status === "pass" || reviewedChecks.has(`${row.applicationId}:${c.code}`),
        );

        return (
          <div key={row.applicationId} className={`rounded-xl border p-4 transition ${isFlagged ? "border-danger/30 bg-danger-light/30" : "border-line-subtle"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{row.applicantName}</p>
                  {isFlagged && <Badge tone="danger">Flagged</Badge>}
                  {allReviewed && !isFlagged && <Badge tone="success">All reviewed</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.checks.map((check) => {
                    const isReviewed = reviewedChecks.has(`${row.applicationId}:${check.code}`);
                    return (
                      <Badge key={check.code} tone={isReviewed ? "success" : check.status === "pass" ? "success" : "warning"}>
                        {isReviewed ? "✓ " : ""}{check.code}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFlag(row.applicationId)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${isFlagged ? "border-danger/30 text-danger hover:bg-danger-light" : "border-line text-muted hover:text-foreground"}`}
                >
                  <Flag className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : row.applicationId)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2">
                {row.checks.map((check) => {
                  const key = `${row.applicationId}:${check.code}`;
                  const isReviewed = reviewedChecks.has(key);
                  return (
                    <div key={check.code} className="flex items-center justify-between rounded-lg border border-line-subtle bg-surface p-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">{check.code.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{check.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={isReviewed ? "success" : check.status === "pass" ? "success" : "warning"}>
                          {isReviewed ? "Reviewed" : check.status}
                        </Badge>
                        {check.status === "review" && !isReviewed && (
                          <button
                            type="button"
                            onClick={() => markCheckReviewed(row.applicationId, check.code)}
                            className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/20"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark reviewed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {filteredRows.length > pageSize && (
        <PaginationControls
          currentPage={page}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          className="rounded-xl border border-line bg-surface p-4"
        />
      )}
    </div>
  );
}
