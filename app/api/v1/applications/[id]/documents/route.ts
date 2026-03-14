import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { uploadApplicationDocument } from "@/lib/repositories/applications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const documentType = formData.get("documentType");
  const file = formData.get("file");

  if (documentType !== "identity" && documentType !== "income" && documentType !== "bank_statement") {
    return NextResponse.json({ error: { code: "validation_error", message: "Invalid document type." } }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "validation_error", message: "A document file is required." } }, { status: 400 });
  }

  try {
    const result = await uploadApplicationDocument({ applicationId: id, documentType, file }, profile.tenantId);
    return NextResponse.json({ data: result.document, meta: { persisted: result.persisted, version: "v1" } });
  } catch (error) {
    return NextResponse.json({ error: { code: "upload_failed", message: error instanceof Error ? error.message : "Failed to upload document." } }, { status: 500 });
  }
}
