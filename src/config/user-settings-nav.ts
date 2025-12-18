import type { UserSettingsNavItem } from "@/components/shared/settings-sidebar";
import { RiEqualizer3Fill, RiMoreLine, RiNotification2Line, RiPuzzle2Line, RiLinkM } from "@remixicon/react";

/**
 * User Settings Navigation Configuration
 *
 * Single source of truth for user settings navigation structure.
 * Following AGENTS.md §2: config/ holds constants and route maps.
 */

export const USER_SETTINGS_NAV: UserSettingsNavItem[] = [
  {
    label: "Preferences",
    href: "/settings/preferences",
    icon: RiEqualizer3Fill,
    description: "Customize your experience",
  },
  {
    label: "Notifications",
    href: "/settings/notifications",
    icon: RiNotification2Line,
    description: "Manage your notification preferences",
  },
  {
    label: "Integrations",
    href: "/settings/integrations",
    icon: RiPuzzle2Line,
    description: "Connect third-party services",
  },
  {
    label: "Linked Accounts",
    href: "/settings/linked-accounts",
    icon: RiLinkM,
    description: "Manage connected login accounts",
  },
  {
    label: "Other",
    href: "/settings/other",
    icon: RiMoreLine,
    description: "Advanced settings and account management",
  },
];
