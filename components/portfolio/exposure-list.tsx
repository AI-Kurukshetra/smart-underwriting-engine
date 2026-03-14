"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PaginationControls, usePagination } from "@/components/ui/pagination";

type ExposureItem = {
  id: string;
  applicantName: string;
  requestedAmount: number;
  riskScore: number;
  decision: string;
};

type Props = {
  applications: ExposureItem[];
};

function getDecisionTone(decision: string) {
  if (decision === "approve") return "success" as const;
  if (decision === "review") return "warning" as const;
  if (decision === "reject") return "danger" as const;
  return "neutral" as const;
}

export function ExposureList({ applications }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const maxAmount = Math.max(...applications.map((a) => a.requestedAmount), 1);

  const filtered = applications.filter((app) =>
    !query.trim() || app.applicantName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const { paginatedItems: pageItems } = usePagination(filtered, page, pageSize);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search applicant..."
          className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </div>

      <div className="space-y-3">
        {pageItems.map((application) => {
          const pct = Math.min(100, Math.round((application.requestedAmount / maxAmount) * 100));
          return (
            <div key={application.id} className="rounded-xl border border-line-subtle p-4 transition hover:border-accent/20">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <a href={`/applications/${application.id}`} className="font-medium text-foreground hover:text-accent">
                    {application.applicantName}
                  </a>
                  <Badge tone={getDecisionTone(application.decision)}>
                    {application.decision}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-muted">Score: {application.riskScore}</span>
                  <span className="font-mono text-sm font-medium text-foreground">${formatCurrency(application.requestedAmount)}</span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-dim">
                <div className="metric-bar h-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
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
