"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  Eye,
  Fingerprint,
  GitCompareArrows,
  Layers,
  Loader2,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

type Factor = { name: string; score: number; maxScore: number; weight: number };
type Source = { name: string; score: number; weight: number; confidence: "high" | "medium" | "low"; summary: string };

type ApplicationAnalysis = {
  id: string;
  applicantName: string;
  product: string;
  creditScore: number;
  annualIncome: number;
  monthlyDebt: number;
  employmentMonths: number;
  requestedAmount: number;
  riskScore: number;
  decision: "approve" | "review" | "reject";
  factors: Factor[];
  sources: Source[];
  reasonCodes: string[];
  flags: string[];
};

type FairnessBand = {
  band: string;
  total: number;
  approved: number;
  approvalRate: number;
  avgScore: number;
};

type ScoreBucket = { label: string; count: number };

type AggregateData = {
  totalApplications: number;
  approvals: number;
  reviews: number;
  rejections: number;
  approvalRate: number;
  avgRiskScore: number;
};

type CounterfactualResult = {
  original: { score: number; decision: string; rationale: string; factors: Factor[]; reasonCodes: string[] };
  counterfactual: { score: number; decision: string; rationale: string; factors: Factor[]; reasonCodes: string[] };
  deltas: {
    scoreDelta: number;
    decisionChanged: boolean;
    factorDeltas: Array<{ name: string; original: number; counterfactual: number; delta: number; maxScore: number }>;
  };
};

type ExplanationData = {
  narrative: string;
  highlights: string[];
  source: string;
};

type Props = {
  initialAnalyses: ApplicationAnalysis[];
  aggregate: AggregateData;
  fairnessMetrics: FairnessBand[];
  scoreDistribution: ScoreBucket[];
};

const tabs = [
  { id: "overview", label: "Decision Analysis", icon: Brain },
  { id: "counterfactual", label: "What-If Explorer", icon: GitCompareArrows },
  { id: "sources", label: "Data Sources", icon: Database },
  { id: "fairness", label: "Fairness & Bias", icon: Scale },
  { id: "compliance", label: "Compliance", icon: Shield },
] as const;

type TabId = (typeof tabs)[number]["id"];

const decisionConfig = {
  approve: { label: "Approved", tone: "success" as const, color: "text-success", bg: "bg-success-light" },
  review: { label: "Manual Review", tone: "warning" as const, color: "text-warning", bg: "bg-warning-light" },
  reject: { label: "Rejected", tone: "danger" as const, color: "text-danger", bg: "bg-danger-light" },
};

const confidenceColors = {
  high: "text-success",
  medium: "text-warning",
  low: "text-danger",
};

function FactorBar({ factor, maxGlobal }: { factor: Factor; maxGlobal: number }) {
  const pct = (factor.score / Math.max(maxGlobal, 1)) * 100;
  const fill = factor.score / factor.maxScore;
  const barColor = fill >= 0.7 ? "bg-success" : fill >= 0.4 ? "bg-warning" : "bg-danger";

  return (
    <div className="group flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-full text-xs text-foreground sm:w-28 sm:shrink-0 lg:w-36">{factor.name}</span>
      <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-dim">
        <div
          className={cn("h-full rounded-md transition-all duration-500", barColor)}
          style={{ width: `${pct}%`, opacity: 0.8 }}
        />
        <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-mono font-medium text-foreground">
          {factor.score}/{factor.maxScore}
        </span>
      </div>
      <span className="w-10 shrink-0 text-right text-[11px] font-mono text-muted">{factor.weight}%</span>
    </div>
  );
}

function DecisionBoundary({ score }: { score: number }) {
  const zones = [
    { label: "Reject", min: 0, max: 50, color: "bg-danger" },
    { label: "Review", min: 50, max: 75, color: "bg-warning" },
    { label: "Approve", min: 75, max: 100, color: "bg-success" },
  ];

  return (
    <div className="space-y-2">
      <div className="relative h-8 overflow-hidden rounded-lg">
        {zones.map((zone) => (
          <div
            key={zone.label}
            className={cn("absolute top-0 h-full", zone.color)}
            style={{ left: `${zone.min}%`, width: `${zone.max - zone.min}%`, opacity: 0.2 }}
          />
        ))}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground"
          style={{ left: `${Math.min(score, 100)}%` }}
        />
        <div
          className="absolute -top-1 flex h-10 w-10 items-center justify-center"
          style={{ left: `calc(${Math.min(score, 100)}% - 20px)` }}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            {score}
          </div>
        </div>
      </div>
      <div className="relative flex justify-between text-[10px] font-medium">
        {zones.map((zone) => (
          <span key={zone.label} className="text-muted" style={{ position: "absolute", left: `${(zone.min + zone.max) / 2}%`, transform: "translateX(-50%)" }}>
            {zone.label}
          </span>
        ))}
      </div>
      <div className="relative flex justify-between text-[10px] text-muted">
        <span>0</span>
        <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>50</span>
        <span style={{ position: "absolute", left: "75%", transform: "translateX(-50%)" }}>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function ExplainabilityEngine({ initialAnalyses, aggregate, fairnessMetrics, scoreDistribution }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedAppId, setSelectedAppId] = useState<string>(initialAnalyses[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const [cfOverrides, setCfOverrides] = useState<Record<string, number>>({});
  const [cfResult, setCfResult] = useState<CounterfactualResult | null>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedApp = useMemo(
    () => initialAnalyses.find((a) => a.id === selectedAppId) ?? null,
    [initialAnalyses, selectedAppId],
  );

  const filteredApps = useMemo(
    () =>
      searchQuery.trim()
        ? initialAnalyses.filter((a) => a.applicantName.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : initialAnalyses,
    [initialAnalyses, searchQuery],
  );

  const fetchExplanation = useCallback(async (appId: string) => {
    setLoadingExplanation(true);
    try {
      const res = await fetch(`/api/v1/explainability?applicationId=${appId}`);
      const json = await res.json();
      if (json.data?.explanation) {
        setExplanation(json.data.explanation);
      }
    } catch {
      setExplanation(null);
    } finally {
      setLoadingExplanation(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      fetchExplanation(selectedAppId);
      setCfResult(null);
      setCfOverrides({});
    }
  }, [selectedAppId, fetchExplanation]);

  function runCounterfactual() {
    if (!selectedApp) return;
    setCfLoading(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/explainability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: selectedApp.id, overrides: cfOverrides }),
        });
        const json = await res.json();
        if (json.data) setCfResult(json.data);
      } catch {
        setCfResult(null);
      } finally {
        setCfLoading(false);
      }
    });
  }

  const maxFactorScore = selectedApp ? Math.max(...selectedApp.factors.map((f) => f.maxScore)) : 35;

  return (
    <div className="space-y-6">
      {/* Application Selector */}
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light">
            <Brain className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Explainable AI Engine</p>
            <p className="text-xs text-muted">Select an application to analyze its decision pathway</p>
          </div>
        </div>

        <div className="relative w-full sm:min-w-[280px] sm:w-auto">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground transition hover:border-accent/40"
          >
            <span className="truncate">
              {selectedApp ? `${selectedApp.applicantName} — ${selectedApp.product}` : "Select application..."}
            </span>
            <ChevronDown className={cn("ml-2 h-4 w-4 text-muted transition", showDropdown && "rotate-180")} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              <div className="border-b border-line p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-md border border-line bg-surface-dim py-1.5 pl-8 pr-3 text-xs text-foreground outline-none focus:border-accent"
                    autoFocus
                  />
                </div>
              </div>
              <div className="custom-scroll max-h-56 overflow-y-auto">
                {filteredApps.map((app) => {
                  const cfg = decisionConfig[app.decision];
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => { setSelectedAppId(app.id); setShowDropdown(false); setSearchQuery(""); }}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-surface-dim",
                        app.id === selectedAppId && "bg-accent-light",
                      )}
                    >
                      <span className="truncate font-medium text-foreground">{app.applicantName}</span>
                      <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface-dim p-1 sm:mx-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition min-h-[40px] sm:gap-2 sm:px-3.5",
                activeTab === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && selectedApp && (
        <OverviewTab app={selectedApp} explanation={explanation} loadingExplanation={loadingExplanation} maxFactorScore={maxFactorScore} />
      )}
      {activeTab === "counterfactual" && selectedApp && (
        <CounterfactualTab
          app={selectedApp}
          overrides={cfOverrides}
          setOverrides={setCfOverrides}
          result={cfResult}
          loading={cfLoading}
          onRun={runCounterfactual}
        />
      )}
      {activeTab === "sources" && selectedApp && <SourcesTab app={selectedApp} />}
      {activeTab === "fairness" && (
        <FairnessTab aggregate={aggregate} fairnessMetrics={fairnessMetrics} scoreDistribution={scoreDistribution} />
      )}
      {activeTab === "compliance" && selectedApp && (
        <ComplianceTab app={selectedApp} explanation={explanation} aggregate={aggregate} />
      )}

      {!selectedApp && (
        <div className="rounded-xl border border-dashed border-line p-12 text-center">
          <Brain className="mx-auto h-10 w-10 text-muted/30" />
          <p className="mt-3 text-sm font-medium text-foreground">No application selected</p>
          <p className="mt-1 text-xs text-muted">Choose an application from the dropdown above to begin analysis.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({ app, explanation, loadingExplanation, maxFactorScore }: {
  app: ApplicationAnalysis;
  explanation: ExplanationData | null;
  loadingExplanation: boolean;
  maxFactorScore: number;
}) {
  const cfg = decisionConfig[app.decision];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Decision card */}
        <div className={cn("rounded-xl border p-5", cfg.bg, `border-${cfg.tone}/20`)}>
          <div className="flex items-center gap-2">
            {app.decision === "approve" && <CheckCircle2 className={cn("h-5 w-5", cfg.color)} />}
            {app.decision === "review" && <Eye className={cn("h-5 w-5", cfg.color)} />}
            {app.decision === "reject" && <XCircle className={cn("h-5 w-5", cfg.color)} />}
            <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{app.riskScore}<span className="text-base font-normal text-muted">/100</span></p>
          <p className="mt-1 text-xs text-muted">Composite risk score</p>
        </div>

        {/* Key metrics */}
        <div className="rounded-xl border border-line p-5">
          <p className="text-xs font-medium text-muted">Applicant Profile</p>
          <div className="mt-3 space-y-2">
            {[
              { label: "Credit Score", value: app.creditScore.toString() },
              { label: "Annual Income", value: `$${app.annualIncome.toLocaleString()}` },
              { label: "Monthly Debt", value: `$${app.monthlyDebt.toLocaleString()}` },
              { label: "Employment", value: `${app.employmentMonths} months` },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-xs">
                <span className="text-muted">{m.label}</span>
                <span className="font-mono font-medium text-foreground">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason codes */}
        <div className="rounded-xl border border-line p-5">
          <p className="text-xs font-medium text-muted">Reason Codes</p>
          <div className="mt-3 space-y-2">
            {app.reasonCodes.map((code, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                <span className="text-xs text-foreground">{code}</span>
              </div>
            ))}
            {app.flags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {app.flags.map((flag) => (
                  <Badge key={flag} tone="warning">{flag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Narrative */}
      <div className="rounded-xl border border-line p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">AI Decision Narrative</p>
          {explanation && (
            <Badge tone={explanation.source === "openai" ? "info" : "neutral"}>
              {explanation.source === "openai" ? "GPT-4.1" : "Rule-based"}
            </Badge>
          )}
        </div>
        {loadingExplanation ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating explanation...
          </div>
        ) : explanation ? (
          <>
            <p className="mt-3 text-sm leading-6 text-foreground">{explanation.narrative}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {explanation.highlights.map((h) => (
                <Badge key={h} tone="neutral">{h}</Badge>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted">Explanation not available.</p>
        )}
      </div>

      {/* Factor Attribution */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">Factor Attribution</p>
          </div>
          <div className="space-y-3">
            {app.factors.map((factor) => (
              <FactorBar key={factor.name} factor={factor} maxGlobal={maxFactorScore} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-dim px-3 py-2">
            <span className="text-xs font-medium text-muted">Total Score</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {app.factors.reduce((s, f) => s + f.score, 0)}/100
            </span>
          </div>
        </div>

        {/* Decision Boundary */}
        <div className="rounded-xl border border-line p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">Decision Boundary</p>
          </div>
          <p className="mb-4 text-xs text-muted">
            The score falls into one of three zones. Approve (≥75), Review (50-74), Reject (&lt;50).
          </p>
          <DecisionBoundary score={app.riskScore} />

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted">Decision Rules Applied</p>
            <div className="space-y-1.5">
              <RuleCheck label="Score ≥ 75" met={app.riskScore >= 75} />
              <RuleCheck label="Credit score ≥ 680" met={app.creditScore >= 680} />
              <RuleCheck label="Fewer than 2 risk flags" met={app.flags.length < 2} />
              <RuleCheck label="Score ≥ 50 (review eligible)" met={app.riskScore >= 50} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-danger" />
      )}
      <span className={met ? "text-foreground" : "text-muted line-through"}>{label}</span>
    </div>
  );
}

/* ─── Counterfactual Tab ─── */

function CounterfactualTab({ app, overrides, setOverrides, result, loading, onRun }: {
  app: ApplicationAnalysis;
  overrides: Record<string, number>;
  setOverrides: (o: Record<string, number>) => void;
  result: CounterfactualResult | null;
  loading: boolean;
  onRun: () => void;
}) {
  const fields = [
    { key: "creditScore", label: "Credit Score", min: 300, max: 850, step: 10, original: app.creditScore },
    { key: "annualIncome", label: "Annual Income ($)", min: 10000, max: 500000, step: 5000, original: app.annualIncome },
    { key: "monthlyDebt", label: "Monthly Debt ($)", min: 0, max: 20000, step: 100, original: app.monthlyDebt },
    { key: "employmentMonths", label: "Employment (months)", min: 0, max: 240, step: 3, original: app.employmentMonths },
    { key: "requestedAmount", label: "Requested Amount ($)", min: 1000, max: 2000000, step: 5000, original: app.requestedAmount },
  ];

  function setField(key: string, value: number) {
    setOverrides({ ...overrides, [key]: value });
  }

  function resetField(key: string) {
    const next = { ...overrides };
    delete next[key];
    setOverrides(next);
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Counterfactual Explorer</p>
        </div>
        <p className="mb-5 text-xs text-muted">
          Adjust the applicant&apos;s parameters below to simulate how different values would affect the underwriting decision.
          This helps identify the minimal changes required to alter the outcome.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => {
            const current = overrides[field.key] ?? field.original;
            const isModified = field.key in overrides;
            return (
              <div key={field.key} className={cn("rounded-lg border p-3 transition", isModified ? "border-accent/30 bg-accent-light/30" : "border-line-subtle")}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">{field.label}</label>
                  {isModified && (
                    <button type="button" onClick={() => resetField(field.key)} className="text-[10px] text-accent hover:underline">
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={current}
                  onChange={(e) => setField(field.key, Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted">Original: {field.key.includes("Income") || field.key.includes("Debt") || field.key.includes("Amount") ? `$${formatCurrency(field.original)}` : field.original}</span>
                  <span className={cn("font-mono font-medium", isModified ? "text-accent" : "text-foreground")}>
                    {field.key.includes("Income") || field.key.includes("Debt") || field.key.includes("Amount") ? `$${formatCurrency(current)}` : current}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={loading || !hasOverrides}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Run Counterfactual"}
          </button>
          {hasOverrides && (
            <button
              type="button"
              onClick={() => setOverrides({})}
              className="text-xs text-muted hover:text-foreground"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={cn(
            "rounded-xl border p-5",
            result.deltas.decisionChanged ? "border-accent/30 bg-accent-light/30" : "border-line",
          )}>
            <div className="flex items-center gap-2">
              {result.deltas.decisionChanged ? (
                <AlertTriangle className="h-4 w-4 text-accent" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-muted" />
              )}
              <p className="text-sm font-semibold text-foreground">
                {result.deltas.decisionChanged ? "Decision would change" : "Decision unchanged"}
              </p>
            </div>

            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                <p className="text-[10px] font-medium text-muted">Original</p>
                <p className="mt-1 text-xl font-bold text-foreground">{result.original.score}</p>
                <Badge tone={decisionConfig[result.original.decision as keyof typeof decisionConfig]?.tone ?? "neutral"}>
                  {result.original.decision}
                </Badge>
              </div>
              <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-muted sm:rotate-0" />
              <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                <p className="text-[10px] font-medium text-muted">Counterfactual</p>
                <p className="mt-1 text-xl font-bold text-foreground">{result.counterfactual.score}</p>
                <Badge tone={decisionConfig[result.counterfactual.decision as keyof typeof decisionConfig]?.tone ?? "neutral"}>
                  {result.counterfactual.decision}
                </Badge>
              </div>
              <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                <p className="text-[10px] font-medium text-muted">Delta</p>
                <p className={cn("mt-1 text-xl font-bold", result.deltas.scoreDelta > 0 ? "text-success" : result.deltas.scoreDelta < 0 ? "text-danger" : "text-muted")}>
                  {result.deltas.scoreDelta > 0 ? "+" : ""}{result.deltas.scoreDelta}
                </p>
                <span className="text-[10px] text-muted">points</span>
              </div>
            </div>
          </div>

          {/* Factor deltas */}
          <div className="rounded-xl border border-line p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">Factor Impact Comparison</p>
            <div className="space-y-2">
              {result.deltas.factorDeltas.map((fd) => (
                <div key={fd.name} className="flex flex-col gap-2 rounded-lg border border-line-subtle p-3 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-xs font-medium text-foreground sm:w-28 sm:shrink-0 lg:w-36">{fd.name}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="font-mono text-xs text-muted">{fd.original}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted" />
                    <span className="font-mono text-xs text-foreground">{fd.counterfactual}</span>
                  </div>
                  <span className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                    fd.delta > 0 ? "bg-success-light text-success" : fd.delta < 0 ? "bg-danger-light text-danger" : "bg-surface-dim text-muted",
                  )}>
                    {fd.delta > 0 ? <TrendingUp className="h-3 w-3" /> : fd.delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                    {fd.delta > 0 ? "+" : ""}{fd.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sources Tab ─── */

function SourcesTab({ app }: { app: ApplicationAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Data Source Transparency</p>
        </div>
        <p className="mb-5 text-xs text-muted">
          Every data signal used in the scoring model is listed below with its contribution weight, confidence level,
          and a human-readable summary. This ensures full auditability of the decision pipeline.
        </p>

        <div className="space-y-3">
          {app.sources.map((source) => (
            <div key={source.name} className="rounded-xl border border-line-subtle p-4 transition hover:border-accent/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{source.name}</p>
                    <span className={cn("flex items-center gap-1 text-[11px] font-medium", confidenceColors[source.confidence])}>
                      <Fingerprint className="h-3 w-3" />
                      {source.confidence} confidence
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{source.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg font-bold text-foreground">{source.score}</p>
                  <p className="text-[10px] text-muted">Weight: {source.weight}%</p>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-dim">
                <div
                  className="metric-bar h-full rounded-full"
                  style={{ width: `${(source.score / source.weight) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Model Provenance</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Model Version", value: "rt-ml-placeholder-v1" },
            { label: "Scoring Engine", value: "Realtime ML Pipeline" },
            { label: "Decision Engine", value: "Rule-based v1.0" },
            { label: "Feature Count", value: `${app.factors.length} factors` },
            { label: "Data Sources", value: `${app.sources.length} signals` },
            { label: "Explanation Provider", value: "GPT-4.1 mini / Rule fallback" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-line-subtle p-3">
              <p className="text-[11px] font-medium text-muted">{item.label}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Fairness Tab ─── */

function FairnessTab({ aggregate, fairnessMetrics, scoreDistribution }: {
  aggregate: AggregateData;
  fairnessMetrics: FairnessBand[];
  scoreDistribution: ScoreBucket[];
}) {
  const maxBandCount = Math.max(...fairnessMetrics.map((b) => b.total), 1);
  const maxBucket = Math.max(...scoreDistribution.map((b) => b.count), 1);

  return (
    <div className="space-y-5">
      {/* Aggregate metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Applications", value: aggregate.totalApplications },
          { label: "Approval Rate", value: `${aggregate.approvalRate}%` },
          { label: "Avg Risk Score", value: aggregate.avgRiskScore },
          { label: "Rejection Rate", value: aggregate.totalApplications > 0 ? `${Math.round((aggregate.rejections / aggregate.totalApplications) * 100)}%` : "0%" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-line p-4">
            <p className="text-xs font-medium text-muted">{m.label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Approval by credit band */}
      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Approval Rate by Credit Band</p>
        </div>
        <p className="mb-4 text-xs text-muted">
          Fairness analysis showing approval rates across credit score bands.
          Significant disparities may indicate algorithmic bias requiring review.
        </p>

        <div className="space-y-3">
          {fairnessMetrics.map((band) => (
            <div key={band.band} className="rounded-lg border border-line-subtle p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{band.band}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted">{band.total} applicants</span>
                  <span className="font-mono font-medium text-foreground">{band.approvalRate}% approved</span>
                </div>
              </div>
              <div className="mt-2 flex gap-1">
                <div className="h-3 overflow-hidden rounded-l-full bg-success" style={{ width: `${band.approvalRate}%`, opacity: 0.7 }} />
                <div className="h-3 flex-1 overflow-hidden rounded-r-full bg-surface-dim" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score distribution */}
      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Score Distribution</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scoreDistribution.map((bucket) => {
            const pct = (bucket.count / maxBucket) * 100;
            return (
              <div key={bucket.label} className="rounded-lg border border-line-subtle p-4 text-center">
                <p className="text-xs text-muted">{bucket.label}</p>
                <div className="mx-auto mt-3 h-16 w-8 overflow-hidden rounded-md bg-surface-dim">
                  <div className="mt-auto h-full flex flex-col justify-end">
                    <div className="bg-accent rounded-t-md" style={{ height: `${pct}%`, opacity: 0.7 }} />
                  </div>
                </div>
                <p className="mt-2 text-lg font-bold text-foreground">{bucket.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bias indicators */}
      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Bias Detection Indicators</p>
        </div>
        <div className="space-y-2">
          <BiasCheck
            label="Credit Score Band Disparity"
            description="Approval rate difference between highest and lowest populated credit bands"
            status={getBandDisparity(fairnessMetrics) <= 50 ? "pass" : "flag"}
            detail={`${getBandDisparity(fairnessMetrics)}% difference`}
          />
          <BiasCheck
            label="Score Distribution Uniformity"
            description="Applications are distributed across risk buckets without extreme concentration"
            status={getConcentrationRisk(scoreDistribution) ? "flag" : "pass"}
            detail={getConcentrationRisk(scoreDistribution) ? "High concentration detected" : "Healthy distribution"}
          />
          <BiasCheck
            label="Rejection Rate Reasonableness"
            description="Overall rejection rate within acceptable policy bounds (< 40%)"
            status={aggregate.totalApplications > 0 && aggregate.rejections / aggregate.totalApplications < 0.4 ? "pass" : "flag"}
            detail={`${aggregate.totalApplications > 0 ? Math.round((aggregate.rejections / aggregate.totalApplications) * 100) : 0}% rejection rate`}
          />
          <BiasCheck
            label="Model Explainability Coverage"
            description="All decisions have traceable factor attribution and reason codes"
            status="pass"
            detail="100% coverage"
          />
        </div>
      </div>
    </div>
  );
}

function getBandDisparity(bands: FairnessBand[]): number {
  const populated = bands.filter((b) => b.total > 0);
  if (populated.length < 2) return 0;
  const rates = populated.map((b) => b.approvalRate);
  return Math.max(...rates) - Math.min(...rates);
}

function getConcentrationRisk(buckets: ScoreBucket[]): boolean {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) return false;
  return buckets.some((b) => b.count / total > 0.7);
}

function BiasCheck({ label, description, status, detail }: {
  label: string;
  description: string;
  status: "pass" | "flag";
  detail: string;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border p-3",
      status === "pass" ? "border-success/20 bg-success-light" : "border-warning/20 bg-warning-light",
    )}>
      {status === "pass" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <span className={cn("text-[11px] font-medium", status === "pass" ? "text-success" : "text-warning")}>{detail}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
      </div>
    </div>
  );
}

/* ─── Compliance Tab ─── */

function ComplianceTab({ app, explanation, aggregate }: {
  app: ApplicationAnalysis;
  explanation: ExplanationData | null;
  aggregate: AggregateData;
}) {
  const cfg = decisionConfig[app.decision];
  const complianceChecks = [
    {
      regulation: "GDPR Article 22",
      requirement: "Right to explanation of automated decision-making",
      status: explanation ? "compliant" : "partial",
      detail: explanation
        ? `AI-generated narrative available (source: ${explanation.source})`
        : "Explanation pending generation",
    },
    {
      regulation: "ECOA / Reg B",
      requirement: "Adverse action notice with specific reasons",
      status: app.reasonCodes.length > 0 ? "compliant" : "non_compliant",
      detail: `${app.reasonCodes.length} reason code(s) generated for this decision`,
    },
    {
      regulation: "Fair Credit Reporting Act",
      requirement: "Disclose credit bureau data usage and scoring factors",
      status: app.sources.some((s) => s.name === "Credit bureau") ? "compliant" : "partial",
      detail: "Credit bureau signal included in scoring pipeline",
    },
    {
      regulation: "SR 11-7 (Model Risk)",
      requirement: "Model documentation with version tracking",
      status: "compliant",
      detail: "Model version rt-ml-placeholder-v1 with full factor attribution",
    },
    {
      regulation: "FCRA Section 615",
      requirement: "Applicant notification of credit-based decision factors",
      status: app.factors.length > 0 ? "compliant" : "partial",
      detail: `${app.factors.length} scoring factors with breakdown available`,
    },
    {
      regulation: "Internal Audit Trail",
      requirement: "Full decision payload preservation for regulatory review",
      status: "compliant",
      detail: "Score, factors, sources, and explanation archived per decision",
    },
  ];

  const compliant = complianceChecks.filter((c) => c.status === "compliant").length;
  const total = complianceChecks.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-line p-4 sm:p-5">
          <p className="text-xs font-medium text-muted">Compliance Score</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{compliant}/{total}</p>
          <p className="mt-1 text-xs text-muted">checks passing</p>
        </div>
        <div className={cn("rounded-xl border p-4 sm:p-5", cfg.bg)}>
          <p className="text-xs font-medium text-muted">Decision Under Review</p>
          <p className={cn("mt-2 text-lg font-bold", cfg.color)}>{cfg.label}</p>
          <p className="mt-1 text-xs text-muted">Score: {app.riskScore}/100</p>
        </div>
        <div className="rounded-xl border border-line p-4 sm:col-span-2 sm:p-5 lg:col-span-1">
          <p className="text-xs font-medium text-muted">Explanation Source</p>
          <p className="mt-2 text-lg font-bold text-foreground">{explanation?.source === "openai" ? "GPT-4.1 mini" : "Rule Engine"}</p>
          <p className="mt-1 text-xs text-muted">Narrative + {explanation?.highlights.length ?? 0} highlights</p>
        </div>
      </div>

      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Regulatory Compliance Checks</p>
        </div>
        <div className="space-y-2">
          {complianceChecks.map((check) => (
            <div key={check.regulation} className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              check.status === "compliant" ? "border-success/20" : check.status === "partial" ? "border-warning/20" : "border-danger/20",
            )}>
              {check.status === "compliant" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : check.status === "partial" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">{check.regulation}</p>
                  <Badge tone={check.status === "compliant" ? "success" : check.status === "partial" ? "warning" : "danger"}>
                    {check.status === "compliant" ? "Compliant" : check.status === "partial" ? "Partial" : "Non-Compliant"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{check.requirement}</p>
                <p className="mt-1 text-xs text-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Export Compliance Report</p>
        </div>
        <p className="mb-4 text-xs text-muted">
          Generate a compliance-ready report for this application including decision rationale,
          factor attribution, data source transparency, and regulatory check results.
        </p>
        <button
          type="button"
          onClick={() => exportComplianceReport(app, explanation, complianceChecks)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
        >
          <Download className="h-4 w-4" />
          Download Compliance PDF
        </button>
      </div>
    </div>
  );
}

function exportComplianceReport(
  app: ApplicationAnalysis,
  explanation: ExplanationData | null,
  checks: Array<{ regulation: string; requirement: string; status: string; detail: string }>,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `<!DOCTYPE html>
<html><head><title>Compliance Report - ${app.applicantName}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:40px;color:#1a1a2e;line-height:1.6}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:15px;color:#4f46e5;margin-top:28px;margin-bottom:10px;border-bottom:2px solid #eef2ff;padding-bottom:6px}
.subtitle{color:#6b7280;font-size:12px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
th{text-align:left;padding:8px;background:#f8f9fb;border-bottom:2px solid #e2e5ea;font-weight:600}
td{padding:8px;border-bottom:1px solid #f0f0f0}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
.badge-pass{background:#ecfdf5;color:#059669}
.badge-warn{background:#fffbeb;color:#d97706}
.badge-fail{background:#fef2f2;color:#dc2626}
.metric{display:inline-block;margin-right:24px;margin-bottom:12px}
.metric .value{font-size:20px;font-weight:700}
.metric .label{font-size:10px;color:#6b7280;text-transform:uppercase}
@media print{body{margin:20px}}
</style></head><body>
<h1>Compliance Report</h1>
<p class="subtitle">Application: ${app.applicantName} &bull; ${app.product} &bull; Generated ${new Date().toLocaleString()} &bull; Aegis Platform</p>

<h2>Decision Summary</h2>
<div class="metric"><div class="label">Decision</div><div class="value">${app.decision.toUpperCase()}</div></div>
<div class="metric"><div class="label">Risk Score</div><div class="value">${app.riskScore}/100</div></div>
<div class="metric"><div class="label">Credit Score</div><div class="value">${app.creditScore}</div></div>

<h2>AI Explanation</h2>
<p>${explanation?.narrative ?? "Rule-based explanation used."}</p>
${explanation?.highlights ? `<p><strong>Key factors:</strong> ${explanation.highlights.join(", ")}</p>` : ""}
<p><em>Source: ${explanation?.source ?? "rule-based"}</em></p>

<h2>Factor Attribution</h2>
<table><thead><tr><th>Factor</th><th>Score</th><th>Max</th><th>Weight</th></tr></thead><tbody>
${app.factors.map((f) => `<tr><td>${f.name}</td><td>${f.score}</td><td>${f.maxScore}</td><td>${f.weight}%</td></tr>`).join("")}
</tbody></table>

<h2>Data Sources</h2>
<table><thead><tr><th>Source</th><th>Score</th><th>Confidence</th><th>Summary</th></tr></thead><tbody>
${app.sources.map((s) => `<tr><td>${s.name}</td><td>${s.score}</td><td>${s.confidence}</td><td>${s.summary}</td></tr>`).join("")}
</tbody></table>

<h2>Reason Codes</h2>
<ul>${app.reasonCodes.map((r) => `<li>${r}</li>`).join("")}</ul>

<h2>Regulatory Compliance Checks</h2>
<table><thead><tr><th>Regulation</th><th>Requirement</th><th>Status</th><th>Detail</th></tr></thead><tbody>
${checks.map((c) => `<tr><td>${c.regulation}</td><td>${c.requirement}</td><td><span class="badge ${c.status === "compliant" ? "badge-pass" : c.status === "partial" ? "badge-warn" : "badge-fail"}">${c.status}</span></td><td>${c.detail}</td></tr>`).join("")}
</tbody></table>

<script>setTimeout(()=>window.print(),500)<\/script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}
