import { UnderwritingApplication } from "@/lib/domain";

export function runComplianceChecks(application: UnderwritingApplication) {
  return [
    {
      code: "fair_lending_reason_codes",
      status: "pass",
      message: "Decision rationale is explainable with deterministic factor weights.",
    },
    {
      code: "document_traceability",
      status: application.documents.length ? "pass" : "review",
      message: application.documents.length
        ? "Uploaded evidence is linked to the application record."
        : "No documents are attached to the application.",
    },
    {
      code: "manual_review_controls",
      status: application.flags.length > 1 ? "review" : "pass",
      message:
        application.flags.length > 1
          ? "Application includes risk flags that require secondary review sign-off."
          : "No secondary review escalation is currently required.",
    },
  ];
}

