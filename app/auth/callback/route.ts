import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") || "/";
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const profile = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile.data) {
    const setupPath = nextPath.startsWith("/setup") ? nextPath : "/setup";
    return NextResponse.redirect(`${origin}${setupPath}`);
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
