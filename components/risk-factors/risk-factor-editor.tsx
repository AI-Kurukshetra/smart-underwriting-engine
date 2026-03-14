"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, Save, Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import type { RiskFactor } from "@/lib/repositories/features";

const categoryColors: Record<string, string> = {
  credit: "bg-indigo-50 text-indigo-600",
  income: "bg-emerald-50 text-emerald-600",
  employment: "bg-blue-50 text-blue-600",
  debt: "bg-amber-50 text-amber-600",
  behavioral: "bg-violet-50 text-violet-600",
  environmental: "bg-teal-50 text-teal-600",
};

type Props = {
  initialFactors: RiskFactor[];
};

async function persistFactors(factors: RiskFactor[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/v1/risk-factors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        factors: factors.map((f) => ({
          factor_key: f.id,
          name: f.name,
          category: f.category,
          weight: f.weight,
          max_score: f.maxScore,
          description: f.description,
          enabled: f.enabled,
        })),
      }),
    });

    const result = await response.json();

    if (!response.ok && response.status !== 207) {
      return { ok: false, error: result.error?.message ?? "Failed to save configuration" };
    }

    if (response.status === 207) {
      return { ok: false, error: result.error?.message ?? "Some factors failed to save." };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function RiskFactorEditor({ initialFactors }: Props) {
  const router = useRouter();
  const [factors, setFactors] = useState(initialFactors);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFactorsRef = useRef(factors);
  latestFactorsRef.current = factors;

  const enabledFactors = factors.filter((f) => f.enabled);
  const totalWeight = enabledFactors.reduce((s, f) => s + f.weight, 0);

  const autoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSaving(true);
      setSaveError(null);
      const result = await persistFactors(latestFactorsRef.current);
      if (result.ok) {
        setSaved(true);
        setSaveError(null);
        router.refresh();
      } else {
        setSaved(false);
        setSaveError(result.error ?? "Save failed");
      }
      setIsSaving(false);
    }, 600);
  }, [router]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function toggleFactor(id: string) {
    setFactors((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled, weight: !f.enabled ? Math.min(f.maxScore, 10) : 0 } : f,
      ),
    );
    setSaved(false);
    autoSave();
  }

  function updateWeight(id: string, weight: number) {
    setFactors((prev) =>
      prev.map((f) => (f.id === id ? { ...f, weight: Math.max(0, Math.min(f.maxScore, weight)) } : f)),
    );
    setSaved(false);
    autoSave();
  }

  function resetToDefaults() {
    setFactors(initialFactors);
    setSaved(false);
    autoSave();
  }

  async function saveConfiguration() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSaving(true);
    setSaveError(null);

    const result = await persistFactors(factors);
    if (result.ok) {
      setSaved(true);
      setSaveError(null);
      router.refresh();
    } else {
      setSaved(false);
      setSaveError(result.error ?? "Save failed");
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Active factors</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent"><Sliders className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{enabledFactors.length}</p>
          <p className="mt-1 text-xs text-muted">of {factors.length} configured</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Total weight</p>
          <p className={`mt-3 text-2xl font-bold ${totalWeight === 100 ? "text-success" : "text-warning"}`}>{totalWeight}</p>
          <p className="mt-1 text-xs text-muted">{totalWeight === 100 ? "Optimal distribution" : "Adjust weights to reach 100"}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Categories</p>
          <p className="mt-3 text-2xl font-bold text-foreground">{new Set(factors.map((f) => f.category)).size}</p>
          <p className="mt-1 text-xs text-muted">Distinct factor categories</p>
        </div>
      </section>

      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger">
          <span className="font-medium">Save failed:</span> {saveError}
        </div>
      )}

      <SectionCard
        eyebrow="Configuration"
        title="Factor weights & settings"
        description="Toggle factors on/off and use the slider to adjust weights. Total weight should ideally sum to 100."
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              type="button"
              onClick={saveConfiguration}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {factors.map((factor) => (
            <div
              key={factor.id}
              className={`rounded-xl border p-4 transition ${factor.enabled ? "border-line hover:border-accent/20" : "border-line-subtle bg-surface-dim opacity-60"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{factor.name}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColors[factor.category] ?? "bg-slate-50 text-slate-600"}`}>
                      {factor.category}
                    </span>
                    {factor.enabled ? (
                      <Badge tone="success">Enabled</Badge>
                    ) : (
                      <Badge tone="neutral">Disabled</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{factor.description}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {factor.enabled && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={factor.maxScore}
                        value={factor.weight}
                        onChange={(e) => updateWeight(factor.id, Number(e.target.value))}
                        className="h-1.5 w-full min-w-0 cursor-pointer accent-accent sm:w-24"
                      />
                      <div className="w-12 shrink-0 text-right">
                        <input
                          type="number"
                          min={0}
                          max={factor.maxScore}
                          value={factor.weight}
                          onChange={(e) => updateWeight(factor.id, Number(e.target.value))}
                          className="w-12 rounded border border-line bg-surface px-1.5 py-1 text-right font-mono text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <span className="shrink-0 text-xs text-muted">/ {factor.maxScore}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFactor(factor.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition min-h-[36px] ${factor.enabled ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-surface-dim text-muted hover:bg-surface hover:text-foreground"}`}
                  >
                    {factor.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
              {factor.enabled && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-dim">
                  <div className="metric-bar h-full" style={{ width: `${(factor.weight / factor.maxScore) * 100}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
