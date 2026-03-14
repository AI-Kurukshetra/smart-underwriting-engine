import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { getWorkflowOverview } from "@/lib/repositories/overview";
import { WorkflowPanel } from "@/components/workflows/workflow-panel";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const profile = await requireProfile();
  const workflow = await getWorkflowOverview(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/workflows"
      eyebrow="Workflows"
      title="Decision Workflows & Routing"
      description="Operational view of stage transitions, review pressure, and intervention points. Manage flagged cases and reassign workflow stages."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {workflow.stages.map((stage) => (
          <div key={stage.label} className="card-elevated p-5">
            <p className="text-sm font-medium text-muted">{stage.label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{stage.count}</p>
            <p className="mt-1 text-xs text-muted">Current queue depth</p>
          </div>
        ))}
      </section>

      <SectionCard
        eyebrow="Review pressure"
        title="Flagged cases"
        description="Applications with review flags. Acknowledge, escalate, or dismiss flags from the scoring layer."
      >
        <WorkflowPanel
          alerts={workflow.alerts}
          initialResolvedFlags={workflow.resolvedFlags}
          initialEscalatedApps={workflow.escalatedApps}
          initialDismissedApps={workflow.dismissedApps}
        />
      </SectionCard>
    </AppShell>
  );
}
