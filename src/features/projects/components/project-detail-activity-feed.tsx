"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RiUserAddLine,
  RiUserLine,
  RiSettingsLine,
  RiMailSendLine,
  RiMailCloseLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiUserUnfollowLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { useProjectActivities } from "../hooks/use-project-activities";
import type { ProjectActivity } from "../api/types";

interface ProjectActivityFeedProps {
  projectId: string;
}

function getActivityIcon(type: ProjectActivity['type']) {
  switch (type) {
    case 'member_added':
      return <RiUserAddLine className="h-4 w-4 text-green-500" />;
    case 'member_removed':
      return <RiUserUnfollowLine className="h-4 w-4 text-red-500" />;
    case 'member_role_changed':
      return <RiUserLine className="h-4 w-4 text-blue-500" />;
    case 'invitation_sent':
      return <RiMailSendLine className="h-4 w-4 text-blue-500" />;
    case 'invitation_accepted':
      return <RiCheckDoubleLine className="h-4 w-4 text-green-500" />;
    case 'invitation_declined':
      return <RiCloseCircleLine className="h-4 w-4 text-red-500" />;
    case 'invitation_revoked':
      return <RiMailCloseLine className="h-4 w-4 text-orange-500" />;
    case 'invitation_email_failed':
      return <RiErrorWarningLine className="h-4 w-4 text-red-500" />;
    default:
      return <RiTimeLine className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityMessage(activity: ProjectActivity) {
  const { type, actor, metadata } = activity;
  const actorName = actor?.name || 'System'; // Invitations might be declined by anonymous, but logInvitationDeclined has null actor.

  switch (type) {
    case 'member_added':
      return (
        <span>
          <strong>{actorName}</strong> added a member
          {metadata?.userName && (
             <span>: <strong>{metadata.userName}</strong></span>
          )}
          {metadata?.role && (
            <Badge variant="outline" className="ml-2 text-xs">
              {metadata.role}
            </Badge>
          )}
        </span>
      );
    case 'member_removed':
      return (
        <span>
          <strong>{actorName}</strong> removed <strong>{metadata?.userName || 'a member'}</strong>
        </span>
      );
    case 'member_role_changed':
      return (
        <span>
          <strong>{actorName}</strong> changed <strong>{metadata?.userName}</strong>'s role
          {metadata?.oldRole && metadata?.newRole && (
            <span className="ml-2">
              from <Badge variant="outline" className="text-xs">{metadata.oldRole}</Badge> to{' '}
              <Badge variant="outline" className="text-xs">{metadata.newRole}</Badge>
            </span>
          )}
        </span>
      );
    case 'invitation_sent':
      return (
        <span>
          <strong>{actorName}</strong> sent an invitation to <strong>{metadata?.email}</strong>
          {metadata?.role && (
            <Badge variant="outline" className="ml-2 text-xs">
              {metadata.role}
            </Badge>
          )}
        </span>
      );
    case 'invitation_accepted':
      return (
        <span>
          <strong>{metadata?.userName || actorName}</strong> accepted invitation
        </span>
      );
    case 'invitation_declined':
      return (
        <span>
          Invitation to <strong>{metadata?.email}</strong> was declined
        </span>
      );
    case 'invitation_revoked':
      return (
        <span>
          <strong>{actorName}</strong> revoked invitation to <strong>{metadata?.email}</strong>
        </span>
      );
    case 'invitation_email_failed':
      return (
        <span>
          Email delivery failed for <strong>{metadata?.email}</strong>
          {metadata?.reason && (
             <span className="ml-1 text-red-500 text-xs">({metadata.reason})</span>
          )}
        </span>
      );
    default:
      return (
        <span>
          <strong>{actorName}</strong> performed an action
        </span>
      );
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

export function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
  const { data, isLoading } = useProjectActivities({ projectId });
  const activities = data?.activities || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RiTimeLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {getActivityMessage(activity)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(activity.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
