import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { ExposureList } from "@/components/portfolio/exposure-list";
import { requireProfile } from "@/lib/auth/session";
import { getPortfolioSummary, listApplications } from "@/lib/repositories/applications";

export default async function PortfolioPage() {
  const profile = await requireProfile();
  const summary = await getPortfolioSummary(profile.tenantId);
  const { data: applications } = await listApplications(profile.tenantId);

  const totalExposure = applications.reduce((s, a) => s + a.requestedAmount, 0);
  const avgRiskScore = applications.length ? Math.round(applications.reduce((s, a) => s + a.riskScore, 0) / applications.length) : 0;
  const approved = applications.filter((a) => a.decision === "approve").length;
  const review = applications.filter((a) => a.decision === "review").length;
  const rejected = applications.filter((a) => a.decision === "reject").length;
  const pending = applications.length - approved - review - rejected;
  const highRisk = applications.filter((a) => a.riskScore > 60).length;
  const fraudFlags = applications.filter((a) => a.flags.length > 0).length;

  return (
    <AppShell
      profile={profile}
      currentPath="/portfolio"
      eyebrow="Portfolio"
      title="Portfolio Risk Analytics"
      description="Concentration, decision posture, exposure analytics, loss ratios, and fraud metrics across the current portfolio."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Total exposure</p>
          <p className="mt-2 text-2xl font-bold text-foreground">${totalExposure.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted">Across {applications.length} applications</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Auto-decision rate</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary.automatedDecisionRate}%</p>
          <p className="mt-1 text-xs text-muted">Straight-through processing</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Projected loss ratio</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary.projectedLossRatio}%</p>
          <p className="mt-1 text-xs text-muted">Portfolio-level estimate</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Avg risk score</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{avgRiskScore}</p>
          <p className="mt-1 text-xs text-muted">Blended portfolio score</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Decisions" title="Decision breakdown" description="Current decision distribution across the portfolio.">
          <div className="space-y-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-surface-dim">
              {[
                { pct: Math.round((approved / Math.max(applications.length, 1)) * 100), color: "bg-emerald-500" },
                { pct: Math.round((review / Math.max(applications.length, 1)) * 100), color: "bg-amber-500" },
                { pct: Math.round((rejected / Math.max(applications.length, 1)) * 100), color: "bg-red-500" },
                { pct: Math.round((pending / Math.max(applications.length, 1)) * 100), color: "bg-slate-400" },
              ].map((s, i) => s.pct > 0 ? <div key={i} className={`${s.color}`} style={{ width: `${s.pct}%` }} /> : null)}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Approved", count: approved, color: "bg-emerald-500" },
                { label: "Review", count: review, color: "bg-amber-500" },
                { label: "Rejected", count: rejected, color: "bg-red-500" },
                { label: "Pending", count: pending, color: "bg-slate-400" },
              ].map((d) => (
                <div key={d.label} className="rounded-xl border border-line-subtle p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
                    <span className="text-xs font-medium text-muted">{d.label}</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">{d.count}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Risk" title="Risk indicators" description="Key risk metrics and portfolio health indicators.">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "High risk applications", value: highRisk.toString(), tone: highRisk > 0 ? "warning" : "success" },
              { label: "Flagged for fraud", value: fraudFlags.toString(), tone: fraudFlags > 0 ? "danger" : "success" },
              { label: "Manual review queue", value: review.toString(), tone: review > 0 ? "warning" : "success" },
              { label: "Avg credit score", value: (applications.length ? Math.round(applications.reduce((s, a) => s + a.creditScore, 0) / applications.length) : 0).toString(), tone: "neutral" },
              { label: "Total documents", value: applications.reduce((s, a) => s + a.documents.length, 0).toString(), tone: "neutral" },
              { label: "Concentration ratio", value: applications.length ? `${Math.round((applications[0]?.requestedAmount / Math.max(totalExposure, 1)) * 100)}%` : "0%", tone: "neutral" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between rounded-lg border border-line-subtle p-3">
                <span className="text-xs text-muted">{stat.label}</span>
                <Badge tone={stat.tone as "success" | "warning" | "danger" | "neutral"}>{stat.value}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Exposure" title="Application exposure" description="Concentration risk by applicant with risk score overlay.">
        <ExposureList
          applications={applications.map((a) => ({
            id: a.id,
            applicantName: a.applicantName,
            requestedAmount: a.requestedAmount,
            riskScore: a.riskScore,
            decision: a.decision,
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
