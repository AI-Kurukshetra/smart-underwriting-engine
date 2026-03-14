import Link from "next/link";
import { ArrowRight, ShieldCheck, FileText, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { QueuePreview } from "@/components/dashboard/queue-preview";
import { ModuleGrid } from "@/components/dashboard/module-grid";
import { SystemHealth } from "@/components/dashboard/system-health";
import { RiskDistribution } from "@/components/dashboard/risk-distribution";
import { requireProfile } from "@/lib/auth/session";
import { getDashboardOverview, getMonitoringOverview } from "@/lib/repositories/overview";

export default async function Home() {
  const profile = await requireProfile();
  const overview = await getDashboardOverview(profile.tenantId);
  const monitoring = await getMonitoringOverview(profile.tenantId);

  const metricIcons = [
    <Users key="users" className="h-4 w-4" />,
    <ShieldCheck key="shield" className="h-4 w-4" />,
    <FileText key="file" className="h-4 w-4" />,
    <TrendingUp key="trend" className="h-4 w-4" />,
  ];

  return (
    <AppShell
      profile={profile}
      currentPath="/"
      eyebrow="Dashboard"
      title="Command Center"
      description="Real-time overview of underwriting operations, queue pressure, and platform health across your organization."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.metrics.map((metric, i) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.note}
            icon={metricIcons[i] ?? <ShieldCheck className="h-4 w-4" />}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard
          eyebrow="Queue"
          title="Applications needing attention"
          description="Highest-priority cases sorted by intervention urgency."
          className="xl:col-span-3"
          action={
            <Link
              href="/applications"
              className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
            <QueuePreview applications={overview.applications} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Risk"
          title="Score distribution"
          description="Portfolio risk breakdown by score band."
          className="xl:col-span-2"
        >
          <RiskDistribution applications={overview.applications} />
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Platform"
        title="Module navigation"
        description="Quick access to all operating surfaces."
      >
        <ModuleGrid />
      </SectionCard>

      <SectionCard
        eyebrow="Operations"
        title="System health"
        description="Live status of platform subsystems and data pipelines."
      >
        <SystemHealth items={monitoring.cards} />
      </SectionCard>
    </AppShell>
  );
}
