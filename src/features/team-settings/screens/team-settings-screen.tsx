"use client";

import { useMemo } from "react";
import type { Team, UserRole } from "../types";
import { TeamSettingAside } from "@/components/shared/settings-sidebar";
import { ServiceStatusBanner } from "@/features/setup";
import { TEAM_SETTINGS_NAV } from "@/config/team-settings-nav";

interface TeamSettingsScreenProps {
  initialTeam: Team;
  userRole: UserRole;
  slug: string;
  children: React.ReactNode;
}

export default function TeamSettingsScreen({
  initialTeam: _initialTeam,
  userRole,
  slug,
  children,
}: TeamSettingsScreenProps) {
  // Show service status banner only for owners and admins
  const showServiceBanner = userRole === "owner" || userRole === "admin";

  // Replace legacy /team/settings/* paths with slug-based /team/[slug]/settings/*
  // to avoid the lastActiveTeamId redirect shim which can send users to /onboarding
  const navItems = useMemo(
    () =>
      TEAM_SETTINGS_NAV.map((item) => ({
        ...item,
        href: item.href.replace("/team/settings", `/team/${slug}/settings`),
      })),
    [slug]
  );

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      {showServiceBanner && <ServiceStatusBanner />}
      <div className="flex flex-col gap-8 lg:flex-row">
        <TeamSettingAside items={navItems} />
        <main className="flex-1 max-w-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
