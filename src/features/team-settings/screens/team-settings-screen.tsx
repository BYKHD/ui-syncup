"use client";

import type { Team, UserRole } from "../types";
import { TeamSettingAside } from "@components/shared/settings-sidebar";
import { TEAM_SETTINGS_NAV } from "@config/team-settings-nav";

interface TeamSettingsScreenProps {
  initialTeam: Team;
  userRole: UserRole;
  children: React.ReactNode;
}

export default function TeamSettingsScreen({
  initialTeam: _initialTeam,
  userRole: _userRole,
  children,
}: TeamSettingsScreenProps) {
  // Props prefixed with _ are passed from layout but currently unused in this wrapper
  // They're available for future use cases like:
  // - Conditional rendering based on team tier
  // - Role-based navigation item visibility
  // - Passing via React Context to deeply nested children

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <TeamSettingAside items={TEAM_SETTINGS_NAV} />
        <main className="flex-1 max-w-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
