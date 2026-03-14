import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { BootstrapForm } from "@/components/auth/bootstrap-form";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile, hasAnyProfiles } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SetupPage() {
  const existingProfile = await getCurrentProfile();
  if (existingProfile) {
    redirect("/");
  }

  const initialized = await hasAnyProfiles();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (initialized && !user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Aegis</span>
        </div>

        <div className="card-elevated p-8">
          <Badge tone="warning" className="mb-4">One-time setup</Badge>
          <h1 className="text-2xl font-bold text-foreground">Initialize workspace</h1>
          <p className="mt-2 text-sm text-muted">
            Create the first admin account and organization for your underwriting platform.
          </p>
          <div className="mt-6">
            {user ? (
              <BootstrapForm
                defaultName={String(user.user_metadata.full_name || user.email || "")}
                email={user.email || ""}
              />
            ) : (
              <div className="space-y-4 text-sm text-muted">
                <p>Sign in with Google first, then return here to initialize the workspace.</p>
                <Link
                  href="/login"
                  className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
                >
                  Go to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
