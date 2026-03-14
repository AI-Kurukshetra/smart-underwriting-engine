import { AppShell } from "@/components/layout/app-shell";
import { ExplainabilityEngine } from "@/components/explainability/explainability-engine";
import { requireProfile } from "@/lib/auth/session";
import { listApplications } from "@/lib/repositories/applications";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";

export const dynamic = "force-dynamic";

export default async function ExplainabilityPage() {
  const profile = await requireProfile();
  const { data: applications } = await listApplications(profile.tenantId);

  const analyses = applications.map((app) => {
    const score = calculateRealtimeScore(app);
    const decision = evaluateDecision(app, score);
    return {
      id: app.id,
      applicantName: app.applicantName,
      product: app.product,
      creditScore: app.creditScore,
      annualIncome: app.annualIncome,
      monthlyDebt: app.monthlyDebt,
      employmentMonths: app.employmentMonths,
      requestedAmount: app.requestedAmount,
      riskScore: score.totalScore,
      decision: decision.status,
      factors: score.factors,
      sources: score.sources,
      reasonCodes: score.reasonCodes,
      flags: app.flags,
    };
  });

  const totalApps = analyses.length;
  const approvals = analyses.filter((a) => a.decision === "approve").length;
  const reviews = analyses.filter((a) => a.decision === "review").length;
  const rejections = analyses.filter((a) => a.decision === "reject").length;

  const creditBands = [
    { label: "300-579 (Poor)", min: 300, max: 579 },
    { label: "580-669 (Fair)", min: 580, max: 669 },
    { label: "670-739 (Good)", min: 670, max: 739 },
    { label: "740-799 (Very Good)", min: 740, max: 799 },
    { label: "800-850 (Excellent)", min: 800, max: 850 },
  ];

  const fairnessMetrics = creditBands.map((band) => {
    const inBand = analyses.filter((a) => a.creditScore >= band.min && a.creditScore <= band.max);
    const bandApprovals = inBand.filter((a) => a.decision === "approve").length;
    return {
      band: band.label,
      total: inBand.length,
      approved: bandApprovals,
      approvalRate: inBand.length > 0 ? Math.round((bandApprovals / inBand.length) * 100) : 0,
      avgScore: inBand.length > 0 ? Math.round(inBand.reduce((s, a) => s + a.riskScore, 0) / inBand.length) : 0,
    };
  });

  const scoreDistribution = [
    { label: "0-25 (High Risk)", count: analyses.filter((a) => a.riskScore <= 25).length },
    { label: "26-50 (Elevated)", count: analyses.filter((a) => a.riskScore > 25 && a.riskScore <= 50).length },
    { label: "51-75 (Moderate)", count: analyses.filter((a) => a.riskScore > 50 && a.riskScore <= 75).length },
    { label: "76-100 (Low Risk)", count: analyses.filter((a) => a.riskScore > 75).length },
  ];

  const aggregate = {
    totalApplications: totalApps,
    approvals,
    reviews,
    rejections,
    approvalRate: totalApps > 0 ? Math.round((approvals / totalApps) * 100) : 0,
    avgRiskScore: totalApps > 0 ? Math.round(analyses.reduce((s, a) => s + a.riskScore, 0) / totalApps) : 0,
  };

  return (
    <AppShell
      profile={profile}
      currentPath="/explainability"
      eyebrow="Explainability"
      title="Explainable AI Engine"
      description="Advanced interpretability tools providing human-readable explanations for AI decisions. Analyze factor attribution, run counterfactual scenarios, audit data sources, and verify regulatory compliance."
    >
      <ExplainabilityEngine
        initialAnalyses={analyses}
        aggregate={aggregate}
        fairnessMetrics={fairnessMetrics}
        scoreDistribution={scoreDistribution}
      />
    </AppShell>
  );
}
