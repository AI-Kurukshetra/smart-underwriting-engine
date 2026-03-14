import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().min(2),
  organizationName: z.string().min(2),
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  if (!admin || !supabase) {
    return NextResponse.json({ error: { message: "Supabase credentials are not configured." } }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Sign in with Google before initializing the workspace." } }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid setup payload." } }, { status: 400 });
  }

  const existingProfiles = await admin.from("profiles").select("id", { head: true, count: "exact" });
  if ((existingProfiles.count ?? 0) > 0) {
    return NextResponse.json({ error: { message: "The platform is already initialized." } }, { status: 409 });
  }

  const existingTenant = await admin.from("tenants").select("id").eq("slug", "aegis-demo").maybeSingle();
  let tenantId: string;

  if (existingTenant.data?.id) {
    tenantId = existingTenant.data.id;
    await admin.from("tenants").update({ name: parsed.data.organizationName }).eq("id", tenantId);
  } else {
    const tenantResult = await admin
      .from("tenants")
      .insert({ name: parsed.data.organizationName, slug: slugify(parsed.data.organizationName) || "aegis-org" })
      .select("id")
      .single();

    if (tenantResult.error) {
      return NextResponse.json({ error: { message: tenantResult.error.message } }, { status: 500 });
    }

    tenantId = tenantResult.data.id;
  }

  const profileInsert = await admin.from("profiles").insert({
    id: user.id,
    tenant_id: tenantId,
    email: user.email || "",
    full_name: parsed.data.fullName,
    role: "admin",
  });

  if (profileInsert.error) {
    return NextResponse.json({ error: { message: profileInsert.error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: { initialized: true } }, { status: 201 });
}
