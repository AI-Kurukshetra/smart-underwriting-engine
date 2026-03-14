import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getFraudAlerts } from "@/lib/repositories/features";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const alerts = await getFraudAlerts(profile.tenantId);
  return NextResponse.json({ data: alerts, meta: { version: "v1", count: alerts.length } });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  let body: { alertId: string; action: string; notes?: string; applicationId?: string; alertType?: string; severity?: string; description?: string; confidence?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON body." } }, { status: 400 });
  }

  const validActions = ["investigate", "dismiss", "resolve", "escalate"];
  if (!validActions.includes(body.action)) {
    return NextResponse.json({ error: { code: "bad_request", message: `Invalid action. Must be one of: ${validActions.join(", ")}` } }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    investigate: "investigating",
    dismiss: "dismissed",
    resolve: "resolved",
    escalate: "investigating",
  };

  const newStatus = statusMap[body.action];
  const now = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  if (supabase && body.applicationId && body.alertType) {
    try {
      const { data: existing } = await supabase
        .from("fraud_alerts")
        .select("id")
        .eq("tenant_id", profile.tenantId)
        .eq("application_id", body.applicationId)
        .eq("alert_type", body.alertType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("fraud_alerts")
          .update({
            status: newStatus,
            notes: body.notes || null,
            resolved_by: (body.action === "resolve" || body.action === "dismiss") ? profile.id : null,
            resolved_at: (body.action === "resolve" || body.action === "dismiss") ? now : null,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("fraud_alerts")
          .insert({
            tenant_id: profile.tenantId,
            application_id: body.applicationId,
            alert_type: body.alertType,
            severity: body.severity ?? "medium",
            description: body.description ?? null,
            status: newStatus,
            confidence: body.confidence ?? 0,
            notes: body.notes || null,
            resolved_by: (body.action === "resolve" || body.action === "dismiss") ? profile.id : null,
            resolved_at: (body.action === "resolve" || body.action === "dismiss") ? now : null,
          });
      }
    } catch (err) {
      console.error("Failed to persist fraud alert action:", err);
    }
  }

  return NextResponse.json({
    data: {
      alertId: body.alertId,
      action: body.action,
      newStatus,
      notes: body.notes || null,
      timestamp: now,
      actor: profile.fullName,
    },
    meta: { version: "v1" },
  });
}
