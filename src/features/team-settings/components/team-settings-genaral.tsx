"use client";

import type { Team, UserRole } from "../types";
import { useTeamSettings } from "../hooks/use-team-settings";
import {
  SettingsCard,
  TeamInformationForm,
  SettingsSection,
} from ".";

type TeamSettingsScreenProps = {
  initialTeam: Team;
  userRole: UserRole;
};

export default function TeamSettingsScreen({
  initialTeam,
  userRole,
}: TeamSettingsScreenProps) {
  const {
    form,
    currentTeam,
    imagePreview,
    isLoading,
    handleImageChange,
    handleRemoveImage,
    handleCancel,
    handleSubmit,
  } = useTeamSettings({ initialTeam });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your team information and preferences
        </p>
      </div>

      <SettingsSection
        title="General"
        description="Basic team information and branding"
      >
        <TeamInformationForm
          form={form}
          currentTeam={currentTeam}
          imagePreview={imagePreview}
          isLoading={isLoading}
          onImageChange={handleImageChange}
          onRemoveImage={handleRemoveImage}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </SettingsSection>

      <SettingsSection
        title="Advanced"
        description="Advanced team configuration"
      >
        <SettingsCard
          title="Team ID"
          description="Your team unique identifier"
        >
          <div className="space-y-2">
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              {currentTeam.id}
            </code>
            <p className="text-sm text-muted-foreground">
              Use this ID when integrating with external services or APIs.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
