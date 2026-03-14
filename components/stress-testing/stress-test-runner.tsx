"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FlaskConical, Play, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { persistSetting } from "@/lib/api-client";
import type { ScenarioResult } from "@/lib/repositories/features";

const severityConfig = {
  low: { tone: "success" as const, color: "bg-emerald-500" },
  moderate: { tone: "warning" as const, color: "bg-amber-500" },
  high: { tone: "danger" as const, color: "bg-orange-500" },
  severe: { tone: "danger" as const, color: "bg-red-600" },
};

type Props = {
  initialScenarios: ScenarioResult[];
};

export function StressTestRunner({ initialScenarios }: Props) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customLossImpact, setCustomLossImpact] = useState(3);
  const [customApprovalImpact, setCustomApprovalImpact] = useState(-10);

  function runScenario(id: string) {
    setRunningId(id);
    setTimeout(() => {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                impactOnLossRatio: +(s.impactOnLossRatio * (0.85 + Math.random() * 0.3)).toFixed(1),
                impactOnApprovalRate: Math.round(s.impactOnApprovalRate * (0.9 + Math.random() * 0.2)),
              }
            : s,
        ),
      );
      setRunningId(null);
    }, 1500);
  }

  function addCustomScenario() {
    if (!customName.trim()) return;

    const severity =
      Math.abs(customLossImpact) > 5 ? "severe" : Math.abs(customLossImpact) > 3 ? "high" : Math.abs(customLossImpact) > 1.5 ? "moderate" : "low";

    const newScenario: ScenarioResult = {
      id: `custom-${Date.now()}`,
      name: customName,
      description: customDescription || "Custom scenario defined by analyst",
      impactOnLossRatio: customLossImpact,
      impactOnApprovalRate: customApprovalImpact,
      affectedApplications: Math.ceil(Math.abs(customApprovalImpact) * 0.5),
      severity: severity as ScenarioResult["severity"],
    };

    setScenarios((prev) => [...prev, newScenario]);
    setCustomName("");
    setCustomDescription("");
    setCustomLossImpact(3);
    setCustomApprovalImpact(-10);
    setShowCustom(false);

    persistSetting("stress_scenarios", "insert", {
      name: newScenario.name,
      description: newScenario.description,
      impact_on_loss_ratio: newScenario.impactOnLossRatio,
      impact_on_approval_rate: newScenario.impactOnApprovalRate,
      affected_applications: newScenario.affectedApplications,
      severity: newScenario.severity,
      is_custom: true,
    }).then(() => router.refresh()).catch(() => {});
  }

  function removeScenario(id: string) {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  const avgLossImpact = scenarios.reduce((s, sc) => s + sc.impactOnLossRatio, 0) / (scenarios.length || 1);
  const worstCase = scenarios.reduce((worst, sc) => sc.impactOnLossRatio > worst.impactOnLossRatio ? sc : worst, scenarios[0]);
  const severeCount = scenarios.filter((s) => s.severity === "severe" || s.severity === "high").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Scenarios</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent"><FlaskConical className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{scenarios.length}</p>
          <p className="mt-1 text-xs text-muted">Modeled stress tests</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Avg loss impact</p>
          <p className="mt-3 text-2xl font-bold text-foreground">{avgLossImpact > 0 ? "+" : ""}{avgLossImpact.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted">Mean loss ratio change</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Worst case</p>
          <p className="mt-3 text-2xl font-bold text-danger">+{worstCase?.impactOnLossRatio ?? 0}%</p>
          <p className="mt-1 text-xs text-muted">{worstCase?.name ?? "N/A"}</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">High severity</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-light text-danger"><AlertTriangle className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{severeCount}</p>
          <p className="mt-1 text-xs text-muted">Scenarios with major impact</p>
        </div>
      </section>

      <SectionCard
        eyebrow="Scenarios"
        title="Stress test results"
        description="Run simulations to recalculate impact, or create custom scenarios."
        action={
          <button
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white transition hover:bg-accent-strong"
          >
            <Plus className="h-3 w-3" />
            Custom scenario
          </button>
        }
      >
        {showCustom && (
          <div className="mb-5 rounded-xl border border-accent/20 bg-accent-light/30 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">New custom scenario</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Scenario name..."
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
              />
              <input
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Description..."
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
              />
              <div>
                <label className="text-[11px] font-medium text-muted">Loss ratio impact (%)</label>
                <input
                  type="number"
                  value={customLossImpact}
                  onChange={(e) => setCustomLossImpact(Number(e.target.value))}
                  step={0.1}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted">Approval rate impact (%)</label>
                <input
                  type="number"
                  value={customApprovalImpact}
                  onChange={(e) => setCustomApprovalImpact(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={addCustomScenario}
                disabled={!customName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
              >
                <CheckCircle2 className="h-3 w-3" />
                Create scenario
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {scenarios.map((scenario) => {
            const config = severityConfig[scenario.severity];
            const isRunning = runningId === scenario.id;
            const isCustom = scenario.id.startsWith("custom-");

            return (
              <div key={scenario.id} className="rounded-xl border border-line p-5 transition hover:border-accent/20 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">{scenario.name}</p>
                      <Badge tone={config.tone}>{scenario.severity}</Badge>
                      {isCustom && <Badge tone="info">Custom</Badge>}
                    </div>
                    <p className="mt-1.5 text-xs text-muted">{scenario.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => runScenario(scenario.id)}
                      disabled={isRunning || !!runningId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition min-h-[40px] hover:bg-accent/20 disabled:opacity-40"
                    >
                      <Play className={`h-3.5 w-3.5 ${isRunning ? "animate-pulse" : ""}`} />
                      {isRunning ? "Running..." : "Run"}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => removeScenario(scenario.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-line-subtle p-3">
                    <p className="text-[11px] font-medium text-muted">Loss ratio impact</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {scenario.impactOnLossRatio > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-danger" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-success" />
                      )}
                      <span className={`text-lg font-bold ${scenario.impactOnLossRatio > 0 ? "text-danger" : "text-success"}`}>
                        {scenario.impactOnLossRatio > 0 ? "+" : ""}{scenario.impactOnLossRatio}%
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line-subtle p-3">
                    <p className="text-[11px] font-medium text-muted">Approval rate impact</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-warning" />
                      <span className="text-lg font-bold text-warning">{scenario.impactOnApprovalRate}%</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line-subtle p-3">
                    <p className="text-[11px] font-medium text-muted">Affected applications</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{scenario.affectedApplications}</p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-dim">
                  <div className={`${config.color} h-full rounded-full transition-all`} style={{ width: `${Math.min(100, Math.abs(scenario.impactOnLossRatio) * 12)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
