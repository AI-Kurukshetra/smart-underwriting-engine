import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { getFraudAlerts } from "@/lib/repositories/features";
import { FraudAlertPanel } from "@/components/fraud/fraud-alert-panel";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const profile = await requireProfile();
  const alerts = await getFraudAlerts(profile.tenantId);

  const openCount = alerts.filter((a) => a.status === "open").length;
  const investigatingCount = alerts.filter((a) => a.status === "investigating").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;

  return (
    <AppShell
      profile={profile}
      currentPath="/claims"
      eyebrow="Fraud Detection"
      title="Claims & Fraud Detection"
      description="AI-powered pattern recognition to identify potentially fraudulent claims, anomalous behavior, and suspicious activity across applications."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Open alerts</p>
          <p className="mt-2 text-2xl font-bold text-danger">{openCount}</p>
          <p className="mt-1 text-xs text-muted">Require immediate review</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Investigating</p>
          <p className="mt-2 text-2xl font-bold text-warning">{investigatingCount}</p>
          <p className="mt-1 text-xs text-muted">Currently under analysis</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Resolved</p>
          <p className="mt-2 text-2xl font-bold text-success">{resolvedCount}</p>
          <p className="mt-1 text-xs text-muted">Successfully resolved</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Critical / High</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{criticalCount}</p>
          <p className="mt-1 text-xs text-muted">High severity flags</p>
        </div>
      </section>

      <SectionCard eyebrow="Alerts" title="Fraud alert queue" description="Take action on active fraud alerts — investigate, escalate, dismiss, or resolve.">
        <FraudAlertPanel initialAlerts={alerts} />
      </SectionCard>
    </AppShell>
  );
}
