import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { BootstrapForm } from "@/components/auth/bootstrap-form";
import { JoinOrgForm } from "@/components/auth/join-org-form";
import { Badge } from "@/components/ui/badge";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignOutAndRedirect } from "@/components/auth/sign-out-and-redirect";
import { getCurrentProfile, hasAnyProfiles } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInviteByToken } from "@/lib/repositories/invites";

type PageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SetupPage({ searchParams }: PageProps) {
  const existingProfile = await getCurrentProfile();
  if (existingProfile) {
    redirect("/");
  }

  const { invite: inviteToken } = await searchParams;
  const invite = inviteToken ? await getInviteByToken(inviteToken) : null;

  const initialized = await hasAnyProfiles();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (initialized && !user && !invite) {
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
          {invite ? (
            <>
              <Badge tone="success" className="mb-4">Invite to join</Badge>
              <h1 className="text-2xl font-bold text-foreground">Join {invite.tenantName}</h1>
              <p className="mt-2 text-sm text-muted">
                You&apos;ve been invited to join <strong>{invite.tenantName}</strong> as <strong>{invite.role}</strong>.
              </p>
              <div className="mt-6">
                {user ? (
                  user.email?.toLowerCase().trim() === invite.email ? (
                    <JoinOrgForm
                      token={inviteToken!}
                      tenantName={invite.tenantName}
                      role={invite.role}
                    />
                  ) : (
                    <div className="space-y-4 text-sm text-muted">
                      <p>
                        This invite was sent to <strong className="text-foreground">{invite.email}</strong>.
                        Sign out and sign in with that Google account to accept.
                      </p>
                      <SignOutAndRedirect nextPath={`/setup?invite=${inviteToken}`} />
                    </div>
                  )
                ) : (
                  <div className="space-y-4 text-sm text-muted">
                    <p>Sign in with Google using <strong className="text-foreground">{invite.email}</strong> to accept this invite.</p>
                    <SignInForm canBootstrap={false} nextPath={`/setup?invite=${encodeURIComponent(inviteToken!)}`} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Badge tone="warning" className="mb-4">
                {initialized ? "Create your organization" : "One-time setup"}
              </Badge>
              <h1 className="text-2xl font-bold text-foreground">
                {initialized ? "Create your organization" : "Initialize workspace"}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {initialized
                  ? "Set up your own organization and become the admin. Or use an invite link to join an existing organization."
                  : "Create the first admin account and organization for your underwriting platform."}
              </p>
              <div className="mt-6">
                {user ? (
                  <BootstrapForm
                    defaultName={String(user.user_metadata.full_name || user.email || "")}
                    email={user.email || ""}
                  />
                ) : (
                  <div className="space-y-4 text-sm text-muted">
                    <p>Sign in with Google first, then return here to create your organization.</p>
                    <Link
                      href="/login"
                      className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
                    >
                      Go to login
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
