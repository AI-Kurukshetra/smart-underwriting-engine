import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { listInvites } from "@/lib/repositories/invites";
import { InviteForm } from "@/components/team/invite-form";
import { InviteList } from "@/components/team/invite-list";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const profile = await requireProfile(["admin"]);

  const invites = await listInvites(profile.tenantId);

  return (
    <AppShell
      profile={profile}
      currentPath="/team"
      eyebrow="Team"
      title="Team & Invites"
      description="Invite users to join your organization. Share the invite link with anyone who should have access."
    >
      <SectionCard
        eyebrow="Invite"
        title="Invite someone to your organization"
        description="Enter their email and choose a role. They will receive an invite link to sign up and join your team."
      >
        <InviteForm />
      </SectionCard>

      <SectionCard
        eyebrow="Pending invites"
        title="Recent invites"
        description="Invites expire after 7 days. Share the link with the invitee before it expires."
      >
        <InviteList initialInvites={invites} />
      </SectionCard>
    </AppShell>
  );
}
