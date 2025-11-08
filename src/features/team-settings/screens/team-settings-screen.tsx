"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, Users, CreditCard, Plug } from "lucide-react";
import { SettingsNavItem, Team, UserRole } from "../types";
import { Badge } from "@components/ui/badge";
import TeamSettingsGeneral from "../components/team-settings-genaral";

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

  const teamSettingsNavItems: SettingsNavItem[] = [
    {
      title: "General",
      href: "/team/setting",
      icon: Settings,
      description: "Team name and basic settings",
    },
    {
      title: "Members",
      href: "/team/setting/members",
      icon: Users,
      description: "Manage team members and roles",
    },
    {
      title: "Billing",
      href: "/team/setting/billing",
      icon: CreditCard,
      description: "Subscription and payment settings",
      comingSoon: true,
    },
    {
      title: "Integrations",
      href: "/team/setting/integrations",
      icon: Plug,
      description: "Configure integrations settings",
      comingSoon: true,
    },
  ];

  // Determine if we're on the main settings page (General)
  const isMainPage = pathname === "/team/setting";

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64">
          <div className="pb-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
              Settings
            </h2>
          </div>
          <div className="space-y-1">
            {teamSettingsNavItems.map((item) => {
              const isActive = pathname === item.href;

              if (item.comingSoon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.title}
                        <Badge variant="secondary" className="text-xs">
                          Soon
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground
                    ${
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  `}
                >
                  <item.icon className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">{item.title}</div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
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
