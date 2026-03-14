import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getApplication } from "@/lib/repositories/applications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

const validActions = ["approve", "reject", "request_docs", "escalate"] as const;
type ActionType = (typeof validActions)[number];

function getStatusForAction(action: ActionType) {
  switch (action) {
    case "approve": return "approved";
    case "reject": return "submitted";
    case "request_docs": return "manual_review";
    case "escalate": return "manual_review";
  }
}

function getDecisionForAction(action: ActionType) {
  switch (action) {
    case "approve": return "approve";
    case "reject": return "reject";
    case "request_docs": return "review";
    case "escalate": return "review";
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const { id } = await params;
  const application = await getApplication(id, profile.tenantId);
  if (!application) {
    return NextResponse.json({ error: { code: "not_found", message: "Application not found." } }, { status: 404 });
  }

  let body: { action: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON body." } }, { status: 400 });
  }

  const action = body.action as ActionType;
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: { code: "bad_request", message: `Invalid action. Must be one of: ${validActions.join(", ")}` } }, { status: 400 });
  }

  const newStatus = getStatusForAction(action);
  const newDecision = getDecisionForAction(action);

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    try {
      await Promise.all([
        supabase.from("applications").update({ status: newStatus }).eq("id", id),
        supabase.from("decisions").insert({
          tenant_id: profile.tenantId,
          application_id: id,
          status: newDecision,
          rationale: body.notes || `Manual ${action} by underwriter`,
          reason_codes: [`underwriter_${action}`],
        }),
        supabase.from("audit_logs").insert({
          tenant_id: profile.tenantId,
          application_id: id,
          event_type: "manual_override",
          actor_id: profile.id,
          payload: { action, notes: body.notes, previousDecision: application.decision, newDecision, actor: profile.fullName },
        }),
      ]);
    } catch (error) {
      console.error("Failed to persist underwriter action", error);
    }
  }

  return NextResponse.json({
    data: {
      applicationId: id,
      action,
      previousDecision: application.decision,
      newDecision,
      newStatus,
      notes: body.notes || null,
      timestamp: new Date().toISOString(),
      actor: profile.fullName,
    },
    meta: { version: "v1" },
  });
}
