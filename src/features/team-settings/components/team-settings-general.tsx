"use client";

import type { Team } from "@/features/teams/api";
import type { UserRole } from "../types";
import { useTeamSettings } from "../hooks/use-team-settings";
import { SettingsCard } from "./settings-card";
import { TeamInformationForm } from "./team-information-form";
import { SettingsSection } from "./settings-section";
import { TeamDangerZone } from "./team-danger-zone";
import { useTeam } from "@/features/teams";

import type { TeamResponse } from "@/features/teams/api";

type TeamSettingsScreenProps = {
  teamId: string;
  userRole: UserRole;
  initialData?: TeamResponse;
};

export default function TeamSettingsGeneral({
  teamId,
  userRole,
  initialData,
}: TeamSettingsScreenProps) {
  const {
    data: teamResponse,
    isLoading: isTeamLoading,
    error,
    isError
  } = useTeam(teamId, { initialData });
  const team = teamResponse?.team;

  // Handle error state
  if (isError) {
    return (
      <div className="p-4">
        <p className="text-red-500">
          Failed to load team settings: {error?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  // Handle loading state
  if (isTeamLoading) {
    return <div>Loading team settings...</div>;
  }

  // Handle no team data (user not a member, team deleted, etc.)
  if (!team) {
    return (
      <div className="p-4">
        <p className="text-amber-600">
          Team not found or you don't have access to it.
        </p>
      </div>
    );
  }

  // Render content when team is loaded
  return (
    <TeamSettingsContent
      team={team}
      userRole={userRole}
    />
  );
}

function TeamSettingsContent({ 
  team, 
  userRole 
}: { 
  team: Team; 
  userRole: UserRole; 
}) {
  const {
    form,
    imagePreview,
    isLoading: isSaving,
    handleImageChange,
    handleRemoveImage,
    handleCancel,
    handleSubmit,
  } = useTeamSettings({
    initialTeam: team,
    onSuccess: (updatedTeam) => {
      // Optional: Additional logic on success
    }
  });

  return (
    <SettingsSection
      title="General Settings"
      description="Manage your team's profile and preferences"
    >
      <div className="space-y-8">
        <TeamInformationForm
          form={form}
          currentTeam={team}
          imagePreview={imagePreview}
          isLoading={isSaving}
          onImageChange={handleImageChange}
          onRemoveImage={handleRemoveImage}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />

        <SettingsCard
          title="Team ID"
          description="Unique identifier for your team"
        >
          <div className="flex items-center space-x-2">
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              {team.id}
            </code>
          </div>
        </SettingsCard>

        <TeamDangerZone
          teamId={team.id}
          teamName={team.name}
          userRole={userRole}
          isLastTeam={false}
        />
      </div>
    </SettingsSection>
  );
}
