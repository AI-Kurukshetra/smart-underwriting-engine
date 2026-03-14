import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { UnderwritingApplication } from "@/lib/domain";
import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { evaluateDecision } from "@/lib/workflows/decisioning";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  let body: {
    applicantName: string;
    requestedAmount: number;
    annualIncome: number;
    creditScore: number;
    employmentMonths: number;
    monthlyDebt: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON body." } }, { status: 400 });
  }

  const required = ["applicantName", "requestedAmount", "annualIncome", "creditScore", "employmentMonths", "monthlyDebt"] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      return NextResponse.json({ error: { code: "bad_request", message: `Missing required field: ${field}` } }, { status: 400 });
    }
  }

  const draft: UnderwritingApplication = {
    id: `assessment-${Date.now()}`,
    applicantName: body.applicantName,
    product: "Assessment",
    requestedAmount: body.requestedAmount,
    annualIncome: body.annualIncome,
    creditScore: body.creditScore,
    employmentMonths: body.employmentMonths,
    monthlyDebt: body.monthlyDebt,
    status: "submitted",
    riskScore: 0,
    decision: "pending",
    flags: [],
    documents: [],
    submittedAt: new Date().toISOString().slice(0, 10),
    modelVersion: "realtime-v1",
  };

  const score = calculateRealtimeScore(draft);
  const decision = evaluateDecision(draft, score);

  return NextResponse.json({
    data: {
      score,
      decision,
      applicant: body.applicantName,
      timestamp: new Date().toISOString(),
    },
    meta: { version: "v1" },
  });
}
