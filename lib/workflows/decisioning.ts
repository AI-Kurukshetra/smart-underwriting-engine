import { RiskScoreResult, UnderwritingApplication, WorkflowDecision } from "@/lib/domain";

export function evaluateDecision(
  application: UnderwritingApplication,
  score: RiskScoreResult,
): WorkflowDecision {
  if (score.totalScore >= 75 && application.creditScore >= 680 && application.flags.length < 2) {
    return {
      status: "approve",
      rationale: "Application satisfies score, credit, and documentation thresholds for straight-through approval.",
      nextActions: [
        "Generate approval disclosure package.",
        "Push final terms to borrower communication workflow.",
        "Write final decision record to audit ledger.",
      ],
    };
  }

  if (score.totalScore >= 50) {
    return {
      status: "review",
      rationale: "Application is economically viable but requires analyst review due to policy exceptions or missing corroboration.",
      nextActions: [
        "Request additional income or bank statement verification.",
        "Route to manual review queue with reason codes attached.",
        "Capture underwriter override if final decision differs from score recommendation.",
      ],
    };
  }

  return {
    status: "reject",
    rationale: "Application falls below minimum score guardrails and is not eligible for automatic approval or policy-based escalation.",
    nextActions: [
      "Produce adverse action reason summary.",
      "Store decision payload and compliance snapshot.",
      "Notify applicant through outbound communications service.",
    ],
  };
}

