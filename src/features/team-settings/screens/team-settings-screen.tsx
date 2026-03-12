"use client";

import type { Team, UserRole } from "../types";
import { TeamSettingAside } from "@/components/shared/settings-sidebar";
import { ServiceStatusBanner } from "@/components/shared/service-status-banner";
import { TEAM_SETTINGS_NAV } from "@/config/team-settings-nav";

interface TeamSettingsScreenProps {
  initialTeam: Team;
  userRole: UserRole;
  children: React.ReactNode;
}

export default function TeamSettingsScreen({
  initialTeam: _initialTeam,
  userRole,
  children,
}: TeamSettingsScreenProps) {
  // Show service status banner only for owners and admins
  const showServiceBanner = userRole === "owner" || userRole === "admin";

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      {showServiceBanner && <ServiceStatusBanner />}
      <div className="flex flex-col gap-8 lg:flex-row">
        <TeamSettingAside items={TEAM_SETTINGS_NAV} />
        <main className="flex-1 max-w-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
