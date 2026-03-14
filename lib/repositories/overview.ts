import { runComplianceChecks } from "@/lib/compliance/checks";
import { listApplications } from "@/lib/repositories/applications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "PGRST205" || message.includes("relation") || message.includes("does not exist") || message.includes("schema cache");
}

export async function getDashboardOverview(tenantId: string) {
  const { data: applications } = await listApplications(tenantId);
  const manualReview = applications.filter((application) => application.status === "manual_review");
  const extractionComplete = applications.flatMap((application) => application.documents).filter((document) => document.extractionStatus === "complete").length;
  const extractionFailed = applications.flatMap((application) => application.documents).filter((document) => document.extractionStatus === "failed").length;
  const totalDocuments = applications.flatMap((application) => application.documents).length;

  return {
    applications,
    metrics: [
      { label: "Applications in queue", value: applications.length.toString(), note: "Active underwriting workload" },
      { label: "Manual review cases", value: manualReview.length.toString(), note: "Cases requiring analyst intervention" },
      { label: "Document extractions", value: `${extractionComplete}/${Math.max(totalDocuments, 1)}`, note: extractionFailed ? `${extractionFailed} extraction failures need attention` : "Extraction pipeline healthy" },
      { label: "Auto decision rate", value: `${Math.round((applications.filter((item) => item.decision === "approve").length / Math.max(applications.length, 1)) * 100)}%`, note: "Based on current portfolio mix" },
    ],
  };
}

export async function getComplianceOverview(tenantId: string) {
  const { data: applications } = await listApplications(tenantId);
  const rows = applications.map((application) => ({
    applicationId: application.id,
    applicantName: application.applicantName,
    checks: runComplianceChecks(application),
  }));

  let reviewedChecks: string[] = [];
  let flaggedApps: string[] = [];

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("compliance_reviews")
        .select("application_id, check_code, status, flagged")
        .eq("tenant_id", tenantId);

      if (!error && data) {
        reviewedChecks = data
          .filter((r) => r.status === "reviewed")
          .map((r) => `${r.application_id}:${r.check_code}`);
        flaggedApps = data
          .filter((r) => r.check_code === "application_flag" && r.flagged === true)
          .map((r) => r.application_id);
      }
    } catch (err) {
      if (!isSchemaUnavailable(err)) console.error("Failed to load compliance reviews:", err);
    }
  }

  const totalChecks = rows.flatMap((row) => row.checks);
  const passed = totalChecks.filter((check) => check.status === "pass").length;
  const review = totalChecks.filter((check) => check.status === "review").length;

  return {
    rows,
    reviewedChecks,
    flaggedApps,
    summary: {
      passed,
      review,
      total: totalChecks.length,
    },
  };
}

export async function getWorkflowOverview(tenantId: string) {
  const { data: applications } = await listApplications(tenantId);

  let resolvedFlags: Record<string, string[]> = {};
  let escalatedApps: string[] = [];
  let dismissedApps: string[] = [];

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workflow_actions")
        .select("application_id, action_type, flag")
        .eq("tenant_id", tenantId);

      if (!error && data) {
        for (const row of data) {
          if (row.action_type === "resolve_flag" && row.flag) {
            if (!resolvedFlags[row.application_id]) resolvedFlags[row.application_id] = [];
            resolvedFlags[row.application_id].push(row.flag);
          } else if (row.action_type === "escalate") {
            escalatedApps.push(row.application_id);
          } else if (row.action_type === "dismiss_all_flags") {
            dismissedApps.push(row.application_id);
          }
        }
      }
    } catch (err) {
      if (!isSchemaUnavailable(err)) console.error("Failed to load workflow actions:", err);
    }
  }

  return {
    stages: [
      { label: "Submitted", count: applications.filter((application) => application.status === "submitted").length, color: "text-accent" },
      { label: "Manual review", count: applications.filter((application) => application.status === "manual_review").length, color: "text-warning" },
      { label: "Approved", count: applications.filter((application) => application.status === "approved").length, color: "text-success" },
    ],
    alerts: applications
      .filter((application) => application.flags.length)
      .map((application) => ({
        applicationId: application.id,
        applicantName: application.applicantName,
        flags: application.flags,
      })),
    resolvedFlags,
    escalatedApps,
    dismissedApps,
  };
}

const defaultModels = [
  {
    name: "policy-engine-v1",
    kind: "Champion",
    coverage: "Credit quality, debt capacity, stability, and evidence confidence.",
    status: "active",
  },
  {
    name: "document-intelligence-v1",
    kind: "Document AI",
    coverage: "OCR text, summary, and key underwriting facts.",
    status: "active",
  },
  {
    name: "challenger-risk-v2",
    kind: "Challenger",
    coverage: "Reserved for future champion-challenger experiments.",
    status: "planned",
  },
];

export async function getModelOverview(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return defaultModels;

  try {
    const { data, error } = await supabase
      .from("model_configs")
      .select("model_name, model_kind, status, coverage")
      .eq("tenant_id", tenantId);

    if (error) throw error;
    if (!data || data.length === 0) return defaultModels;

    const saved = new Map(data.map((row) => [row.model_name, row]));

    return defaultModels.map((model) => {
      const override = saved.get(model.name);
      if (!override) return model;
      return {
        ...model,
        kind: override.model_kind ?? model.kind,
        status: override.status ?? model.status,
        coverage: override.coverage ?? model.coverage,
      };
    });
  } catch (err) {
    if (!isSchemaUnavailable(err)) console.error("Failed to load model configs:", err);
    return defaultModels;
  }
}

const defaultAlertHistory = [
  { id: "alert-1", message: "Document extraction latency exceeded 5s threshold", severity: "warning", timestamp: "2 hours ago", acknowledged: false },
  { id: "alert-2", message: "Risk scoring engine response time spike detected", severity: "info", timestamp: "5 hours ago", acknowledged: true },
  { id: "alert-3", message: "API error rate for /explanation exceeded 1%", severity: "warning", timestamp: "1 day ago", acknowledged: true },
  { id: "alert-4", message: "System health check passed — all services operational", severity: "success", timestamp: "1 day ago", acknowledged: true },
];

export async function getMonitoringOverview(tenantId: string) {
  const { data: applications } = await listApplications(tenantId);
  const documents = applications.flatMap((application) => application.documents);

  let alerts = defaultAlertHistory;

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("monitoring_alerts")
        .select("id, message, severity, acknowledged, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        const savedMap = new Map(data.map((row) => [row.message, row]));

        alerts = defaultAlertHistory.map((alert) => {
          const override = savedMap.get(alert.message);
          if (!override) return alert;
          return {
            ...alert,
            id: override.id ?? alert.id,
            acknowledged: override.acknowledged ?? alert.acknowledged,
          };
        });
      }
    } catch (err) {
      if (!isSchemaUnavailable(err)) console.error("Failed to load monitoring alerts:", err);
    }
  }

  return {
    cards: [
      { label: "Scoring engine", status: "healthy", note: "Decision scoring is responding within the operating workflow." },
      { label: "Document intelligence", status: documents.some((doc) => doc.extractionStatus === "failed") ? "warning" : "healthy", note: documents.some((doc) => doc.extractionStatus === "failed") ? "Some extraction failures detected." : "Recent uploads processed successfully." },
      { label: "Decision workflow", status: "healthy", note: "Decision recommendations are being produced for all applications." },
      { label: "Compliance checks", status: "healthy", note: "Rule-based compliance checks are available per application." },
    ],
    alerts,
  };
}

export async function getReportsData(tenantId: string) {
  const { data: applications } = await listApplications(tenantId);
  const total = applications.length || 1;
  const approved = applications.filter((a) => a.decision === "approve").length;
  const review = applications.filter((a) => a.decision === "review").length;
  const rejected = applications.filter((a) => a.decision === "reject").length;
  const avgScore = Math.round(applications.reduce((s, a) => s + a.riskScore, 0) / total);
  const totalExposure = applications.reduce((s, a) => s + a.requestedAmount, 0);
  const totalDocs = applications.reduce((s, a) => s + a.documents.length, 0);
  const manualReview = applications.filter((a) => a.status === "manual_review").length;
  const avgDebt = Math.round(applications.reduce((s, a) => s + a.monthlyDebt, 0) / total);
  const avgIncome = Math.round(applications.reduce((s, a) => s + a.annualIncome, 0) / total);

  return {
    summaryCards: [
      { title: "Portfolio concentration", value: `$${totalExposure.toLocaleString()}`, description: "Total exposure across all active applications" },
      { title: "Average risk score", value: avgScore.toString(), description: "Blended risk score across the portfolio" },
      { title: "Documents per app", value: applications.length ? (totalDocs / applications.length).toFixed(1) : "0.0", description: "Average evidence coverage" },
    ],
    metrics: {
      totalApplications: total,
      approvalRate: Math.round((approved / total) * 100),
      avgRiskScore: avgScore,
      totalExposure,
      totalDocuments: totalDocs,
      manualReviewRate: Math.round((manualReview / total) * 100),
      avgMonthlyDebt: avgDebt,
      avgAnnualIncome: avgIncome,
    },
    decisions: {
      approved,
      review,
      rejected,
      pending: total - approved - review - rejected,
    },
    riskBuckets: [
      { label: "Low (0–30)", count: applications.filter((a) => a.riskScore <= 30).length, color: "bg-emerald-500" },
      { label: "Moderate (31–60)", count: applications.filter((a) => a.riskScore > 30 && a.riskScore <= 60).length, color: "bg-amber-400" },
      { label: "High (61–80)", count: applications.filter((a) => a.riskScore > 60 && a.riskScore <= 80).length, color: "bg-orange-500" },
      { label: "Critical (81–100)", count: applications.filter((a) => a.riskScore > 80).length, color: "bg-red-500" },
    ],
    applicationRows: applications.map((a) => ({
      id: a.id,
      name: a.applicantName,
      score: a.riskScore,
      amount: a.requestedAmount,
      decision: a.decision,
      status: a.status,
      flags: a.flags.length,
      docs: a.documents.length,
    })),
  };
}

export async function getReportsOverview(tenantId: string) {
  const data = await getReportsData(tenantId);
  return { reports: data.summaryCards };
}

export function getIntegrationsOverview() {
  return {
    integrations: [
      { name: "Identity and access", status: "connected", note: "Operator authentication and workspace access controls." },
      { name: "Document vault", status: "connected", note: "Secure storage for borrower records and underwriting files." },
      { name: "Document intelligence", status: "connected", note: "Automated extraction and narrative support for uploaded evidence." },
      { name: "External bureau connector", status: "planned", note: "Reserved for credit bureau and vendor enrichment." },
    ],
    apiGroups: [
      "/auth",
      "/applications",
      "/risk-assessment",
      "/decisions",
      "/compliance",
      "/portfolio",
      "/monitoring",
      "/reports",
    ],
  };
}
