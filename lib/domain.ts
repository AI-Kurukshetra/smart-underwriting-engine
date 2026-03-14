export type DocumentRecord = {
  id: string;
  name: string;
  type: "identity" | "income" | "bank_statement";
  status: "pending" | "verified";
  extractionStatus?: "pending" | "complete" | "failed";
  extractionSummary?: string | null;
  extractedText?: string | null;
};

export type ApplicationStatus = "submitted" | "manual_review" | "approved";
export type DecisionStatus = "pending" | "approve" | "review" | "reject";

export type UnderwritingApplication = {
  id: string;
  applicantName: string;
  product: string;
  requestedAmount: number;
  annualIncome: number;
  creditScore: number;
  employmentMonths: number;
  monthlyDebt: number;
  status: ApplicationStatus;
  riskScore: number;
  decision: DecisionStatus;
  flags: string[];
  documents: DocumentRecord[];
  submittedAt: string;
  modelVersion: string;
};

export type RiskFactorBreakdown = {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
};

export type RiskScoreResult = {
  totalScore: number;
  summary: string;
  reasonCodes: string[];
  factors: RiskFactorBreakdown[];
};

export type WorkflowDecision = {
  status: Exclude<DecisionStatus, "pending">;
  rationale: string;
  nextActions: string[];
};
