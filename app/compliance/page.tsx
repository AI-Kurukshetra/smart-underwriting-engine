import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { getComplianceOverview } from "@/lib/repositories/overview";
import { CompliancePanel } from "@/components/compliance/compliance-panel";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const profile = await requireProfile(["admin", "underwriter", "analyst", "reviewer"]);
  const compliance = await getComplianceOverview(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/compliance"
      eyebrow="Compliance"
      title="Compliance & Audit Readiness"
      description="Rule-based controls, explainability checks, and operational signals for regulated decisioning."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Total checks</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{compliance.summary.total}</p>
          <p className="mt-1 text-xs text-muted">Across all applications</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Passed</p>
          <p className="mt-2 text-2xl font-bold text-success">{compliance.summary.passed}</p>
          <p className="mt-1 text-xs text-muted">Controls satisfied</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-sm font-medium text-muted">Needs review</p>
          <p className="mt-2 text-2xl font-bold text-warning">{compliance.summary.review}</p>
          <p className="mt-1 text-xs text-muted">Require manual attention</p>
        </div>
      </section>

      <SectionCard
        eyebrow="Application checks"
        title="Per-application control view"
        description="Review compliance status per application. Mark checks as reviewed or flag for further investigation."
      >
        <CompliancePanel
          rows={compliance.rows}
          initialReviewedChecks={compliance.reviewedChecks}
          initialFlaggedApps={compliance.flaggedApps}
        />
      </SectionCard>
    </AppShell>
  );
}
