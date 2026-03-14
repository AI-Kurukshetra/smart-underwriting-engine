import { MapPin, AlertTriangle, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth/session";
import { getGeoRiskData } from "@/lib/repositories/features";

const riskLevelConfig = {
  low: { tone: "success" as const, bg: "bg-emerald-500" },
  moderate: { tone: "warning" as const, bg: "bg-amber-500" },
  high: { tone: "danger" as const, bg: "bg-orange-500" },
  critical: { tone: "danger" as const, bg: "bg-red-600" },
};

export default async function GeospatialPage() {
  const profile = await requireProfile();
  const zones = await getGeoRiskData(profile.tenantId);

  const totalExposure = zones.reduce((s, z) => s + z.exposure, 0);
  const totalApps = zones.reduce((s, z) => s + z.applicationCount, 0);
  const highRiskZones = zones.filter((z) => z.riskLevel === "high" || z.riskLevel === "critical").length;

  return (
    <AppShell
      profile={profile}
      currentPath="/geospatial"
      eyebrow="Geospatial"
      title="Geospatial Risk Analysis"
      description="Location-based risk assessment using geographic, environmental, and economic data to identify regional exposure concentrations."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">Regions tracked</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent"><MapPin className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{zones.length}</p>
          <p className="mt-1 text-xs text-muted">Active risk zones</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Total exposure</p>
          <p className="mt-3 text-2xl font-bold text-foreground">${totalExposure.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted">Across all regions</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Applications</p>
          <p className="mt-3 text-2xl font-bold text-foreground">{totalApps}</p>
          <p className="mt-1 text-xs text-muted">Geo-distributed cases</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted">High risk zones</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-light text-danger"><AlertTriangle className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{highRiskZones}</p>
          <p className="mt-1 text-xs text-muted">Require concentration review</p>
        </div>
      </section>

      <SectionCard
        eyebrow="Regions"
        title="Geographic risk zones"
        description="Breakdown of risk exposure by geographic region with environmental and economic factors."
      >
        <div className="space-y-4">
          {zones.map((zone) => {
            const config = riskLevelConfig[zone.riskLevel];
            const exposurePct = totalExposure > 0 ? Math.round((zone.exposure / totalExposure) * 100) : 0;
            return (
              <div key={zone.id} className="rounded-xl border border-line p-5 transition hover:border-accent/20 hover:shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-accent" />
                      <p className="text-base font-semibold text-foreground">{zone.region}</p>
                      <Badge tone={config.tone}>{zone.riskLevel}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {zone.factors.map((factor) => (
                        <span key={factor} className="rounded-md bg-surface-dim px-2 py-0.5 text-[11px] text-muted">{factor}</span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-line-subtle p-3">
                        <p className="text-[11px] font-medium text-muted">Applications</p>
                        <p className="mt-0.5 text-lg font-bold text-foreground">{zone.applicationCount}</p>
                      </div>
                      <div className="rounded-lg border border-line-subtle p-3">
                        <p className="text-[11px] font-medium text-muted">Avg Score</p>
                        <p className="mt-0.5 text-lg font-bold text-foreground">{zone.avgRiskScore}</p>
                      </div>
                      <div className="rounded-lg border border-line-subtle p-3">
                        <p className="text-[11px] font-medium text-muted">Exposure</p>
                        <p className="mt-0.5 text-lg font-bold text-foreground">${zone.exposure.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <TrendingUp className="h-3 w-3" />
                      {exposurePct}% of portfolio
                    </div>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-dim">
                      <div className={`${config.bg} h-full rounded-full`} style={{ width: `${exposurePct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </AppShell>
  );
}
