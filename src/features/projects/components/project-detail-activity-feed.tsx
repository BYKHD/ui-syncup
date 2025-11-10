"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RiUserAddLine,
  RiUserLine,
  RiSettingsLine,
  RiLockLine,
  RiGlobalLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiEditLine,
  RiTimeLine,
} from "@remixicon/react";

type ActivityType =
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'project_updated'
  | 'visibility_changed'
  | 'project_archived'
  | 'project_deleted'

interface ActivityItem {
  id: string
  type: ActivityType
  actor: {
    id: string
    name: string
    avatar?: string
  }
  target?: {
    id: string
    name: string
  }
  metadata?: Record<string, any>
  timestamp: string
}

interface ProjectActivityFeedProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'member_added':
      return <RiUserAddLine className="h-4 w-4 text-green-500" />;
    case 'member_removed':
      return <RiUserLine className="h-4 w-4 text-red-500" />;
    case 'member_role_changed':
      return <RiUserLine className="h-4 w-4 text-blue-500" />;
    case 'project_updated':
      return <RiEditLine className="h-4 w-4 text-blue-500" />;
    case 'visibility_changed':
      return <RiSettingsLine className="h-4 w-4 text-orange-500" />;
    case 'project_archived':
      return <RiArchiveLine className="h-4 w-4 text-gray-500" />;
    case 'project_deleted':
      return <RiDeleteBinLine className="h-4 w-4 text-red-500" />;
    default:
      return <RiTimeLine className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityMessage(activity: ActivityItem) {
  const { type, actor, target, metadata } = activity;

  switch (type) {
    case 'member_added':
      return (
        <span>
          <strong>{actor.name}</strong> added <strong>{target?.name}</strong> to the project
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
          <strong>{actor.name}</strong> removed <strong>{target?.name}</strong> from the project
        </span>
      );
    case 'member_role_changed':
      return (
        <span>
          <strong>{actor.name}</strong> changed <strong>{target?.name}</strong>'s role
          {metadata?.oldRole && metadata?.newRole && (
            <span className="ml-2">
              from <Badge variant="outline" className="text-xs">{metadata.oldRole}</Badge> to{' '}
              <Badge variant="outline" className="text-xs">{metadata.newRole}</Badge>
            </span>
          )}
        </span>
      );
    case 'project_updated':
      return (
        <span>
          <strong>{actor.name}</strong> updated the project
          {metadata?.changes && (
            <span className="ml-1">
              ({metadata.changes.join(', ')})
            </span>
          )}
        </span>
      );
    case 'visibility_changed':
      return (
        <span>
          <strong>{actor.name}</strong> changed project visibility to{' '}
          <Badge variant="outline" className="ml-1 text-xs">
            {metadata?.visibility === 'private' ? (
              <>
                <RiLockLine className="h-3 w-3 mr-1" />
                Private
              </>
            ) : (
              <>
                <RiGlobalLine className="h-3 w-3 mr-1" />
                Public
              </>
            )}
          </Badge>
        </span>
      );
    case 'project_archived':
      return (
        <span>
          <strong>{actor.name}</strong> archived the project
        </span>
      );
    case 'project_deleted':
      return (
        <span>
          <strong>{actor.name}</strong> deleted the project
        </span>
      );
    default:
      return (
        <span>
          <strong>{actor.name}</strong> performed an action
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

export function ProjectActivityFeed({ activities, isLoading = false }: ProjectActivityFeedProps) {
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
                    {formatTimestamp(activity.timestamp)}
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
