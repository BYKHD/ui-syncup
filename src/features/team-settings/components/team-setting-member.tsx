"use client";

import { SettingsSection } from "./settings-section";
import { TeamMembersList } from "./team-members-list";
import { TeamInvitationsList } from "./team-invitations-list";
import { TeamPermissionGuard } from "./team-permission-guard";

interface TeamMembersPageProps {
  teamId: string;
  currentUserId: string;
}

export default function TeamMembersPage({ teamId, currentUserId }: TeamMembersPageProps) {
  return (
    <SettingsSection
      title="Team Members"
      description="Manage your team members and their roles"
    >
      <div className="space-y-8">
        <TeamMembersList teamId={teamId} currentUserId={currentUserId} />
        
        <TeamPermissionGuard teamId={teamId} permission="canManageInvitations">
          <TeamInvitationsList teamId={teamId} />
        </TeamPermissionGuard>
      </div>
    </SettingsSection>
  );
}
