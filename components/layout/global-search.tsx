"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Brain,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FileSpreadsheet,
  FlaskConical,
  MapPin,
  PlugZap,
  Radar,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  TestTubeDiagonal,
  User,
  Workflow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavResult = { type: "page"; href: string; label: string; section: string; icon: typeof Search };
type AppResult = { type: "application"; id: string; name: string; product: string; decision: string };
type SearchResult = NavResult | AppResult;

const allPages: NavResult[] = [
  { type: "page", href: "/", label: "Dashboard", section: "Overview", icon: ChartNoAxesCombined },
  { type: "page", href: "/analytics", label: "Analytics", section: "Overview", icon: BarChart3 },
  { type: "page", href: "/applications", label: "Applications", section: "Underwriting", icon: BriefcaseBusiness },
  { type: "page", href: "/workflows", label: "Workflows", section: "Underwriting", icon: Workflow },
  { type: "page", href: "/claims", label: "Fraud Detection", section: "Underwriting", icon: ShieldAlert },
  { type: "page", href: "/risk-factors", label: "Risk Factors", section: "Underwriting", icon: Sliders },
  { type: "page", href: "/portfolio", label: "Portfolio", section: "Intelligence", icon: Activity },
  { type: "page", href: "/models", label: "Model Registry", section: "Intelligence", icon: TestTubeDiagonal },
  { type: "page", href: "/geospatial", label: "Geospatial", section: "Intelligence", icon: MapPin },
  { type: "page", href: "/stress-testing", label: "Stress Testing", section: "Intelligence", icon: FlaskConical },
  { type: "page", href: "/explainability", label: "Explainability", section: "Governance", icon: Brain },
  { type: "page", href: "/compliance", label: "Compliance", section: "Governance", icon: Shield },
  { type: "page", href: "/audit", label: "Audit Trail", section: "Governance", icon: Scale },
  { type: "page", href: "/monitoring", label: "Monitoring", section: "Governance", icon: Radar },
  { type: "page", href: "/reports", label: "Reports", section: "System", icon: FileSpreadsheet },
  { type: "page", href: "/integrations", label: "Integrations", section: "System", icon: PlugZap },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [applications, setApplications] = useState<AppResult[]>([]);
  const [loadedApps, setLoadedApps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadApplications = useCallback(async () => {
    if (loadedApps) return;
    try {
      const res = await fetch("/api/v1/applications");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setApplications(
          json.data.map((a: { id: string; applicantName: string; product: string; decision: string }) => ({
            type: "application" as const,
            id: a.id,
            name: a.applicantName,
            product: a.product,
            decision: a.decision,
          })),
        );
      }
      setLoadedApps(true);
    } catch {
      setLoadedApps(true);
    }
  }, [loadedApps]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPages;

    const pageMatches = allPages.filter(
      (p) => p.label.toLowerCase().includes(q) || p.section.toLowerCase().includes(q),
    );

    const appMatches = applications.filter(
      (a) => a.name.toLowerCase().includes(q) || a.product.toLowerCase().includes(q),
    );

    return [...pageMatches, ...appMatches].slice(0, 15);
  }, [query, applications]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      loadApplications();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open, loadApplications]);

  function navigate(result: SearchResult) {
    if (result.type === "page") {
      router.push(result.href);
    } else {
      router.push(`/applications/${result.id}`);
    }
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      scrollToActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      scrollToActive(activeIndex - 1);
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  function scrollToActive(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-muted transition hover:bg-surface-dim hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:inline sm:text-xs">Search</span>
        <kbd className="hidden rounded border border-line bg-surface-dim px-1.5 py-0.5 font-mono text-[10px] text-muted md:inline">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, applications..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="custom-scroll max-h-80 overflow-y-auto py-2">
            {results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {results.map((result, i) => {
              if (result.type === "page") {
                const Icon = result.icon;
                return (
                  <button
                    key={result.href}
                    type="button"
                    onClick={() => navigate(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                      i === activeIndex ? "bg-accent-light" : "hover:bg-surface-dim",
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      i === activeIndex ? "bg-accent text-white" : "bg-surface-dim text-muted",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", i === activeIndex ? "text-accent" : "text-foreground")}>{result.label}</p>
                      <p className="text-[11px] text-muted">{result.section}</p>
                    </div>
                    {i === activeIndex && <span className="text-[10px] text-muted">Enter ↵</span>}
                  </button>
                );
              }

              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                    i === activeIndex ? "bg-accent-light" : "hover:bg-surface-dim",
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    i === activeIndex ? "bg-accent text-white" : "bg-surface-dim text-muted",
                  )}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", i === activeIndex ? "text-accent" : "text-foreground")}>{result.name}</p>
                    <p className="text-[11px] text-muted">{result.product} &middot; {result.decision}</p>
                  </div>
                  {i === activeIndex && <span className="text-[10px] text-muted">Enter ↵</span>}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-4 py-2">
            <div className="hidden items-center gap-3 text-[10px] text-muted sm:flex">
              <span><kbd className="rounded border border-line bg-surface-dim px-1 font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="rounded border border-line bg-surface-dim px-1 font-mono">↵</kbd> Open</span>
              <span><kbd className="rounded border border-line bg-surface-dim px-1 font-mono">Esc</kbd> Close</span>
            </div>
            <span className="text-[10px] text-muted">{results.length} results</span>
          </div>
        </div>
      </div>
    </>
  );
}
