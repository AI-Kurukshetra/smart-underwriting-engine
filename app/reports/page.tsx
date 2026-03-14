import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { ReportBuilder } from "@/components/reports/report-builder";
import { requireProfile } from "@/lib/auth/session";
import { getReportsData } from "@/lib/repositories/overview";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await requireProfile();
  const data = await getReportsData(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/reports"
      eyebrow="Reports"
      title="Custom Report Builder"
      description="Build custom reports and dashboards using live underwriting data. Start from a template or add individual widgets."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {data.summaryCards.map((card) => (
          <div key={card.title} className="card-elevated p-5">
            <p className="text-sm font-medium text-muted">{card.title}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.description}</p>
          </div>
        ))}
      </section>

      <SectionCard
        eyebrow="Builder"
        title="Report designer"
        description="Pick a template or add widgets individually. All data is pulled from your live underwriting queue."
      >
        <ReportBuilder
          data={{
            metrics: data.metrics,
            decisions: data.decisions,
            riskBuckets: data.riskBuckets,
            applicationRows: data.applicationRows,
          }}
        />
      </SectionCard>
    </AppShell>
  );
}
