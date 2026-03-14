import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ data: [], meta: { version: "v1", storage: "local" } });
  }

  try {
    const result = await supabase
      .from("saved_reports")
      .select("*")
      .eq("tenant_id", profile.tenantId)
      .order("created_at", { ascending: false });

    if (result.error) throw result.error;
    return NextResponse.json({ data: result.data, meta: { version: "v1", storage: "supabase" } });
  } catch {
    return NextResponse.json({ data: [], meta: { version: "v1", storage: "local" } });
  }
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  let body: { name: string; widgets: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON." } }, { status: 400 });
  }

  if (!body.name || !body.widgets) {
    return NextResponse.json({ error: { code: "bad_request", message: "name and widgets are required." } }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      data: { id: `local-${Date.now()}`, name: body.name, widgets: body.widgets, persisted: false },
      meta: { version: "v1", storage: "local" },
    });
  }

  try {
    const result = await supabase
      .from("saved_reports")
      .insert({
        tenant_id: profile.tenantId,
        name: body.name,
        widgets: body.widgets,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (result.error) throw result.error;

    await supabase.from("audit_logs").insert({
      tenant_id: profile.tenantId,
      event_type: "report_saved",
      actor_id: profile.id,
      payload: { reportId: result.data.id, name: body.name, widgetCount: body.widgets.length },
    });

    return NextResponse.json({ data: result.data, meta: { version: "v1", storage: "supabase" } });
  } catch (error) {
    console.error("Failed to save report:", error);
    return NextResponse.json({
      data: { id: `local-${Date.now()}`, name: body.name, widgets: body.widgets, persisted: false },
      meta: { version: "v1", storage: "local" },
    });
  }
}
