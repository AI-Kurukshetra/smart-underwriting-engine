import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/lib/repositories/invites";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: { message: "Server not configured." } }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { message: "Sign in to accept the invite." } }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid request." } }, { status: 400 });
  }

  const result = await acceptInvite(
    parsed.data.token,
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name ?? ""
  );

  if ("error" in result) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }

  return NextResponse.json({ data: { accepted: true } }, { status: 200 });
}
