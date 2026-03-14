import { UnderwritingApplication } from "@/lib/domain";

export const mockApplications: UnderwritingApplication[] = [
  {
    id: "app_001",
    applicantName: "Elena Brooks",
    product: "Personal Loan",
    requestedAmount: 18000,
    annualIncome: 92000,
    creditScore: 742,
    employmentMonths: 48,
    monthlyDebt: 1200,
    status: "approved",
    riskScore: 87,
    decision: "approve",
    flags: ["Cross-source validation complete"],
    documents: [
      { id: "doc_001", name: "Driver License", type: "identity", status: "verified" },
      { id: "doc_002", name: "Pay Stub - February", type: "income", status: "verified" },
    ],
    submittedAt: "2026-03-12",
    modelVersion: "deterministic-v1",
  },
  {
    id: "app_002",
    applicantName: "Marcus Hall",
    product: "Personal Loan",
    requestedAmount: 32000,
    annualIncome: 68000,
    creditScore: 655,
    employmentMonths: 14,
    monthlyDebt: 2100,
    status: "manual_review",
    riskScore: 63,
    decision: "review",
    flags: ["Debt-to-income above preferred threshold", "Income proof mismatch requires follow-up"],
    documents: [
      { id: "doc_003", name: "Passport", type: "identity", status: "verified" },
      { id: "doc_004", name: "Bank Statement", type: "bank_statement", status: "pending" },
    ],
    submittedAt: "2026-03-13",
    modelVersion: "deterministic-v1",
  },
  {
    id: "app_003",
    applicantName: "Priya Raman",
    product: "Personal Loan",
    requestedAmount: 12000,
    annualIncome: 54000,
    creditScore: 598,
    employmentMonths: 7,
    monthlyDebt: 2300,
    status: "manual_review",
    riskScore: 44,
    decision: "review",
    flags: ["Thin employment history", "High revolving utilization"],
    documents: [
      { id: "doc_005", name: "National ID", type: "identity", status: "verified" },
      { id: "doc_006", name: "Pay Stub - March", type: "income", status: "verified" },
    ],
    submittedAt: "2026-03-14",
    modelVersion: "deterministic-v1",
  },
];

export function getMockApplicationById(id: string) {
  return mockApplications.find((application) => application.id === id);
}

export function getMockPortfolioSummary() {
  return {
    applicationsInFlight: mockApplications.length,
    automatedDecisionRate: 78,
    projectedLossRatio: 4.2,
    factorMix: [
      { name: "Credit quality", weight: 35 },
      { name: "Debt capacity", weight: 25 },
      { name: "Income stability", weight: 20 },
      { name: "Document confidence", weight: 10 },
      { name: "Policy overlays", weight: 10 },
    ],
  };
}
