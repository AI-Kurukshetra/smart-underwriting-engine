import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "application-documents";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: { code: "misconfigured", message: "Storage credentials are not configured." } }, { status: 500 });
  }

  const { id, docId } = await params;
  const documentResult = await supabase
    .from("application_documents")
    .select("id, application_id, tenant_id, storage_path")
    .eq("id", docId)
    .maybeSingle();

  if (documentResult.error || !documentResult.data) {
    return NextResponse.json({ error: { code: "not_found", message: "Document not found." } }, { status: 404 });
  }

  if (documentResult.data.application_id !== id) {
    return NextResponse.json({ error: { code: "not_found", message: "Document not found." } }, { status: 404 });
  }

  if (documentResult.data.tenant_id !== profile.tenantId) {
    return NextResponse.json({ error: { code: "forbidden", message: "Document does not belong to this tenant." } }, { status: 403 });
  }

  const signed = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(documentResult.data.storage_path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: { code: "signed_url_failed", message: "Unable to generate a document link." } }, { status: 500 });
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
