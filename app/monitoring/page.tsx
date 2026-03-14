import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { SystemHealth } from "@/components/dashboard/system-health";
import { requireProfile } from "@/lib/auth/session";
import { getMonitoringOverview } from "@/lib/repositories/overview";
import { MonitoringDashboard } from "@/components/monitoring/monitoring-dashboard";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const profile = await requireProfile();
  const monitoring = await getMonitoringOverview(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/monitoring"
      eyebrow="Monitoring"
      title="Operational Monitoring"
      description="Service health, performance metrics, API response times, and alert management for the underwriting pipeline."
    >
      <SectionCard eyebrow="Health" title="System status" description="Real-time service health across platform components.">
        <SystemHealth items={monitoring.cards} />
      </SectionCard>

      <MonitoringDashboard initialAlerts={monitoring.alerts} />
    </AppShell>
  );
}
