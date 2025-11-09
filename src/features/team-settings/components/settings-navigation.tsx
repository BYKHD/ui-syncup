"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@lib/utils";
import { Badge } from "@components/ui/badge";
import type { SettingsNavItem } from "../types";

interface SettingsNavigationProps {
  items: SettingsNavItem[];
  teamId?: string;
}

export function SettingsNavigation({ items, teamId }: SettingsNavigationProps) {
  const pathname = usePathname();

  // Process items to replace teamId placeholders
  const processedItems = React.useMemo(() => {
    return items.map(item => {
      let href = item.href;

      if (teamId) {
        // Replace [teamId] placeholder with actual team ID
        href = href.replace('[teamId]', teamId);
      }

      return {
        ...item,
        href
      };
    });
  }, [items, teamId]);

  return (
    <nav className="space-y-2">
      <div className="pb-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
          Settings
        </h2>
      </div>
      <div className="space-y-1">
        {processedItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.title}
                  {item.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Soon
                    </Badge>
                  )}
                  {item.badge !== undefined && item.badge !== null && (
                    <Badge
                      variant={item.badgeVariant || 'destructive'}
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
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
    </nav>
  );
}