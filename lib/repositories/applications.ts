import { extractDocumentWithOpenAI } from "@/lib/ai/document-extraction";
import { runComplianceChecks } from "@/lib/compliance/checks";
import { DecisionStatus, DocumentRecord, UnderwritingApplication } from "@/lib/domain";
import { getMockApplicationById, getMockPortfolioSummary, mockApplications } from "@/lib/mock-data";
import { calculateRiskScore } from "@/lib/scoring/engine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { evaluateDecision } from "@/lib/workflows/decisioning";

const DEMO_TENANT = {
  name: "Aegis Demo Lending",
  slug: "aegis-demo",
};

const STORAGE_BUCKET = "application-documents";

type CreateApplicationInput = {
  applicantName: string;
  requestedAmount: number;
  annualIncome: number;
  creditScore: number;
  employmentMonths: number;
  monthlyDebt: number;
};

type UploadDocumentInput = {
  applicationId: string;
  documentType: "identity" | "income" | "bank_statement";
  file: File;
};

type ApplicationRow = {
  id: string;
  tenant_id: string;
  customer_id: string;
  product_type: string;
  status: string;
  requested_amount: number;
  annual_income: number;
  credit_score: number | null;
  employment_months: number | null;
  monthly_debt: number;
  submitted_at: string;
  customers?: { full_name: string } | Array<{ full_name: string }> | null;
};

type DocumentRow = {
  id: string;
  application_id: string;
  storage_path: string;
  document_type: "identity" | "income" | "bank_statement";
  verified: boolean;
  extraction_status: "pending" | "complete" | "failed";
  extraction_summary: string | null;
  extracted_text: string | null;
};

type RiskScoreRow = {
  application_id: string;
  total_score: number;
  model_version: string;
  reason_codes: string[] | null;
  created_at: string;
};

type DecisionRow = {
  application_id: string;
  status: DecisionStatus;
  reason_codes: string[] | null;
  created_at: string;
};

function isSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";

  return code === "42P01" || code === "PGRST205" || message.includes("relation") || message.includes("does not exist") || message.includes("schema cache");
}

function getFileName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function slugifyFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
}

function toDocument(document: DocumentRow): DocumentRecord {
  return {
    id: document.id,
    name: getFileName(document.storage_path),
    type: document.document_type,
    status: document.verified ? "verified" : "pending",
    extractionStatus: document.extraction_status,
    extractionSummary: document.extraction_summary,
    extractedText: document.extracted_text,
  };
}

async function ensureDemoTenant() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  const existing = await supabase.from("tenants").select("id").eq("slug", DEMO_TENANT.slug).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;

  const created = await supabase.from("tenants").insert(DEMO_TENANT).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

async function ensureStorageBucket() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  const existing = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!existing.error) return;

  const created = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
    throw created.error;
  }
}

function extractCustomerName(customers: ApplicationRow["customers"]): string {
  if (!customers) return "Unknown applicant";
  if (Array.isArray(customers)) return customers[0]?.full_name ?? "Unknown applicant";
  return customers.full_name ?? "Unknown applicant";
}

function toApplication(row: ApplicationRow, documents: DocumentRow[], scoreRow?: RiskScoreRow, decisionRow?: DecisionRow): UnderwritingApplication {
  const base: UnderwritingApplication = {
    id: row.id,
    applicantName: extractCustomerName(row.customers),
    product: row.product_type,
    requestedAmount: Number(row.requested_amount),
    annualIncome: Number(row.annual_income),
    creditScore: row.credit_score ?? 0,
    employmentMonths: row.employment_months ?? 0,
    monthlyDebt: Number(row.monthly_debt),
    status: (row.status as UnderwritingApplication["status"]) ?? "submitted",
    riskScore: scoreRow?.total_score ?? 0,
    decision: decisionRow?.status ?? "pending",
    flags: decisionRow?.reason_codes ?? [],
    documents: documents.map(toDocument),
    submittedAt: row.submitted_at.slice(0, 10),
    modelVersion: scoreRow?.model_version ?? "deterministic-v1",
  };

  if (!scoreRow || !decisionRow) {
    const derivedScore = calculateRiskScore(base);
    const derivedDecision = evaluateDecision(base, derivedScore);
    return {
      ...base,
      riskScore: derivedScore.totalScore,
      decision: derivedDecision.status,
      flags: derivedScore.reasonCodes,
    };
  }

  return base;
}

async function fetchSupabaseApplications(tenantId?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  let applicationsQuery = supabase
    .from("applications")
    .select("id, tenant_id, customer_id, product_type, status, requested_amount, annual_income, credit_score, employment_months, monthly_debt, submitted_at, customers(full_name)")
    .order("submitted_at", { ascending: false });

  if (tenantId) {
    applicationsQuery = applicationsQuery.eq("tenant_id", tenantId);
  }

  const applicationsResult = await applicationsQuery;
  if (applicationsResult.error) throw applicationsResult.error;

  const applicationIds = applicationsResult.data.map((row) => row.id);
  if (!applicationIds.length) return [];

  const [documentsResult, scoresResult, decisionsResult] = await Promise.all([
    supabase
      .from("application_documents")
      .select("id, application_id, storage_path, document_type, verified, extraction_status, extraction_summary, extracted_text")
      .in("application_id", applicationIds),
    supabase
      .from("risk_scores")
      .select("application_id, total_score, model_version, reason_codes, created_at")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("decisions")
      .select("application_id, status, reason_codes, created_at")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (documentsResult.error) throw documentsResult.error;
  if (scoresResult.error) throw scoresResult.error;
  if (decisionsResult.error) throw decisionsResult.error;

  const latestScores = new Map<string, RiskScoreRow>();
  const latestDecisions = new Map<string, DecisionRow>();

  for (const row of scoresResult.data as RiskScoreRow[]) {
    if (!latestScores.has(row.application_id)) latestScores.set(row.application_id, row);
  }

  for (const row of decisionsResult.data as DecisionRow[]) {
    if (!latestDecisions.has(row.application_id)) latestDecisions.set(row.application_id, row);
  }

  return (applicationsResult.data as ApplicationRow[]).map((row) =>
    toApplication(
      row,
      (documentsResult.data as DocumentRow[]).filter((document) => document.application_id === row.id),
      latestScores.get(row.id),
      latestDecisions.get(row.id),
    ),
  );
}

export async function listApplications(tenantId?: string) {
  try {
    const applications = await fetchSupabaseApplications(tenantId);
    if (applications) {
      return { data: applications, mode: "supabase" as const };
    }
  } catch (error) {
    if (!isSchemaUnavailable(error)) {
      console.error("Failed to fetch applications from Supabase", error);
    }
  }

  return { data: mockApplications, mode: "mock" as const };
}

export async function getApplication(id: string, tenantId?: string) {
  const applications = await listApplications(tenantId);
  return applications.data.find((application) => application.id === id) ?? getMockApplicationById(id) ?? null;
}

export async function createApplication(input: CreateApplicationInput, tenantId?: string) {
  const draft: UnderwritingApplication = {
    id: "draft-preview",
    applicantName: input.applicantName,
    product: "Personal Loan",
    requestedAmount: input.requestedAmount,
    annualIncome: input.annualIncome,
    creditScore: input.creditScore,
    employmentMonths: input.employmentMonths,
    monthlyDebt: input.monthlyDebt,
    status: "submitted",
    riskScore: 0,
    decision: "pending",
    flags: [],
    documents: [],
    submittedAt: new Date().toISOString().slice(0, 10),
    modelVersion: "deterministic-v1",
  };

  const score = calculateRiskScore(draft);
  const decision = evaluateDecision(draft, score);
  const complianceChecks = runComplianceChecks({ ...draft, riskScore: score.totalScore, decision: decision.status, flags: score.reasonCodes });
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { application: { ...draft, riskScore: score.totalScore, decision: decision.status, flags: score.reasonCodes }, complianceChecks, persisted: false };
  }

  try {
    const resolvedTenantId = tenantId ?? (await ensureDemoTenant());
    if (!resolvedTenantId) throw new Error("Unable to resolve tenant.");

    const customerResult = await supabase.from("customers").insert({ tenant_id: resolvedTenantId, full_name: input.applicantName }).select("id").single();
    if (customerResult.error) throw customerResult.error;

    const applicationResult = await supabase
      .from("applications")
      .insert({
        tenant_id: resolvedTenantId,
        customer_id: customerResult.data.id,
        product_type: "Personal Loan",
        status: decision.status === "approve" ? "approved" : decision.status === "review" ? "manual_review" : "submitted",
        requested_amount: input.requestedAmount,
        annual_income: input.annualIncome,
        credit_score: input.creditScore,
        employment_months: input.employmentMonths,
        monthly_debt: input.monthlyDebt,
      })
      .select("id")
      .single();

    if (applicationResult.error) throw applicationResult.error;
    const applicationId = applicationResult.data.id;

    const [scoreInsert, decisionInsert, auditInsert] = await Promise.all([
      supabase.from("risk_scores").insert({
        tenant_id: resolvedTenantId,
        application_id: applicationId,
        model_version: "deterministic-v1",
        total_score: score.totalScore,
        summary: score.summary,
        reason_codes: score.reasonCodes,
        factor_breakdown: score.factors,
      }),
      supabase.from("decisions").insert({
        tenant_id: resolvedTenantId,
        application_id: applicationId,
        status: decision.status,
        rationale: decision.rationale,
        reason_codes: score.reasonCodes,
      }),
      supabase.from("audit_logs").insert({
        tenant_id: resolvedTenantId,
        application_id: applicationId,
        event_type: "application_created",
        payload: { input, score, decision, complianceChecks },
      }),
    ]);

    if (scoreInsert.error) throw scoreInsert.error;
    if (decisionInsert.error) throw decisionInsert.error;
    if (auditInsert.error) throw auditInsert.error;

    return {
      application: {
        ...draft,
        id: applicationId,
        riskScore: score.totalScore,
        decision: decision.status,
        status: decision.status === "approve" ? "approved" : decision.status === "review" ? "manual_review" : "submitted",
        flags: score.reasonCodes,
      },
      complianceChecks,
      persisted: true,
    };
  } catch (error) {
    if (!isSchemaUnavailable(error)) {
      console.error("Failed to persist application to Supabase", error);
    }

    return { application: { ...draft, riskScore: score.totalScore, decision: decision.status, flags: score.reasonCodes }, complianceChecks, persisted: false };
  }
}

export async function uploadApplicationDocument(input: UploadDocumentInput, tenantId?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase credentials are not configured.");

  const applicationResult = await supabase.from("applications").select("id, tenant_id").eq("id", input.applicationId).single();
  if (applicationResult.error) throw applicationResult.error;

  const resolvedTenantId = tenantId ?? applicationResult.data.tenant_id;
  if (tenantId && tenantId !== applicationResult.data.tenant_id) {
    throw new Error("Application does not belong to the current tenant.");
  }

  await ensureStorageBucket();

  const fileBuffer = Buffer.from(await input.file.arrayBuffer());
  const safeName = slugifyFileName(input.file.name);
  const storagePath = `${resolvedTenantId}/${input.applicationId}/${Date.now()}-${safeName}`;

  const uploadResult = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadResult.error) throw uploadResult.error;

  let extractionStatus: "pending" | "complete" | "failed" = "pending";
  let extractionSummary: string | null = null;
  let extractedText: string | null = null;
  let extractionPayload: Record<string, unknown> = {};
  let extractionError: string | null = null;

  try {
    const extraction = await extractDocumentWithOpenAI({
      buffer: fileBuffer,
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
    });

    extractionStatus = "complete";
    extractionSummary = extraction.summary;
    extractedText = extraction.extractedText;
    extractionPayload = extraction;
  } catch (error) {
    extractionStatus = "failed";
    extractionError = error instanceof Error ? error.message : "Unknown extraction error";
  }

  const documentResult = await supabase
    .from("application_documents")
    .insert({
      tenant_id: resolvedTenantId,
      application_id: input.applicationId,
      storage_path: storagePath,
      document_type: input.documentType,
      extraction_status: extractionStatus,
      verified: extractionStatus === "complete",
      original_filename: input.file.name,
      mime_type: input.file.type || "application/octet-stream",
      extracted_text: extractedText,
      extraction_summary: extractionSummary,
      extraction_payload: extractionPayload,
      extraction_error: extractionError,
    })
    .select("id, application_id, storage_path, document_type, verified, extraction_status, extraction_summary, extracted_text")
    .single();

  if (documentResult.error) throw documentResult.error;

  const auditResult = await supabase.from("audit_logs").insert({
    tenant_id: resolvedTenantId,
    application_id: input.applicationId,
    event_type: "document_uploaded",
    payload: { storagePath, documentType: input.documentType, extractionStatus, extractionSummary, extractionError },
  });
  if (auditResult.error) throw auditResult.error;

  return { document: toDocument(documentResult.data as DocumentRow), persisted: true };
}

export async function getPortfolioSummary(tenantId?: string) {
  const applications = await listApplications(tenantId);
  if (!applications.data.length) {
    return { applicationsInFlight: 0, automatedDecisionRate: 0, projectedLossRatio: 0, factorMix: getMockPortfolioSummary().factorMix };
  }

  const approved = applications.data.filter((application) => application.decision === "approve").length;
  const weightedRisk = applications.data.reduce((sum, application) => sum + application.riskScore, 0);

  return {
    applicationsInFlight: applications.data.length,
    automatedDecisionRate: Math.round((approved / applications.data.length) * 100),
    projectedLossRatio: Number((Math.max(1, 100 - weightedRisk / applications.data.length) / 10).toFixed(1)),
    factorMix: getMockPortfolioSummary().factorMix,
  };
}
