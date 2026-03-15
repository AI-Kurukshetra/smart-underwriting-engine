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

  const existingProfile = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existingProfile.data) {
    return NextResponse.json({ error: { message: "You already have an organization. Sign out and use a different account to create a new one." } }, { status: 409 });
  }

  const baseSlug = slugify(parsed.data.organizationName) || "aegis-org";
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingTenant = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!existingTenant.data) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    attempts++;
  }

  const tenantResult = await admin
    .from("tenants")
    .insert({ name: parsed.data.organizationName, slug })
    .select("id")
    .single();

  if (tenantResult.error) {
    return NextResponse.json({ error: { message: tenantResult.error.message } }, { status: 500 });
  }

  const tenantId = tenantResult.data.id;

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
