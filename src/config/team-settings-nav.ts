import { Settings, Users, CreditCard, Plug } from "lucide-react";
import type { TeamSettingsNavItem } from "@/components/shared/settings-sidebar";
import { RiBankCard2Line, RiInfoCardLine, RiPuzzle2Line, RiTeamLine } from "@remixicon/react";

/**
 * Team Settings Navigation Configuration
 *
 * Single source of truth for team settings navigation structure.
 * Following AGENTS.md §2: config/ holds constants and route maps.
 */

export const TEAM_SETTINGS_NAV: TeamSettingsNavItem[] = [
  {
    label: "General",
    href: "/team/settings",
    icon: RiInfoCardLine,
    description: "Team name and basic settings",
  },
  {
    label: "Members",
    href: "/team/settings/members",
    icon: RiTeamLine,
    description: "Manage team members and roles",
  },
  {
    label: "Billing",
    href: "/team/settings/billing",
    icon: RiBankCard2Line,
    description: "Subscription and payment settings",
    comingSoon: true,
  },
  {
    label: "Integrations",
    href: "/team/settings/integrations",
    icon: RiPuzzle2Line,
    description: "Configure integrations settings",
    comingSoon: true,
  },
];
