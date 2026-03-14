import { RiskFactorBreakdown, RiskScoreResult, UnderwritingApplication } from "@/lib/domain";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getFactorScore(application: UnderwritingApplication): RiskFactorBreakdown[] {
  const debtToIncomeRatio = application.monthlyDebt / Math.max(application.annualIncome / 12, 1);
  const verifiedDocuments = application.documents.filter((document) => document.status === "verified").length;

  return [
    {
      name: "Credit quality",
      score: clamp(Math.round(((application.creditScore - 300) / 550) * 35), 0, 35),
      maxScore: 35,
      weight: 35,
    },
    {
      name: "Debt capacity",
      score: clamp(Math.round((1 - debtToIncomeRatio) * 25), 0, 25),
      maxScore: 25,
      weight: 25,
    },
    {
      name: "Income stability",
      score: clamp(Math.round((application.employmentMonths / 60) * 20), 0, 20),
      maxScore: 20,
      weight: 20,
    },
    {
      name: "Document confidence",
      score: clamp(verifiedDocuments * 5, 0, 10),
      maxScore: 10,
      weight: 10,
    },
    {
      name: "Policy overlays",
      score: application.flags.length > 1 ? 4 : 10,
      maxScore: 10,
      weight: 10,
    },
  ];
}

export function calculateRiskScore(application: UnderwritingApplication): RiskScoreResult {
  const factors = getFactorScore(application);
  const totalScore = factors.reduce((sum, factor) => sum + factor.score, 0);
  const reasonCodes: string[] = [];

  if (application.creditScore < 640) {
    reasonCodes.push("Credit score below preferred threshold.");
  }

  if (application.monthlyDebt / Math.max(application.annualIncome / 12, 1) > 0.4) {
    reasonCodes.push("Debt-to-income ratio exceeds policy comfort zone.");
  }

  if (application.employmentMonths < 12) {
    reasonCodes.push("Employment history is shorter than the standard policy benchmark.");
  }

  if (!reasonCodes.length) {
    reasonCodes.push("Profile aligns with preferred lending band and verified documentation.");
  }

  const summary =
    totalScore >= 75
      ? "Low risk profile with stable repayment capacity."
      : totalScore >= 55
        ? "Moderate risk profile. Additional review recommended before binding."
        : "Elevated risk profile with multiple policy exceptions requiring manual intervention.";

  return {
    totalScore,
    summary,
    reasonCodes,
    factors,
  };
}

