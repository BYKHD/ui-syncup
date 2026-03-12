"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/features/issues/config";
import type { IssueStatus } from "@/features/issues/types";

import type { ActivityEntry } from "@/features/issues/types";

// ============================================================================
// PROPS & INTERFACES
// ============================================================================

export interface ActivityTimelineProps {
  issueId: string;
  activities: ActivityEntry[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
  error?: Error | null;
  onRetry?: () => void;
}

// ============================================================================
// ACTIVITY TIMELINE CONTAINER (Compact Version)
// ============================================================================

export function ActivityTimeline({
  issueId,
  activities,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  error,
  onRetry
}: ActivityTimelineProps) {
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore || !onLoadMore) return;

    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, onLoadMore]);

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertCircle className="size-4" />
        <span>Failed to load activity</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (!isLoading && activities.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Clock className="size-4" />
        <span>No activity yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" role="region" aria-label="Issue activity timeline">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" id="activity-heading">Activity</h3>
        {activities.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {activities.length}
          </Badge>
        )}
      </div>

      <div
        className="relative"
        role="log"
        aria-labelledby="activity-heading"
        aria-live="polite"
      >
        {/* Vertical timeline line */}
        <div 
          className="absolute left-[5px] top-2 bottom-2 w-px bg-border" 
          aria-hidden="true" 
        />
        
        <div className="space-y-0">
          {isLoading && activities.length === 0 ? (
            <CompactSkeleton />
          ) : (
            activities.map((activity, index) => (
              <CompactActivityEntry 
                key={activity.id} 
                activity={activity} 
                isLast={index === activities.length - 1}
              />
            ))
          )}

          {/* Load More Button */}
          {hasMore && !isLoading && onLoadMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className={cn(
                "text-xs text-muted-foreground hover:text-foreground",
                "transition-colors disabled:opacity-50 flex items-center gap-1 py-1 pl-5"
              )}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT ACTIVITY ENTRY (Single line)
// ============================================================================

function CompactActivityEntry({ activity, isLast }: { activity: ActivityEntry; isLast?: boolean }) {
  const content = getActivityContent(activity);
  
  return (
    <div className="flex items-start gap-3 py-1.5 text-xs leading-relaxed">
      {/* Timeline dot */}
      <div className="relative z-10 ml-0.5 mt-1.5 shrink-0">
        <div className="size-[8px] rounded-full border-1 border-border bg-background" />
      </div>
      
      {/* Content */}
      <div className="flex flex-1 items-baseline justify-between gap-2 min-w-0">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-medium text-foreground shrink-0">
            {activity.actor.name.split(' ')[0]}
          </span>
          <span className="text-muted-foreground truncate">{content}</span>
        </div>
        
        {/* Relative time pushed to right */}
        <span className="text-muted-foreground/60 shrink-0 text-[11px]">
          <RelativeTime timestamp={activity.createdAt} />
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY CONTENT GENERATOR
// ============================================================================

function getActivityContent(activity: ActivityEntry): React.ReactNode {
  switch (activity.type) {
    case "created":
      return "created this issue";
    
    case "status_changed": {
      const change = activity.changes?.find((c) => c.field === "status");
      if (change) {
        return (
          <>
            changed status{" "}
            {change.oldValue && (
              <>
                <InlineStatus status={change.oldValue} /> → 
              </>
            )}
            {change.newValue && <InlineStatus status={change.newValue} />}
          </>
        );
      }
      return "changed status";
    }
    
    case "priority_changed": {
      const change = activity.changes?.find((c) => c.field === "priority");
      if (change) {
        return (
          <>
            changed priority{" "}
            {change.oldValue && (
              <span className="line-through opacity-60">{change.oldValue}</span>
            )}
            {change.oldValue && change.newValue && " → "}
            {change.newValue && (
              <span className={cn(
                "font-medium",
                change.newValue === "critical" && "text-red-600 dark:text-red-400"
              )}>
                {change.newValue}
              </span>
            )}
          </>
        );
      }
      return "changed priority";
    }
    
    case "type_changed": {
      const change = activity.changes?.find((c) => c.field === "type");
      if (change) {
        return (
          <>
            changed type{" "}
            {change.oldValue && (
              <span className="line-through opacity-60">{change.oldValue}</span>
            )}
            {change.oldValue && change.newValue && " → "}
            {change.newValue && <span className="font-medium">{change.newValue}</span>}
          </>
        );
      }
      return "changed type";
    }
    
    case "title_changed":
      return "updated the title";
    
    case "description_changed":
      return "updated the description";
    
    case "assignee_changed": {
      const change = activity.changes?.find((c) => c.field === "assignee");
      if (change?.newValue) {
        return (
          <>
            assigned to <span className="font-medium">{change.newValue}</span>
          </>
        );
      }
      return "removed assignee";
    }
    
    case "comment_added":
      if (activity.comment) {
        const truncated = activity.comment.length > 60 
          ? activity.comment.slice(0, 60) + "..." 
          : activity.comment;
        return (
          <>
            commented: <span className="italic">"{truncated}"</span>
          </>
        );
      }
      return "added a comment";
    
    case "attachment_added":
      return (
        <>
          <span className="text-green-600 dark:text-green-400">added</span> attachment
          {activity.comment && `: ${activity.comment}`}
        </>
      );
    
    case "attachment_removed":
      return (
        <>
          <span className="text-red-600 dark:text-red-400">removed</span> attachment
          {activity.comment && `: ${activity.comment}`}
        </>
      );
    
    case "annotation_created": {
      const labelChange = activity.changes?.find((c) => c.field === "label");
      const label = labelChange?.newValue;
      return (
        <>
          <span className="text-green-600 dark:text-green-400">added</span> annotation
          {label && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-semibold mx-0.5">
              {label}
            </span>
          )}
        </>
      );
    }
    
    case "annotation_updated": {
      const labelChange = activity.changes?.find((c) => c.field === "label");
      const label = labelChange?.newValue;
      return (
        <>
          moved annotation
          {label && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-semibold mx-0.5">
              {label}
            </span>
          )}
        </>
      );
    }
    
    case "annotation_commented": {
      const labelChange = activity.changes?.find((c) => c.field === "label");
      const label = labelChange?.newValue;
      return (
        <>
          commented on annotation
          {label && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-semibold mx-0.5">
              {label}
            </span>
          )}
        </>
      );
    }
    
    case "annotation_deleted": {
      const labelChange = activity.changes?.find((c) => c.field === "label");
      const label = labelChange?.oldValue;
      return (
        <>
          <span className="text-red-600 dark:text-red-400">deleted</span> annotation
          {label && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold mx-0.5 line-through">
              {label}
            </span>
          )}
        </>
      );
    }
    
    default:
      return String(activity.type).replace(/_/g, " ");
  }
}

// ============================================================================
// INLINE STATUS (Compact colored text)
// ============================================================================

function InlineStatus({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_') as IssueStatus;
  const colors = STATUS_COLORS[normalized];
  const label = status.replace(/_/g, " ");
  
  return (
    <span className={cn("font-medium capitalize", colors?.text)}>
      {label}
    </span>
  );
}

// ============================================================================
// RELATIVE TIME (Compact)
// ============================================================================

function RelativeTime({ timestamp }: { timestamp: string }) {
  const [relativeTime, setRelativeTime] = React.useState(() => {
    const time = formatDistanceToNow(new Date(timestamp), { addSuffix: false });
    // Shorten common phrases
    return time
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace("about ", "")
      .replace("less than a", "<1");
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const time = formatDistanceToNow(new Date(timestamp), { addSuffix: false });
      setRelativeTime(
        time
          .replace(" minutes", "m")
          .replace(" minute", "m")
          .replace(" hours", "h")
          .replace(" hour", "h")
          .replace(" days", "d")
          .replace(" day", "d")
          .replace("about ", "")
          .replace("less than a", "<1")
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <time
      dateTime={new Date(timestamp).toISOString()}
      title={new Date(timestamp).toLocaleString()}
    >
      {relativeTime}
    </time>
  );
}

// ============================================================================
// LOADING SKELETON (Compact)
// ============================================================================

function CompactSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Loading activity">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-8" />
        </div>
      ))}
    </div>
  );
}
