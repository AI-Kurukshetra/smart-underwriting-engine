import { ApplicationIntakeForm } from "@/components/dashboard/application-intake-form";
import { SectionCard } from "@/components/dashboard/section-card";
import { AppShell } from "@/components/layout/app-shell";
import { ApplicationQueue } from "@/components/applications/application-queue";
import { requireProfile } from "@/lib/auth/session";
import { listApplications } from "@/lib/repositories/applications";

export default async function ApplicationsPage() {
  const profile = await requireProfile();
  const { data: applications, mode } = await listApplications(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/applications"
      eyebrow="Applications"
      title="Underwriting Queue & Intake"
      description="Create applications, review active cases, upload documents, and route edge cases into manual review."
      badgeTone="info"
    >
      <SectionCard
        eyebrow="Intake"
        title="New applicant intake"
        description="Capture borrower details, score the case, and push it into the live queue."
      >
        <ApplicationIntakeForm />
      </SectionCard>
      <SectionCard
        eyebrow="Queue"
        title="Active applications"
        description="Search, filter, and prioritize the underwriting workload."
      >
        <ApplicationQueue applications={applications} mode={mode} />
      </SectionCard>
    </AppShell>
  );
}
