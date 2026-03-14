import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentProfile = vi.fn();
const mockCreateApplication = vi.fn();
const mockListApplications = vi.fn();
const mockGetApplication = vi.fn();
const mockUploadApplicationDocument = vi.fn();
const mockCalculateRealtimeScore = vi.fn();
const mockEvaluateDecision = vi.fn();
const mockGenerateDecisionExplanation = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock("@/lib/repositories/applications", () => ({
  createApplication: mockCreateApplication,
  listApplications: mockListApplications,
  getApplication: mockGetApplication,
  uploadApplicationDocument: mockUploadApplicationDocument,
}));

vi.mock("@/lib/scoring/realtime-engine", () => ({
  calculateRealtimeScore: mockCalculateRealtimeScore,
}));

vi.mock("@/lib/workflows/decisioning", () => ({
  evaluateDecision: mockEvaluateDecision,
}));

vi.mock("@/lib/ai/explanations", () => ({
  generateDecisionExplanation: mockGenerateDecisionExplanation,
}));

const profile = {
  id: "user-1",
  email: "user@example.com",
  fullName: "Test User",
  role: "admin",
  tenantId: "tenant-1",
  tenantName: "Aegis Lending",
};

const application = {
  id: "app-1",
  applicantName: "Jordan Lee",
  product: "Personal Loan",
  requestedAmount: 15000,
  annualIncome: 78000,
  creditScore: 710,
  employmentMonths: 36,
  monthlyDebt: 1200,
  status: "submitted",
  riskScore: 78,
  decision: "approve",
  flags: ["Profile aligns with preferred lending band and verified documentation."],
  documents: [],
  submittedAt: "2026-03-14",
  modelVersion: "deterministic-v1",
};

const scoreResult = {
  totalScore: 78,
  summary: "Low risk profile with stable repayment capacity.",
  reasonCodes: ["Profile aligns with preferred lending band and verified documentation."],
  factors: [
    { name: "Credit bureau", score: 28, maxScore: 35, weight: 35 },
  ],
  sources: [
    { name: "Credit bureau", score: 28, weight: 35, confidence: "high", summary: "Credit score signal." },
  ],
  generatedAt: "2026-03-14T10:00:00.000Z",
  modelVersion: "rt-ml-placeholder-v1",
};

const decisionResult = {
  status: "approve",
  rationale: "Application satisfies score, credit, and documentation thresholds for straight-through approval.",
  nextActions: ["Generate approval disclosure package."],
};

const explanationResult = {
  narrative: "Jordan Lee qualifies for approval based on stable income and strong score.",
  highlights: ["Stable income", "Healthy score"],
  source: "rule-based",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentProfile.mockResolvedValue(profile);
  mockCalculateRealtimeScore.mockReturnValue(scoreResult);
  mockEvaluateDecision.mockReturnValue(decisionResult);
  mockGenerateDecisionExplanation.mockResolvedValue(explanationResult);
  mockGetApplication.mockResolvedValue(application);
});

describe("application collection route", () => {
  it("returns 401 when listing applications without authentication", async () => {
    mockGetCurrentProfile.mockResolvedValueOnce(null);
    const route = await import("@/app/api/v1/applications/route");

    const response = await route.GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "unauthorized", message: "Authentication required." },
    });
  });

  it("creates an application and returns the persisted payload", async () => {
    mockCreateApplication.mockResolvedValueOnce({
      application,
      complianceChecks: [{ code: "kyc", status: "pass" }],
      persisted: true,
    });
    const route = await import("@/app/api/v1/applications/route");

    const response = await route.POST(
      new Request("http://localhost/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName: "Jordan Lee",
          requestedAmount: 15000,
          annualIncome: 78000,
          creditScore: 710,
          employmentMonths: 36,
          monthlyDebt: 1200,
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: application,
      meta: { persisted: true, version: "v1" },
    });
    expect(mockCreateApplication).toHaveBeenCalledWith(
      {
        applicantName: "Jordan Lee",
        requestedAmount: 15000,
        annualIncome: 78000,
        creditScore: 710,
        employmentMonths: 36,
        monthlyDebt: 1200,
      },
      "tenant-1",
    );
  });

  it("returns 400 for an invalid application payload", async () => {
    const route = await import("@/app/api/v1/applications/route");

    const response = await route.POST(
      new Request("http://localhost/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName: "J",
          requestedAmount: -10,
          annualIncome: 0,
          creditScore: 1000,
          employmentMonths: -1,
          monthlyDebt: -1,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error", message: "Invalid application payload." },
    });
  });
});

describe("application detail routes", () => {
  it("returns application detail with scoring and workflow payload", async () => {
    const route = await import("@/app/api/v1/applications/[id]/route");

    const response = await route.GET(new Request("http://localhost"), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: "app-1",
        scoring: scoreResult,
        workflow: decisionResult,
      },
    });
  });

  it("returns 404 when the application is missing", async () => {
    mockGetApplication.mockResolvedValueOnce(null);
    const route = await import("@/app/api/v1/applications/[id]/route");

    const response = await route.GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Application not found." },
    });
  });

  it("returns a fresh score payload", async () => {
    const route = await import("@/app/api/v1/applications/[id]/score/route");

    const response = await route.POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: scoreResult, meta: { version: "v1" } });
  });

  it("returns a fresh decision payload", async () => {
    const route = await import("@/app/api/v1/applications/[id]/decision/route");

    const response = await route.POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: decisionResult, meta: { version: "v1" } });
  });

  it("returns a narrative explanation payload", async () => {
    const route = await import("@/app/api/v1/applications/[id]/explanation/route");

    const response = await route.GET(new Request("http://localhost"), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: explanationResult, meta: { version: "v1" } });
  });
});

describe("application document route", () => {
  it("rejects an invalid document type", async () => {
    const route = await import("@/app/api/v1/applications/[id]/documents/route");
    const form = new FormData();
    form.set("documentType", "unsupported");
    form.set("file", new File(["test"], "id.pdf", { type: "application/pdf" }));

    const response = await route.POST(new Request("http://localhost", { method: "POST", body: form }), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "validation_error", message: "Invalid document type." },
    });
  });

  it("requires a file upload", async () => {
    const route = await import("@/app/api/v1/applications/[id]/documents/route");
    const form = new FormData();
    form.set("documentType", "identity");

    const response = await route.POST(new Request("http://localhost", { method: "POST", body: form }), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "validation_error", message: "A document file is required." },
    });
  });

  it("uploads a document and returns the stored metadata", async () => {
    mockUploadApplicationDocument.mockResolvedValueOnce({
      document: {
        id: "doc-1",
        name: "id.pdf",
        type: "identity",
        status: "verified",
        extractionStatus: "complete",
        extractionSummary: "Identity card extracted successfully.",
      },
      persisted: true,
    });
    const route = await import("@/app/api/v1/applications/[id]/documents/route");
    const form = new FormData();
    form.set("documentType", "identity");
    form.set("file", new File(["test"], "id.pdf", { type: "application/pdf" }));

    const response = await route.POST(new Request("http://localhost", { method: "POST", body: form }), { params: Promise.resolve({ id: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: "doc-1",
        extractionStatus: "complete",
      },
      meta: { persisted: true, version: "v1" },
    });
    expect(mockUploadApplicationDocument).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "app-1", documentType: "identity" }),
      "tenant-1",
    );
  });
});
