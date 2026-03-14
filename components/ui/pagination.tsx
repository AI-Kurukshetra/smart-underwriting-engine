"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);
    return { paginatedItems, totalPages, safePage, start, end: start + paginatedItems.length };
  }, [items, page, pageSize]);
}

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          Showing <span className="font-medium text-foreground">{start}</span>
          {" - "}
          <span className="font-medium text-foreground">{end}</span>
          {" of "}
          <span className="font-medium text-foreground">{totalItems}</span>
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pageNumbers.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-medium transition",
                currentPage === p
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-surface-dim hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
