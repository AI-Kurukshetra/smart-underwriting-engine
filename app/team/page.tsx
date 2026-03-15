import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { requireProfile } from "@/lib/auth/session";
import { listInvites } from "@/lib/repositories/invites";
import { listTeamMembers } from "@/lib/repositories/team-members";
import { getPendingAccessRequests } from "@/lib/repositories/workspace-requests";
import { InviteForm } from "@/components/team/invite-form";
import { InviteList } from "@/components/team/invite-list";
import { AccessRequestsPanel } from "@/components/team/access-requests-panel";
import { TeamMembersList } from "@/components/team/team-members-list";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const profile = await requireProfile(["admin"]);

  const [invites, accessRequests, teamMembers] = await Promise.all([
    listInvites(profile.tenantId),
    getPendingAccessRequests(profile.tenantId),
    listTeamMembers(profile.tenantId),
  ]);

  return (
    <AppShell
      profile={profile}
      currentPath="/team"
      eyebrow="Team"
      title="Team & Invites"
      description="Manage team members, approve access requests, and invite users to your workspace."
    >
      <SectionCard
        eyebrow="Team members"
        title="Workspace team"
        description="View, edit roles, and remove team members. Only admins can manage the team."
      >
        <TeamMembersList initialMembers={teamMembers} currentUserId={profile.id} />
      </SectionCard>

      <SectionCard
        eyebrow="Access requests"
        title="Users requesting to join your workspace"
        description="Verify and approve users who tried to create or join your workspace. Approve to send them an invite link."
      >
        <AccessRequestsPanel initialRequests={accessRequests} />
      </SectionCard>

      <SectionCard
        eyebrow="Invite"
        title="Invite someone to your workspace"
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
