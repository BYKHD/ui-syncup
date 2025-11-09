"use client";

import { usePathname } from "next/navigation";
import { Settings, Users, CreditCard, Plug } from "lucide-react";
import TeamSettingsGeneral from "../components/team-settings-genaral";
import type { Team, UserRole } from "../types";
import {
  TeamSettingAside,
  type TeamSettingsNavItem,
} from "@components/shared/settings-sidebar";

interface TeamSettingsScreenProps {
  initialTeam: Team;
  userRole: UserRole;
  children?: React.ReactNode;
}

export default function TeamSettingsScreen({
  initialTeam,
  userRole,
  children,
}: TeamSettingsScreenProps) {
  const pathname = usePathname();

  const teamSettingsNavItems: TeamSettingsNavItem[] = [
    {
      label: "General",
      href: "/team/settings",
      icon: Settings,
      description: "Team name and basic settings",
    },
    {
      label: "Members",
      href: "/team/settings/members",
      icon: Users,
      description: "Manage team members and roles",
    },
    {
      label: "Billing",
      href: "/team/settings/billing",
      icon: CreditCard,
      description: "Subscription and payment settings",
      comingSoon: true,
    },
    {
      label: "Integrations",
      href: "/team/settings/integrations",
      icon: Plug,
      description: "Configure integrations settings",
      comingSoon: true,
    },
  ];

  const isMainPage = pathname === "/team/settings";

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <TeamSettingAside items={teamSettingsNavItems} />
        <main className="flex-1 max-w-2xl">
          {/* Show General settings on main page, otherwise show children (routed content) */}
          {isMainPage ? (
            <TeamSettingsGeneral initialTeam={initialTeam} userRole={userRole} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
