import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/auth/session";
import { getRiskFactors } from "@/lib/repositories/features";
import { RiskFactorEditor } from "@/components/risk-factors/risk-factor-editor";

export const dynamic = "force-dynamic";

export default async function RiskFactorsPage() {
  const profile = await requireProfile(["admin", "analyst"]);
  const factors = await getRiskFactors(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/risk-factors"
      eyebrow="Risk Factors"
      title="Custom Risk Factor Configuration"
      description="Define, weight, and manage the risk factors used by the scoring engine. Toggle factors on/off and adjust weights to calibrate the model."
    >
      <RiskFactorEditor initialFactors={factors} />
    </AppShell>
  );
}
