"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, Brain, CheckCircle2, FlaskConical, Pause, Play, RotateCcw, Settings2, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { persistSetting } from "@/lib/api-client";

type Model = {
  name: string;
  kind: string;
  coverage: string;
  status: string;
};

type Props = {
  initialModels: Model[];
};

const performanceData = [
  { name: "policy-engine-v1", accuracy: 94.2, precision: 92.8, recall: 95.1, f1: 93.9, latency: "420ms", lastTrained: "2026-02-15", samples: "12,847" },
  { name: "document-intelligence-v1", accuracy: 91.5, precision: 89.3, recall: 93.2, f1: 91.2, latency: "1.2s", lastTrained: "2026-01-28", samples: "8,234" },
  { name: "challenger-risk-v2", accuracy: 0, precision: 0, recall: 0, f1: 0, latency: "--", lastTrained: "--", samples: "0" },
];

const driftIndicators = [
  { feature: "Credit score distribution", drift: 0.02, threshold: 0.05, status: "stable" },
  { feature: "Income levels", drift: 0.04, threshold: 0.05, status: "stable" },
  { feature: "Debt-to-income ratio", drift: 0.08, threshold: 0.05, status: "drift" },
  { feature: "Employment duration", drift: 0.01, threshold: 0.05, status: "stable" },
  { feature: "Document completeness", drift: 0.03, threshold: 0.05, status: "stable" },
];

export function ModelRegistry({ initialModels }: Props) {
  const router = useRouter();
  const [models, setModels] = useState(initialModels);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [retrainingModel, setRetrainingModel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function toggleModel(name: string) {
    const newStatus = models.find((m) => m.name === name)?.status === "active" ? "paused" : "active";
    setModels((prev) =>
      prev.map((m) => (m.name === name ? { ...m, status: newStatus } : m)),
    );
    setFeedback(`Model ${name} ${newStatus === "paused" ? "paused" : "activated"}.`);
    persistSetting("model_configs", "upsert", {
      model_name: name,
      model_kind: models.find((m) => m.name === name)?.kind ?? "Unknown",
      status: newStatus,
      coverage: models.find((m) => m.name === name)?.coverage,
    }).then(() => router.refresh()).catch(() => {});
  }

  function promoteChallenger(name: string) {
    const previousChampion = models.find((m) => m.kind === "Champion");
    setModels((prev) =>
      prev.map((m) => {
        if (m.name === name) return { ...m, status: "active", kind: "Champion" };
        if (m.kind === "Champion") return { ...m, kind: "Challenger" };
        return m;
      }),
    );
    setFeedback(`${name} promoted to Champion. Previous champion demoted to Challenger.`);
    persistSetting("model_configs", "upsert", {
      model_name: name,
      model_kind: "Champion",
      status: "active",
    }).then(() => router.refresh()).catch(() => {});
    if (previousChampion) {
      persistSetting("model_configs", "upsert", {
        model_name: previousChampion.name,
        model_kind: "Challenger",
        status: previousChampion.status,
        coverage: previousChampion.coverage,
      }).catch(() => {});
    }
  }

  function triggerRetrain(name: string) {
    setRetrainingModel(name);
    setFeedback(`Retraining ${name}...`);
    setTimeout(() => {
      setRetrainingModel(null);
      setFeedback(`${name} retrained successfully. Model metrics refreshed.`);
      persistSetting("model_configs", "upsert", {
        model_name: name,
        model_kind: models.find((m) => m.name === name)?.kind ?? "Unknown",
        status: "active",
        last_trained_at: new Date().toISOString(),
      }).then(() => router.refresh()).catch(() => {});
    }, 2000);
  }

  const activeCount = models.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Registered models</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent"><Brain className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{models.length}</p>
          <p className="mt-1 text-xs text-muted">In the model registry</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Active models</p>
          <p className="mt-3 text-2xl font-bold text-success">{activeCount}</p>
          <p className="mt-1 text-xs text-muted">Serving predictions</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Data drift alerts</p>
          <p className="mt-3 text-2xl font-bold text-warning">{driftIndicators.filter((d) => d.status === "drift").length}</p>
          <p className="mt-1 text-xs text-muted">Features above threshold</p>
        </div>
      </section>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" />
          {feedback}
        </div>
      )}

      <SectionCard eyebrow="Registry" title="Model inventory" description="Manage model lifecycle — activate, pause, retrain, or promote challenger models.">
        <div className="space-y-3">
          {models.map((model) => {
            const perf = performanceData.find((p) => p.name === model.name);
            const isExpanded = expandedModel === model.name;
            const isRetraining = retrainingModel === model.name;

            return (
              <div key={model.name} className="rounded-xl border border-line p-5 transition hover:border-accent/20 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{model.name}</p>
                      <Badge tone={model.status === "active" ? "success" : model.status === "paused" ? "warning" : "neutral"}>
                        {model.status}
                      </Badge>
                      <Badge tone="info">{model.kind}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{model.coverage}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleModel(model.name)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition min-h-[40px] ${model.status === "active" ? "border-warning/30 text-warning hover:bg-warning-light" : "border-success/30 text-success hover:bg-success-light"}`}
                    >
                      {model.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {model.status === "active" ? "Pause" : "Activate"}
                    </button>
                    {model.kind === "Challenger" && model.status === "active" && (
                      <button
                        type="button"
                        onClick={() => promoteChallenger(model.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition min-h-[40px] hover:bg-accent-strong"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Promote
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => triggerRetrain(model.name)}
                      disabled={isRetraining || model.status === "planned"}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition min-h-[40px] hover:text-foreground disabled:opacity-40"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${isRetraining ? "animate-spin" : ""}`} />
                      {isRetraining ? "Training..." : "Retrain"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedModel(isExpanded ? null : model.name)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition hover:text-foreground"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && perf && (
                  <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {[
                      { label: "Accuracy", value: perf.accuracy ? `${perf.accuracy}%` : "--" },
                      { label: "Precision", value: perf.precision ? `${perf.precision}%` : "--" },
                      { label: "Recall", value: perf.recall ? `${perf.recall}%` : "--" },
                      { label: "F1 Score", value: perf.f1 ? `${perf.f1}%` : "--" },
                      { label: "Latency", value: perf.latency },
                      { label: "Last trained", value: perf.lastTrained },
                      { label: "Training samples", value: perf.samples },
                      { label: "Model type", value: model.kind },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-line-subtle p-3">
                        <p className="text-[11px] font-medium text-muted">{stat.label}</p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Drift detection" title="Feature drift monitoring" description="Track input feature distributions against training baselines. Features exceeding the drift threshold may degrade model accuracy.">
        <div className="space-y-3">
          {driftIndicators.map((indicator) => (
            <div key={indicator.feature} className={`flex items-center justify-between rounded-xl border p-4 ${indicator.status === "drift" ? "border-warning/30 bg-warning-light/30" : "border-line-subtle"}`}>
              <div className="flex items-center gap-3">
                {indicator.status === "drift" ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : (
                  <Activity className="h-4 w-4 text-success" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{indicator.feature}</p>
                  <p className="text-[11px] text-muted">Drift: {indicator.drift.toFixed(3)} / threshold: {indicator.threshold.toFixed(3)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-dim">
                    <div
                      className={`h-full rounded-full ${indicator.status === "drift" ? "bg-warning" : "bg-success"}`}
                      style={{ width: `${Math.min(100, (indicator.drift / indicator.threshold) * 100)}%` }}
                    />
                  </div>
                </div>
                <Badge tone={indicator.status === "drift" ? "warning" : "success"}>
                  {indicator.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
