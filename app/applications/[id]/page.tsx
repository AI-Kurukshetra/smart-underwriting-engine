import { notFound } from "next/navigation";
import { ApplicationWorkbench } from "@/components/applications/application-workbench";
import { AppShell } from "@/components/layout/app-shell";
import { generateDecisionExplanation } from "@/lib/ai/explanations";
import { requireProfile } from "@/lib/auth/session";
import { getApplication } from "@/lib/repositories/applications";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const profile = await requireProfile();
  const { id } = await params;
  const application = await getApplication(id, profile.tenantId);

  if (!application) {
    notFound();
  }

  const score = calculateRealtimeScore(application);
  const decision = evaluateDecision(application, score);
  const explanation = await generateDecisionExplanation(application);

  return (
    <AppShell
      profile={profile}
      currentPath="/applications"
      eyebrow="Application detail"
      title={application.applicantName}
      description={`${application.product} - Submitted ${application.submittedAt}`}
    >
      <ApplicationWorkbench
        application={application}
        initialScore={score}
        initialDecision={decision}
        initialExplanation={explanation}
      />
    </AppShell>
  );
}
