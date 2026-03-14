import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getApplication, listApplications } from "@/lib/repositories/applications";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";
import { generateDecisionExplanation } from "@/lib/ai/explanations";
import type { UnderwritingApplication } from "@/lib/domain";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const url = new URL(request.url);
  const applicationId = url.searchParams.get("applicationId");

  if (applicationId) {
    const application = await getApplication(applicationId, profile.tenantId);
    if (!application) {
      return NextResponse.json({ error: { code: "not_found", message: "Application not found." } }, { status: 404 });
    }

    const score = calculateRealtimeScore(application);
    const decision = evaluateDecision(application, score);
    const explanation = await generateDecisionExplanation(application);

    return NextResponse.json({
      data: { application, score, decision, explanation },
      meta: { version: "v1" },
    });
  }

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
    { label: "0-25 (High Risk)", min: 0, max: 25, count: analyses.filter((a) => a.riskScore <= 25).length },
    { label: "26-50 (Elevated)", min: 26, max: 50, count: analyses.filter((a) => a.riskScore > 25 && a.riskScore <= 50).length },
    { label: "51-75 (Moderate)", min: 51, max: 75, count: analyses.filter((a) => a.riskScore > 50 && a.riskScore <= 75).length },
    { label: "76-100 (Low Risk)", min: 76, max: 100, count: analyses.filter((a) => a.riskScore > 75).length },
  ];

  return NextResponse.json({
    data: {
      analyses,
      aggregate: {
        totalApplications: totalApps,
        approvals,
        reviews,
        rejections,
        approvalRate: totalApps > 0 ? Math.round((approvals / totalApps) * 100) : 0,
        avgRiskScore: totalApps > 0 ? Math.round(analyses.reduce((s, a) => s + a.riskScore, 0) / totalApps) : 0,
      },
      fairnessMetrics,
      scoreDistribution,
    },
    meta: { version: "v1" },
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, overrides } = body;

  if (!applicationId) {
    return NextResponse.json({ error: { code: "bad_request", message: "applicationId is required." } }, { status: 400 });
  }

  const application = await getApplication(applicationId, profile.tenantId);
  if (!application) {
    return NextResponse.json({ error: { code: "not_found", message: "Application not found." } }, { status: 404 });
  }

  const originalScore = calculateRealtimeScore(application);
  const originalDecision = evaluateDecision(application, originalScore);

  const modified: UnderwritingApplication = {
    ...application,
    creditScore: overrides?.creditScore ?? application.creditScore,
    annualIncome: overrides?.annualIncome ?? application.annualIncome,
    monthlyDebt: overrides?.monthlyDebt ?? application.monthlyDebt,
    employmentMonths: overrides?.employmentMonths ?? application.employmentMonths,
    requestedAmount: overrides?.requestedAmount ?? application.requestedAmount,
  };

  const counterfactualScore = calculateRealtimeScore(modified);
  const counterfactualDecision = evaluateDecision(modified, counterfactualScore);

  const factorDeltas = originalScore.factors.map((f, i) => ({
    name: f.name,
    original: f.score,
    counterfactual: counterfactualScore.factors[i].score,
    delta: counterfactualScore.factors[i].score - f.score,
    maxScore: f.maxScore,
  }));

  return NextResponse.json({
    data: {
      original: {
        score: originalScore.totalScore,
        decision: originalDecision.status,
        rationale: originalDecision.rationale,
        factors: originalScore.factors,
        reasonCodes: originalScore.reasonCodes,
      },
      counterfactual: {
        score: counterfactualScore.totalScore,
        decision: counterfactualDecision.status,
        rationale: counterfactualDecision.rationale,
        factors: counterfactualScore.factors,
        reasonCodes: counterfactualScore.reasonCodes,
      },
      deltas: {
        scoreDelta: counterfactualScore.totalScore - originalScore.totalScore,
        decisionChanged: originalDecision.status !== counterfactualDecision.status,
        factorDeltas,
      },
      overridesApplied: overrides,
    },
    meta: { version: "v1" },
  });
}
