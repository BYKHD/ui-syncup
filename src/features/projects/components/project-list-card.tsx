"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import * as RemixIcons from "@remixicon/react";
import {
  RiBox2Fill,
  RiTeamLine,
  RiLockLine,
  RiGlobalLine,
  RiVipCrownLine,
  RiUserAddLine,
  RiFileLine,
} from "@remixicon/react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { ProjectSummary } from "@/features/projects/types";
import {
  getRoleDisplayName,
  getRoleBadgeVariant,
} from "@/features/projects/utils";
import { useJoinProject } from "@/features/projects/hooks";

interface ProjectCardProps {
  project: ProjectSummary;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const [clipPath, setClipPath] = useState<string>("");

  // Generate dynamic clip-path based on element width
  useLayoutEffect(() => {
    const updateClipPath = () => {
      if (!folderRef.current) return;
      const w = folderRef.current.offsetWidth;
      const h = folderRef.current.offsetHeight;
      
      // Fixed tab dimensions (same as original)
      const r = 24;        // corner radius
      const tabEnd = 105;  // where tab ends
      const biteStart = 140; // bite curve start
      const biteEnd = 160;   // bite curve end  
      const biteY = 24;      // bite height
      
      // Generate path with dynamic width
      const path = `M 0 ${r} Q 0 0 ${r} 0 L ${tabEnd} 0 C ${tabEnd + 20} 0 ${biteStart} ${biteY} ${biteEnd} ${biteY} L ${w - r} ${biteY} Q ${w} ${biteY} ${w} ${biteY + r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} Z`;
      setClipPath(`path('${path}')`);
    };

    updateClipPath();
    const observer = new ResizeObserver(updateClipPath);
    if (folderRef.current) observer.observe(folderRef.current);
    return () => observer.disconnect();
  }, []);

  const { mutate: joinProject, isPending: isJoining } = useJoinProject({
    onSuccess: () => {
      onUpdate?.();
    },
  });

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    joinProject(project.id);
  };

  const renderIcon = () => {
    type IconRecord = Record<
      string,
      React.ComponentType<{ className?: string }>
    >;
    const iconMap = RemixIcons as IconRecord;
    const IconComponent = (project.icon && iconMap[project.icon]) || RiBox2Fill;
    return <IconComponent className="h-5 w-5 text-primary" />;
  };

  return (
    <div
      className="block h-full relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/${project.key}`} className="block h-full">
        {/* Outer card with themed border */}
        <div className="h-full rounded-4xl p-2.5 shadow-lg transition-shadow duration-200 hover:shadow-xl flex flex-col bg-border">
          {/* Inner card - light in light mode, darker in dark mode */}
          <div className="flex-1 rounded-3xl overflow-hidden flex flex-col">
            {/* Papers stack area */}
            <div className="relative flex-1 min-h-[20px] flex items-center justify-center p-6">
              <div className="relative w-full max-w-[200px] h-[10px]">
                <div
                  className="absolute w-[85%] h-[80px] rounded-xl bg-muted dark:bg-ring shadow-lg overflow-hidden"
                  style={{ left: 0, top: "10px", transform: "rotate(-6deg)" }}
                >
                  <div
                    className="absolute opacity-60"
                    style={{
                      inset: "12px 14px",
                      background: `
                        linear-gradient(var(--border),var(--border)) 0 0 / 78% 3px no-repeat,
                        repeating-linear-gradient(to bottom, transparent 0 8px, var(--border) 8px 10px)
                      `,
                    }}
                  />
                </div>
                <div
                  className="absolute w-[85%] h-[80px] rounded-xl bg-muted dark:bg-ring shadow-lg overflow-hidden"
                  style={{ left: "12%", top: "4px", transform: "rotate(2deg)" }}
                >
                  <div
                    className="absolute opacity-60"
                    style={{
                      inset: "12px 14px",
                      background: `
                        linear-gradient(var(--border),var(--border)) 0 0 / 78% 3px no-repeat,
                        repeating-linear-gradient(to bottom, transparent 0 8px, var(--border) 8px 10px)
                      `,
                    }}
                  />
                </div>
                <div
                  className="absolute w-[85%] h-[80px] rounded-xl bg-muted dark:bg-ring shadow-lg overflow-hidden opacity-[0.98]"
                  style={{ left: "24%", top: "12px", transform: "rotate(8deg)" }}
                >
                  <div
                    className="absolute opacity-60"
                    style={{
                      inset: "12px 14px",
                      background: `
                        linear-gradient(var(--border),var(--border)) 0 0 / 78% 3px no-repeat,
                        repeating-linear-gradient(to bottom, transparent 0 8px, var(--border) 8px 10px)
                      `,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Folder panel - themed background */}
            <div
              ref={folderRef}
              className="rounded-t-3xl px-5 py-4 bg-card text-card-foreground flex flex-col gap-4 shadow-lg"
              style={{ clipPath: clipPath || undefined }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mt-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    {renderIcon()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium tracking-tight leading-tight truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-muted-foreground tracking-tight line-clamp-1">
                        {project.description}
                      </p>
                    )}
                    {project.userRole && (
                      <div className="flex items-center gap-1 mt-2">
                        {project.userRole === "owner" && (
                          <RiVipCrownLine className="h-3 w-3 text-yellow-500" />
                        )}
                        <Badge
                          variant={getRoleBadgeVariant(project.userRole)}
                          className="text-xs"
                        >
                          {getRoleDisplayName(project.userRole)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  {project.visibility === "private" ? (
                    <RiLockLine className="h-4 w-4" />
                  ) : (
                    <RiGlobalLine className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                {project.userRole && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {project.stats.progressPercent}%
                      </span>
                    </div>
                    <Progress
                      value={project.stats.progressPercent}
                      className="h-2"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <RiFileLine className="h-4 w-4 opacity-75" />
                    <span>
                      {project.stats.totalTickets} Issue
                      {project.stats.totalTickets !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiTeamLine className="h-4 w-4" />
                    <span>
                      {project.stats.memberCount} member
                      {project.stats.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Join button overlay for non-members */}
      {!project.userRole && isHovered && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-4xl transition-opacity">
          <Button
            variant="outline"
            onClick={handleJoin}
            disabled={isJoining}
            size="lg"
            className="shadow-lg"
          >
            <RiUserAddLine className="h-4 w-4 mr-2" />
            {isJoining ? "Joining..." : "Join"}
          </Button>
        </div>
      )}
    </div>
  );
}
