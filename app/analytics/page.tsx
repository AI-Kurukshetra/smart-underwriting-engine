import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { getAnalyticsData } from "@/lib/repositories/features";

export default async function AnalyticsPage() {
  const profile = await requireProfile();
  const analytics = await getAnalyticsData(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/analytics"
      eyebrow="Analytics"
      title="Platform Analytics"
      description="Deep operational analytics including decision throughput, model performance, processing metrics, and portfolio trends."
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {analytics.metrics.map((metric) => {
          const TrendIcon = metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : Minus;
          const isPositive = (metric.trend === "up" && metric.label !== "Avg Risk Score") || (metric.trend === "down" && metric.label === "Avg Risk Score") || (metric.trend === "down" && metric.label === "Avg Processing Time");

          return (
            <div key={metric.label} className="card-elevated p-5">
              <p className="text-sm font-medium text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{metric.value}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <TrendIcon className={`h-3.5 w-3.5 ${isPositive ? "text-success" : "text-danger"}`} />
                <span className={`text-xs font-medium ${isPositive ? "text-success" : "text-danger"}`}>
                  {metric.change > 0 ? "+" : ""}{metric.change}%
                </span>
                <span className="text-xs text-muted">{metric.period}</span>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Decisions"
          title="Decision distribution"
          description="Breakdown of automated underwriting decisions by outcome category."
        >
          <div className="space-y-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-surface-dim">
              {analytics.decisionBreakdown.map((d) =>
                d.pct > 0 ? (
                  <div key={d.label} className={`${d.color} transition-all`} style={{ width: `${d.pct}%` }} />
                ) : null,
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {analytics.decisionBreakdown.map((d) => (
                <div key={d.label} className="rounded-xl border border-line-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
                    <span className="text-xs font-medium text-muted">{d.label}</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">{d.count}</p>
                  <p className="text-[11px] text-muted">{d.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Performance"
          title="Processing metrics"
          description="Key operational performance indicators for the scoring and decisioning pipeline."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {analytics.processingStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between rounded-lg border border-line-subtle p-3">
                <span className="text-xs text-muted">{stat.label}</span>
                <span className="font-mono text-sm font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Key metrics"
        title="Metrics to track"
        description="Core KPIs defined in the platform blueprint for measuring underwriting intelligence effectiveness."
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Risk prediction accuracy (AUC, precision, recall)",
            "Processing time per application",
            "False positive/negative rates",
            "Model drift detection frequency",
            "Customer acquisition cost vs. lifetime value",
            "Portfolio loss ratio improvement",
            "Fraud detection rate and accuracy",
            "API response times and uptime",
            "Regulatory compliance score",
            "User adoption and engagement rates",
          ].map((metric) => (
            <div key={metric} className="flex items-center gap-2 rounded-lg border border-line-subtle p-3">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="text-xs text-foreground">{metric}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
