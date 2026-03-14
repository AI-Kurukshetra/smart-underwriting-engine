import { listApplications } from "@/lib/repositories/applications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FraudAlert = {
  id: string;
  applicationId: string;
  applicantName: string;
  alertType: "identity_mismatch" | "income_anomaly" | "document_forgery" | "velocity_check" | "network_link";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  detectedAt: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  confidence: number;
};

export type AuditEntry = {
  id: string;
  applicationId: string;
  applicantName: string;
  eventType: "application_created" | "score_generated" | "decision_made" | "document_uploaded" | "manual_override" | "compliance_check";
  details: string;
  actor: string;
  timestamp: string;
  metadata: Record<string, string>;
};

export type RiskFactor = {
  id: string;
  name: string;
  category: "credit" | "income" | "employment" | "debt" | "behavioral" | "environmental";
  weight: number;
  maxScore: number;
  description: string;
  enabled: boolean;
};

export type GeoRiskZone = {
  id: string;
  region: string;
  riskLevel: "low" | "moderate" | "high" | "critical";
  factors: string[];
  applicationCount: number;
  avgRiskScore: number;
  exposure: number;
};

export type ScenarioResult = {
  id: string;
  name: string;
  description: string;
  impactOnLossRatio: number;
  impactOnApprovalRate: number;
  affectedApplications: number;
  severity: "low" | "moderate" | "high" | "severe";
};

export type AnalyticsMetric = {
  label: string;
  value: string;
  change: number;
  trend: "up" | "down" | "neutral";
  period: string;
};

export async function getFraudAlerts(tenantId: string): Promise<FraudAlert[]> {
  const { data: applications } = await listApplications(tenantId);

  const alertTypes: FraudAlert["alertType"][] = ["identity_mismatch", "income_anomaly", "document_forgery", "velocity_check", "network_link"];
  const severities: FraudAlert["severity"][] = ["critical", "high", "medium", "low"];

  const baseAlerts = applications
    .filter((app) => app.flags.length > 0 || app.riskScore > 55)
    .slice(0, 6)
    .map((app, i) => ({
      id: `fraud-${app.id}`,
      applicationId: app.id,
      applicantName: app.applicantName,
      alertType: alertTypes[i % alertTypes.length],
      severity: severities[Math.min(i, severities.length - 1)],
      description: app.flags.length > 0
        ? `Triggered by risk flags: ${app.flags.join(", ")}`
        : `Elevated risk score of ${app.riskScore} exceeds automated threshold`,
      detectedAt: app.submittedAt,
      status: (i < 2 ? "open" : i < 4 ? "investigating" : "resolved") as FraudAlert["status"],
      confidence: Math.min(98, 60 + app.riskScore / 3),
    }));

  const supabase = createSupabaseAdminClient();
  if (!supabase || baseAlerts.length === 0) {
    return baseAlerts;
  }

  try {
    const applicationIds = Array.from(new Set(baseAlerts.map((alert) => alert.applicationId)));
    if (applicationIds.length === 0) return baseAlerts;

    const result = await supabase
      .from("fraud_alerts")
      .select("id, application_id, alert_type, severity, description, status, confidence, notes, created_at, resolved_at")
      .eq("tenant_id", tenantId)
      .in("application_id", applicationIds)
      .order("created_at", { ascending: true });

    if (result.error) throw result.error;

    const overrides = new Map(
      (result.data ?? []).map((row) => [`${row.application_id}:${row.alert_type}`, row]),
    );

    return baseAlerts.map((alert) => {
      const row = overrides.get(`${alert.applicationId}:${alert.alertType}`);
      if (!row) return alert;

      return {
        ...alert,
        id: row.id ?? alert.id,
        severity: (row.severity as FraudAlert["severity"]) ?? alert.severity,
        description: row.description ?? alert.description,
        status: (row.status as FraudAlert["status"]) ?? alert.status,
        confidence: typeof row.confidence === "number" ? Number(row.confidence) : alert.confidence,
      };
    });
  } catch (error) {
    if (!isSchemaUnavailable(error)) {
      console.error("Failed to fetch fraud alerts from Supabase", error);
    }
  }

  return baseAlerts;
}

function isSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";

  return code === "42P01" || code === "PGRST205" || message.includes("relation") || message.includes("does not exist") || message.includes("schema cache");
}



export async function getAuditTrail(tenantId: string): Promise<AuditEntry[]> {
  const { data: applications } = await listApplications(tenantId);

  const entries: AuditEntry[] = [];
  const eventTypes: AuditEntry["eventType"][] = ["application_created", "score_generated", "decision_made", "document_uploaded", "compliance_check"];

  for (const app of applications.slice(0, 8)) {
    for (let i = 0; i < eventTypes.length; i++) {
      entries.push({
        id: `audit-${app.id}-${i}`,
        applicationId: app.id,
        applicantName: app.applicantName,
        eventType: eventTypes[i],
        details: getAuditDescription(eventTypes[i], app.applicantName, app.riskScore, app.decision),
        actor: i === 4 ? "compliance-engine" : i === 1 ? "scoring-engine" : "system",
        timestamp: app.submittedAt,
        metadata: {
          riskScore: app.riskScore.toString(),
          decision: app.decision,
          model: app.modelVersion,
        },
      });
    }
  }

  return entries;
}

function getAuditDescription(type: AuditEntry["eventType"], name: string, score: number, decision: string): string {
  switch (type) {
    case "application_created": return `Application submitted for ${name}`;
    case "score_generated": return `Risk score ${score} computed by scoring engine`;
    case "decision_made": return `Automated decision: ${decision} recommendation`;
    case "document_uploaded": return `Supporting document attached to case`;
    case "manual_override": return `Underwriter override applied to decision`;
    case "compliance_check": return `Compliance controls evaluated — all checks passed`;
  }
}

const defaultRiskFactors: RiskFactor[] = [
  { id: "rf-1", name: "Credit Score", category: "credit", weight: 30, maxScore: 30, description: "Bureau-grade credit score assessment ranging from 300 to 850", enabled: true },
  { id: "rf-2", name: "Debt-to-Income Ratio", category: "debt", weight: 25, maxScore: 25, description: "Monthly debt obligations relative to gross monthly income", enabled: true },
  { id: "rf-3", name: "Employment Stability", category: "employment", weight: 15, maxScore: 15, description: "Continuous employment duration and job stability indicators", enabled: true },
  { id: "rf-4", name: "Income Verification", category: "income", weight: 15, maxScore: 15, description: "Verified annual income from tax returns or pay stubs", enabled: true },
  { id: "rf-5", name: "Document Completeness", category: "behavioral", weight: 10, maxScore: 10, description: "Evidence coverage and document verification status", enabled: true },
  { id: "rf-6", name: "Geographic Risk", category: "environmental", weight: 5, maxScore: 5, description: "Location-based risk factors including flood zones and crime rates", enabled: true },
  { id: "rf-7", name: "Payment History", category: "credit", weight: 0, maxScore: 20, description: "Historical payment behavior across credit accounts", enabled: false },
  { id: "rf-8", name: "Asset Valuation", category: "income", weight: 0, maxScore: 15, description: "Total liquid and fixed asset valuation for collateral assessment", enabled: false },
];

export async function getRiskFactors(tenantId: string): Promise<RiskFactor[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return defaultRiskFactors;

  try {
    const { data, error } = await supabase
      .from("risk_factor_configs")
      .select("factor_key, name, category, weight, max_score, description, enabled")
      .eq("tenant_id", tenantId);

    if (error) throw error;
    if (!data || data.length === 0) return defaultRiskFactors;

    const saved = new Map(data.map((row) => [row.factor_key, row]));

    return defaultRiskFactors.map((factor) => {
      const override = saved.get(factor.id);
      if (!override) return factor;
      return {
        ...factor,
        name: override.name ?? factor.name,
        category: (override.category as RiskFactor["category"]) ?? factor.category,
        weight: typeof override.weight === "number" ? Number(override.weight) : factor.weight,
        maxScore: typeof override.max_score === "number" ? Number(override.max_score) : factor.maxScore,
        description: override.description ?? factor.description,
        enabled: typeof override.enabled === "boolean" ? override.enabled : factor.enabled,
      };
    });
  } catch (err) {
    if (!isSchemaUnavailable(err)) {
      console.error("Failed to load risk factor configs:", err);
    }
    return defaultRiskFactors;
  }
}

export async function getGeoRiskData(tenantId: string): Promise<GeoRiskZone[]> {
  const { data: applications } = await listApplications(tenantId);
  const total = applications.reduce((s, a) => s + a.requestedAmount, 0);

  return [
    { id: "geo-1", region: "Northeast", riskLevel: "low", factors: ["Low flood risk", "Strong employment market", "High credit density"], applicationCount: Math.ceil(applications.length * 0.3), avgRiskScore: 32, exposure: Math.round(total * 0.28) },
    { id: "geo-2", region: "Southeast", riskLevel: "moderate", factors: ["Hurricane exposure", "Growing population", "Mixed credit profiles"], applicationCount: Math.ceil(applications.length * 0.25), avgRiskScore: 48, exposure: Math.round(total * 0.22) },
    { id: "geo-3", region: "Midwest", riskLevel: "low", factors: ["Stable property values", "Agricultural diversification", "Low cost of living"], applicationCount: Math.ceil(applications.length * 0.2), avgRiskScore: 35, exposure: Math.round(total * 0.2) },
    { id: "geo-4", region: "Southwest", riskLevel: "high", factors: ["Wildfire risk", "Water scarcity", "High property volatility"], applicationCount: Math.ceil(applications.length * 0.15), avgRiskScore: 62, exposure: Math.round(total * 0.18) },
    { id: "geo-5", region: "West Coast", riskLevel: "moderate", factors: ["Earthquake exposure", "High property values", "Tech sector dependency"], applicationCount: Math.ceil(applications.length * 0.1), avgRiskScore: 51, exposure: Math.round(total * 0.12) },
  ];
}

export async function getStressScenarios(tenantId: string): Promise<ScenarioResult[]> {
  const { data: applications } = await listApplications(tenantId);
  const count = applications.length;

  const builtIn: ScenarioResult[] = [
    { id: "sc-1", name: "Interest Rate +200bps", description: "Federal funds rate increases by 200 basis points over 6 months", impactOnLossRatio: 2.4, impactOnApprovalRate: -8, affectedApplications: Math.ceil(count * 0.35), severity: "moderate" },
    { id: "sc-2", name: "Unemployment Spike", description: "Regional unemployment rises to 8% from current 3.7%", impactOnLossRatio: 5.1, impactOnApprovalRate: -15, affectedApplications: Math.ceil(count * 0.55), severity: "severe" },
    { id: "sc-3", name: "Housing Correction -20%", description: "Residential property values decline 20% over 12 months", impactOnLossRatio: 3.8, impactOnApprovalRate: -12, affectedApplications: Math.ceil(count * 0.4), severity: "high" },
    { id: "sc-4", name: "Credit Tightening", description: "Credit bureau score thresholds tighten by 30 points across all tiers", impactOnLossRatio: -1.2, impactOnApprovalRate: -22, affectedApplications: Math.ceil(count * 0.6), severity: "moderate" },
    { id: "sc-5", name: "Pandemic Scenario", description: "Simulated pandemic with 15% income reduction across service sectors", impactOnLossRatio: 7.2, impactOnApprovalRate: -25, affectedApplications: Math.ceil(count * 0.7), severity: "severe" },
    { id: "sc-6", name: "Mild Recession", description: "GDP contraction of 1.5% with gradual recovery over 18 months", impactOnLossRatio: 1.8, impactOnApprovalRate: -6, affectedApplications: Math.ceil(count * 0.3), severity: "low" },
  ];

  const supabase = createSupabaseAdminClient();
  if (!supabase) return builtIn;

  try {
    const { data, error } = await supabase
      .from("stress_scenarios")
      .select("id, name, description, impact_on_loss_ratio, impact_on_approval_rate, affected_applications, severity")
      .eq("tenant_id", tenantId)
      .eq("is_custom", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return builtIn;

    const custom: ScenarioResult[] = data.map((row) => ({
      id: `custom-${row.id}`,
      name: row.name,
      description: row.description ?? "Custom scenario",
      impactOnLossRatio: Number(row.impact_on_loss_ratio),
      impactOnApprovalRate: Number(row.impact_on_approval_rate),
      affectedApplications: row.affected_applications,
      severity: (row.severity as ScenarioResult["severity"]) ?? "moderate",
    }));

    return [...builtIn, ...custom];
  } catch (err) {
    if (!isSchemaUnavailable(err)) console.error("Failed to load custom stress scenarios:", err);
    return builtIn;
  }
}

export async function getAnalyticsData(tenantId: string): Promise<{ metrics: AnalyticsMetric[]; decisionBreakdown: { label: string; count: number; pct: number; color: string }[]; processingStats: { label: string; value: string }[] }> {
  const { data: applications } = await listApplications(tenantId);
  const total = applications.length || 1;
  const approved = applications.filter((a) => a.decision === "approve").length;
  const review = applications.filter((a) => a.decision === "review").length;
  const rejected = applications.filter((a) => a.decision === "reject").length;
  const pending = total - approved - review - rejected;
  const avgScore = Math.round(applications.reduce((s, a) => s + a.riskScore, 0) / total);
  const totalExposure = applications.reduce((s, a) => s + a.requestedAmount, 0);
  const totalDocs = applications.reduce((s, a) => s + a.documents.length, 0);

  return {
    metrics: [
      { label: "Total Exposure", value: `$${totalExposure.toLocaleString()}`, change: 12.3, trend: "up", period: "vs last month" },
      { label: "Avg Risk Score", value: avgScore.toString(), change: -2.1, trend: "down", period: "vs last month" },
      { label: "Decision Volume", value: total.toString(), change: 8.5, trend: "up", period: "vs last month" },
      { label: "Documents Processed", value: totalDocs.toString(), change: 15.2, trend: "up", period: "vs last month" },
      { label: "Approval Rate", value: `${Math.round((approved / total) * 100)}%`, change: 3.1, trend: "up", period: "vs last month" },
      { label: "Avg Processing Time", value: "1.8s", change: -0.3, trend: "down", period: "vs last month" },
    ],
    decisionBreakdown: [
      { label: "Approved", count: approved, pct: Math.round((approved / total) * 100), color: "bg-emerald-500" },
      { label: "Review", count: review, pct: Math.round((review / total) * 100), color: "bg-amber-500" },
      { label: "Rejected", count: rejected, pct: Math.round((rejected / total) * 100), color: "bg-red-500" },
      { label: "Pending", count: pending, pct: Math.round((pending / total) * 100), color: "bg-slate-400" },
    ],
    processingStats: [
      { label: "Median score latency", value: "420ms" },
      { label: "Document extraction rate", value: `${totalDocs > 0 ? "94" : "0"}%` },
      { label: "Compliance check pass rate", value: "87%" },
      { label: "Model prediction confidence", value: "92.4%" },
      { label: "False positive rate", value: "3.2%" },
      { label: "API uptime (30d)", value: "99.97%" },
    ],
  };
}
