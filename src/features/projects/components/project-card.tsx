"use client";

import React, { useState } from "react";
import Link from "next/link";
import * as RemixIcons from "@remixicon/react";
import {
  RiBox2Fill,
  RiCheckLine,
  RiMore2Line,
  RiEditLine,
  RiTeamLine,
  RiDeleteBinLine,
  RiLockLine,
  RiGlobalLine,
  RiVipCrownLine,
  RiTimeLine,
  RiUserAddLine,
} from "@remixicon/react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";

import type { ProjectSummary } from "@features/projects/types";
import {
  formatLastActivity,
  getRoleDisplayName,
  getRoleBadgeVariant,
} from "@features/projects/utils";
import { useJoinProject } from "@features/projects/hooks";
import { ProjectMemberManager } from "./project-member-manager";

interface ProjectCardProps {
  project: ProjectSummary;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { mutate: joinProject, isPending: isJoining } = useJoinProject({
    onSuccess: () => {
      onUpdate?.();
    },
  });

  const handleRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Rename project:", project.id);
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    joinProject(project.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Delete project:", project.id);
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
      <Link href={`/projects/${project.id}`} className="block h-full">
        <Card className="h-full justify-between shadow-none hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {renderIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-md font-semibold truncate">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {project.visibility === "private" ? (
                        <RiLockLine className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <RiGlobalLine className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {project.description && (
                    <CardDescription className="text-xs text-muted-foreground line-clamp-3 mb-2">
                      {project.description}
                    </CardDescription>
                  )}

                  {project.userRole && (
                    <div className="flex items-center gap-1 mb-2">
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
            </div>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            {project.userRole && (
              <div className="space-y-2 w-full">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {project.progressPercent}%
                  </span>
                </div>
                <Progress value={project.progressPercent} className="h-2" />
              </div>
            )}

            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <RiCheckLine className="h-3 w-3" />
                  <span>{formatLastActivity(project.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <RiTeamLine className="h-3 w-3" />
                  <span>
                    {project.memberCount} member
                    {project.memberCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>

      {/* Join button overlay for non-members */}
      {!project.userRole && isHovered && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg transition-opacity">
          <Button
            variant="outline"
            onClick={handleJoin}
            disabled={isJoining}
            size="lg"
            className="shadow-lg"
          >
            <RiUserAddLine className="h-4 w-4 mr-2" />
            {isJoining ? "Joining..." : "Join Project"}
          </Button>
        </div>
      )}
    </div>
  );
}
