import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/auth/session";
import { getStressScenarios } from "@/lib/repositories/features";
import { StressTestRunner } from "@/components/stress-testing/stress-test-runner";

export const dynamic = "force-dynamic";

export default async function StressTestingPage() {
  const profile = await requireProfile(["admin", "analyst"]);
  const scenarios = await getStressScenarios(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/stress-testing"
      eyebrow="Stress Testing"
      title="Stress Testing & Scenario Modeling"
      description="Model portfolio performance under various economic scenarios. Run simulations, adjust parameters, and assess resilience."
    >
      <StressTestRunner initialScenarios={scenarios} />
    </AppShell>
  );
}
