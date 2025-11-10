"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Badge } from "@components/ui/badge";
import {
  RiCheckDoubleLine,
  RiFileLine,
  RiTeamLine,
  RiCalendarLine,
} from "@remixicon/react";

interface ProjectOverviewProps {
  project: {
    id: string
    name: string
    description: string | null
    progressPercent: number
    tickets: number
    ticketsDone: number
    memberCount: number
    createdAt: string
    updatedAt: string
  }
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null
  canManageMembers: boolean
  onMembershipChanged?: () => void
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function ProjectOverview({
  project,
  userRole,
  canManageMembers,
  onMembershipChanged,
}: ProjectOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Project Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-medium">{project.progressPercent}%</span>
            </div>
            <Progress value={project.progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiFileLine className="h-4 w-4" />
                <span>Total Issues</span>
              </div>
              <p className="text-2xl font-semibold">{project.tickets}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiCheckDoubleLine className="h-4 w-4" />
                <span>Completed</span>
              </div>
              <p className="text-2xl font-semibold">{project.ticketsDone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiTeamLine className="h-4 w-4" />
                <span>Team Members</span>
              </div>
              <Badge variant="secondary">{project.memberCount}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiCalendarLine className="h-4 w-4" />
                <span>Created</span>
              </div>
              <span className="text-sm">{formatDate(project.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiCalendarLine className="h-4 w-4" />
                <span>Last Updated</span>
              </div>
              <span className="text-sm">{formatDate(project.updatedAt)}</span>
            </div>
          </div>

          {project.description && (
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
