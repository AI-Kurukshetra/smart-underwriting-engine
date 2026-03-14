import { RiskFactorBreakdown, RiskScoreResult, UnderwritingApplication } from "@/lib/domain";

type SourceSignal = {
  name: string;
  score: number;
  weight: number;
  confidence: "high" | "medium" | "low";
  summary: string;
};

type RealtimeScoreResult = RiskScoreResult & {
  sources: SourceSignal[];
  generatedAt: string;
  modelVersion: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function calculateFactors(application: UnderwritingApplication, rand: () => number) {
  const debtToIncomeRatio = application.monthlyDebt / Math.max(application.annualIncome / 12, 1);
  const verifiedDocuments = application.documents.filter((document) => document.status === "verified").length;

  const creditScore = clamp(Math.round(((application.creditScore - 300) / 550) * 35), 0, 35);
  const cashflowScore = clamp(Math.round((1 - debtToIncomeRatio) * 20), 0, 20);
  const employmentScore = clamp(Math.round((application.employmentMonths / 60) * 15), 0, 15);
  const documentScore = clamp(verifiedDocuments * 4, 0, 10);
  const deviceRiskScore = clamp(Math.round((1 - rand()) * 10), 0, 10);
  const behavioralScore = clamp(Math.round((0.6 + rand() * 0.4) * 10), 0, 10);

  const factors: RiskFactorBreakdown[] = [
    { name: "Credit bureau", score: creditScore, maxScore: 35, weight: 35 },
    { name: "Bank cashflow", score: cashflowScore, maxScore: 20, weight: 20 },
    { name: "Employment stability", score: employmentScore, maxScore: 15, weight: 15 },
    { name: "Document integrity", score: documentScore, maxScore: 10, weight: 10 },
    { name: "Device risk", score: deviceRiskScore, maxScore: 10, weight: 10 },
    { name: "Behavioral signals", score: behavioralScore, maxScore: 10, weight: 10 },
  ];

  const sources: SourceSignal[] = [
    {
      name: "Credit bureau",
      score: creditScore,
      weight: 35,
      confidence: application.creditScore >= 650 ? "high" : "medium",
      summary: `Credit score ${application.creditScore} with bureau band weighting.`,
    },
    {
      name: "Bank cashflow",
      score: cashflowScore,
      weight: 20,
      confidence: debtToIncomeRatio < 0.4 ? "high" : "medium",
      summary: `Debt ratio ${(debtToIncomeRatio * 100).toFixed(0)}% from income and debt streams.`,
    },
    {
      name: "Employment stability",
      score: employmentScore,
      weight: 15,
      confidence: application.employmentMonths >= 24 ? "high" : "medium",
      summary: `${application.employmentMonths} months of continuous employment.`,
    },
    {
      name: "Document integrity",
      score: documentScore,
      weight: 10,
      confidence: verifiedDocuments > 0 ? "high" : "low",
      summary: `${verifiedDocuments} verified documents in the evidence pack.`,
    },
    {
      name: "Device risk",
      score: deviceRiskScore,
      weight: 10,
      confidence: "medium",
      summary: "Placeholder device and fraud fingerprint risk signal.",
    },
    {
      name: "Behavioral signals",
      score: behavioralScore,
      weight: 10,
      confidence: "medium",
      summary: "Placeholder behavioral and internal history signal.",
    },
  ];

  return { factors, sources };
}

export function calculateRealtimeScore(application: UnderwritingApplication): RealtimeScoreResult {
  const seed = hashString(application.id || application.applicantName);
  const rand = mulberry32(seed);
  const { factors, sources } = calculateFactors(application, rand);
  const totalScore = factors.reduce((sum, factor) => sum + factor.score, 0);
  const reasonCodes: string[] = [];

  if (application.creditScore < 640) {
    reasonCodes.push("Credit score below preferred threshold.");
  }

  const debtRatio = application.monthlyDebt / Math.max(application.annualIncome / 12, 1);
  if (debtRatio > 0.4) {
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
    sources,
    generatedAt: new Date().toISOString(),
    modelVersion: "rt-ml-placeholder-v1",
  };
}
