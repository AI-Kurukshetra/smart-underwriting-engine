import { AppShell } from "@/components/layout/app-shell";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { requireProfile } from "@/lib/auth/session";
import { getAuditTrail } from "@/lib/repositories/features";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const profile = await requireProfile();
  const entries = await getAuditTrail(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/audit"
      eyebrow="Audit Trail"
      title="Decision Audit Trail"
      description="Complete audit logging of all underwriting decisions with explainability features for regulatory compliance and operational transparency."
    >
      <AuditTimeline entries={entries} />
    </AppShell>
  );
}
