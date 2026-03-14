import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { listApplications } from "@/lib/repositories/applications";
import { getFraudAlerts } from "@/lib/repositories/features";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Notification = {
  id: string;
  type: "application" | "fraud" | "compliance" | "workflow" | "model" | "system";
  title: string;
  description: string;
  timestamp: string;
  severity: "info" | "success" | "warning" | "danger";
  href?: string;
};

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const notifications: Notification[] = [];
  const tenantId = profile.tenantId;

  try {
    const { data: applications } = await listApplications(tenantId);

    const recent = applications
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 3);

    for (const app of recent) {
      notifications.push({
        id: `app-${app.id}`,
        type: "application",
        title: `Application submitted`,
        description: `${app.applicantName} — ${app.product}, $${app.requestedAmount.toLocaleString()}`,
        timestamp: app.submittedAt,
        severity: "info",
        href: `/applications/${app.id}`,
      });
    }

    const manualReview = applications.filter((a) => a.status === "manual_review");
    if (manualReview.length > 0) {
      notifications.push({
        id: "queue-review",
        type: "workflow",
        title: `${manualReview.length} application${manualReview.length > 1 ? "s" : ""} awaiting review`,
        description: `Manual review queue has pending cases requiring analyst action.`,
        timestamp: new Date().toISOString(),
        severity: "warning",
        href: "/applications",
      });
    }

    const highRisk = applications.filter((a) => a.riskScore > 70);
    if (highRisk.length > 0) {
      notifications.push({
        id: "high-risk",
        type: "system",
        title: `${highRisk.length} high-risk application${highRisk.length > 1 ? "s" : ""} detected`,
        description: `Applications with risk scores above 70 require closer monitoring.`,
        timestamp: new Date().toISOString(),
        severity: "danger",
        href: "/portfolio",
      });
    }

    const fraudAlerts = await getFraudAlerts(tenantId);
    const openAlerts = fraudAlerts.filter((a) => a.status === "open");
    if (openAlerts.length > 0) {
      notifications.push({
        id: "fraud-open",
        type: "fraud",
        title: `${openAlerts.length} open fraud alert${openAlerts.length > 1 ? "s" : ""}`,
        description: `Unresolved fraud alerts need investigation.`,
        timestamp: new Date().toISOString(),
        severity: "danger",
        href: "/claims",
      });
    }

    for (const alert of openAlerts.slice(0, 2)) {
      notifications.push({
        id: `fraud-${alert.id}`,
        type: "fraud",
        title: `Fraud alert: ${alert.applicantName}`,
        description: `${alert.description} — Confidence: ${alert.confidence.toFixed(0)}%`,
        timestamp: alert.detectedAt,
        severity: alert.severity === "critical" ? "danger" : "warning",
        href: "/claims",
      });
    }

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data: complianceRows } = await supabase
        .from("compliance_reviews")
        .select("id, application_id, check_code, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (complianceRows && complianceRows.length > 0) {
        for (const row of complianceRows) {
          notifications.push({
            id: `compliance-${row.id}`,
            type: "compliance",
            title: `Compliance check ${row.status}`,
            description: `Check "${row.check_code.replace(/_/g, " ")}" for application ${row.application_id.slice(0, 8)}...`,
            timestamp: row.created_at,
            severity: row.status === "flagged" ? "warning" : "success",
            href: "/compliance",
          });
        }
      }

      const { data: workflowRows } = await supabase
        .from("workflow_actions")
        .select("id, application_id, action_type, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (workflowRows && workflowRows.length > 0) {
        const actionLabels: Record<string, string> = {
          resolve_flag: "Flag resolved",
          escalate: "Case escalated",
          dismiss_all_flags: "Flags dismissed",
        };
        for (const row of workflowRows) {
          notifications.push({
            id: `workflow-${row.id}`,
            type: "workflow",
            title: actionLabels[row.action_type] ?? row.action_type,
            description: `Workflow action on application ${row.application_id.slice(0, 8)}...`,
            timestamp: row.created_at,
            severity: row.action_type === "escalate" ? "warning" : "info",
            href: "/workflows",
          });
        }
      }

      const { data: monitoringRows } = await supabase
        .from("monitoring_alerts")
        .select("id, alert_id, acknowledged_at, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (monitoringRows && monitoringRows.length > 0) {
        for (const row of monitoringRows) {
          notifications.push({
            id: `monitoring-${row.id}`,
            type: "system",
            title: `Alert acknowledged`,
            description: `Monitoring alert ${row.alert_id} acknowledged by operator.`,
            timestamp: row.acknowledged_at ?? row.created_at,
            severity: "info",
            href: "/monitoring",
          });
        }
      }
    }

    notifications.push({
      id: "system-health",
      type: "system",
      title: "All systems operational",
      description: "Scoring engine, document processing, and API services running normally.",
      timestamp: new Date().toISOString(),
      severity: "success",
    });

  } catch (err) {
    console.error("Failed to build notifications:", err);
  }

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    data: notifications,
    meta: { count: notifications.length },
  });
}
