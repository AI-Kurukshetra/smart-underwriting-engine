import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { createApplication, listApplications } from "@/lib/repositories/applications";

const createApplicationSchema = z.object({
  applicantName: z.string().min(2),
  requestedAmount: z.number().positive(),
  annualIncome: z.number().positive(),
  creditScore: z.number().min(300).max(900),
  employmentMonths: z.number().int().nonnegative(),
  monthlyDebt: z.number().nonnegative(),
});

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const { data, mode } = await listApplications(profile.tenantId);

  return NextResponse.json({
    data,
    meta: { mode, version: "v1" },
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: { code: "validation_error", message: "Invalid application payload.", details: parsed.error.flatten() } }, { status: 400 });
  }

  const result = await createApplication(parsed.data, profile.tenantId);

  return NextResponse.json({
    data: result.application,
    complianceChecks: result.complianceChecks,
    meta: { persisted: result.persisted, version: "v1" },
  }, { status: 201 });
}
