import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  let body: { table: string; action: string; data: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON." } }, { status: 400 });
  }

  const allowedTables = [
    "fraud_alerts", "risk_factor_configs", "compliance_reviews",
    "workflow_actions", "model_configs", "stress_scenarios",
    "monitoring_alerts", "saved_reports",
  ];

  if (!allowedTables.includes(body.table)) {
    return NextResponse.json({ error: { code: "bad_request", message: `Table '${body.table}' is not allowed.` } }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      data: { ...body.data, id: `local-${Date.now()}`, persisted: false },
      meta: { version: "v1", storage: "local" },
    });
  }

  const actorColumnMap: Record<string, string> = {
    saved_reports: "created_by",
    stress_scenarios: "created_by",
    risk_factor_configs: "updated_by",
    compliance_reviews: "reviewed_by",
    workflow_actions: "performed_by",
    fraud_alerts: "resolved_by",
    model_configs: "updated_by",
    monitoring_alerts: "acknowledged_by",
  };

  try {
    const tenantId = profile.tenantId;
    const actorId = profile.id;
    const actorCol = actorColumnMap[body.table];
    const actorField = actorCol ? { [actorCol]: actorId } : {};

    if (body.action === "insert") {
      const result = await supabase
        .from(body.table)
        .insert({ ...body.data, tenant_id: tenantId, ...actorField })
        .select("*")
        .single();

      if (result.error) throw result.error;
      return NextResponse.json({ data: result.data, meta: { version: "v1", storage: "supabase" } });
    }

    if (body.action === "update") {
      const { id, ...updates } = body.data;
      if (!id) {
        return NextResponse.json({ error: { code: "bad_request", message: "Missing id for update." } }, { status: 400 });
      }

      const result = await supabase
        .from(body.table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();

      if (result.error) throw result.error;
      return NextResponse.json({ data: result.data, meta: { version: "v1", storage: "supabase" } });
    }

    if (body.action === "upsert") {
      const conflictMap: Record<string, string> = {
        risk_factor_configs: "tenant_id,factor_key",
        model_configs: "tenant_id,model_name",
      };
      const onConflict = conflictMap[body.table] ?? "tenant_id";

      const result = await supabase
        .from(body.table)
        .upsert(
          { ...body.data, tenant_id: tenantId, ...actorField, updated_at: new Date().toISOString() },
          { onConflict },
        )
        .select("*")
        .single();

      if (result.error) throw result.error;
      return NextResponse.json({ data: result.data, meta: { version: "v1", storage: "supabase" } });
    }

    if (body.action === "delete") {
      const { id } = body.data;
      if (!id) {
        return NextResponse.json({ error: { code: "bad_request", message: "Missing id for delete." } }, { status: 400 });
      }

      const result = await supabase
        .from(body.table)
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (result.error) throw result.error;
      return NextResponse.json({ data: { id, deleted: true }, meta: { version: "v1", storage: "supabase" } });
    }

    return NextResponse.json({ error: { code: "bad_request", message: `Unknown action '${body.action}'.` } }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database operation failed";
    console.error(`Settings API error [${body.table}/${body.action}]:`, error);
    return NextResponse.json({
      error: { code: "db_error", message },
      data: { ...body.data, id: body.data.id ?? `local-${Date.now()}`, persisted: false },
      meta: { version: "v1", storage: "local" },
    }, { status: 502 });
  }
}
