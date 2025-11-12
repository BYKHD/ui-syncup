"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  FileText,
  MessageSquare,
  Paperclip,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
// ACTIVITY TIMELINE CONTAINER
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
  const scrollRef = React.useRef<HTMLDivElement>(null);
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="size-12 text-destructive/50 mb-4" />
        <p className="text-sm font-medium text-foreground">Failed to load activity</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:text-primary/80 underline mt-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-2 py-1"
            aria-label="Retry loading activity"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (!isLoading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Activity will appear here as changes are made
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4" role="region" aria-label="Issue activity timeline">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold" id="activity-heading">Activity</h3>
        {activities.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activities.length}
          </Badge>
        )}
      </div>

      <div
        className="space-y-4"
        ref={scrollRef}
        role="log"
        aria-labelledby="activity-heading"
        aria-live="polite"
      >
        {isLoading && activities.length === 0 ? (
          <ActivityTimelineSkeleton />
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <ActivityEntryRenderer activity={activity} />
                {index < activities.length - 1 && (
                  <Separator className="my-4" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && onLoadMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center pt-4"
          >
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className={cn(
                "text-sm text-muted-foreground hover:text-foreground",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-2 py-1"
              )}
              aria-label={isLoadingMore ? "Loading more activity entries" : "Load more activity entries"}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more activity"
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY ENTRY RENDERER
// ============================================================================

function ActivityEntryRenderer({ activity }: { activity: ActivityEntry }) {
  switch (activity.type) {
    case "created":
      return <CreatedEntry activity={activity} />;
    case "status_changed":
      return <StatusChangedEntry activity={activity} />;
    case "priority_changed":
      return <PriorityChangedEntry activity={activity} />;
    case "type_changed":
      return <TypeChangedEntry activity={activity} />;
    case "title_changed":
      return <TitleChangedEntry activity={activity} />;
    case "description_changed":
      return <DescriptionChangedEntry activity={activity} />;
    case "assignee_changed":
      return <AssigneeChangedEntry activity={activity} />;
    case "comment_added":
      return <CommentAddedEntry activity={activity} />;
    case "attachment_added":
      return <AttachmentAddedEntry activity={activity} />;
    case "attachment_removed":
      return <AttachmentRemovedEntry activity={activity} />;
    default:
      // Fallback for unknown activity types
      return <GenericEntry activity={activity} />;
  }
}

// ============================================================================
// CREATED ENTRY
// ============================================================================

function CreatedEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">created this issue</span>
        </div>

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={Sparkles} variant="created" />
    </div>
  );
}

// ============================================================================
// STATUS CHANGED ENTRY
// ============================================================================

function StatusChangedEntry({ activity }: { activity: ActivityEntry }) {
  const change = activity.changes?.find((c) => c.field === "status");

  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed status</span>
        </div>

        {change && (
          <div className="flex items-center gap-2">
            {change.oldValue && (
              <>
                <StatusBadge status={change.oldValue} />
                <ArrowRight className="size-3 text-muted-foreground" />
              </>
            )}
            {change.newValue && <StatusBadge status={change.newValue} />}
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={Clock} variant="status" />
    </div>
  );
}

// ============================================================================
// PRIORITY CHANGED ENTRY
// ============================================================================

function PriorityChangedEntry({ activity }: { activity: ActivityEntry }) {
  const change = activity.changes?.find((c) => c.field === "priority");

  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed priority</span>
        </div>

        {change && (
          <div className="flex items-center gap-2 text-sm">
            {change.oldValue && (
              <>
                <span className="capitalize text-muted-foreground line-through">{change.oldValue}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </>
            )}
            {change.newValue && (
              <span className="capitalize font-medium">{change.newValue}</span>
            )}
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={AlertCircle} variant="priority" />
    </div>
  );
}

// ============================================================================
// TYPE CHANGED ENTRY
// ============================================================================

function TypeChangedEntry({ activity }: { activity: ActivityEntry }) {
  const change = activity.changes?.find((c) => c.field === "type");

  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed type</span>
        </div>

        {change && (
          <div className="flex items-center gap-2 text-sm">
            {change.oldValue && (
              <>
                <span className="capitalize text-muted-foreground line-through">{change.oldValue}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </>
            )}
            {change.newValue && (
              <span className="capitalize font-medium">{change.newValue}</span>
            )}
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// TITLE CHANGED ENTRY
// ============================================================================

function TitleChangedEntry({ activity }: { activity: ActivityEntry }) {
  const change = activity.changes?.find((c) => c.field === "title");

  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed title</span>
        </div>

        {change && (
          <div className="text-sm space-y-1">
            {change.oldValue && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">From:</span>
                <span className="text-muted-foreground line-through">
                  {change.oldValue}
                </span>
              </div>
            )}
            {change.newValue && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">To:</span>
                <span className="font-medium">
                  {change.newValue}
                </span>
              </div>
            )}
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// DESCRIPTION CHANGED ENTRY
// ============================================================================

function DescriptionChangedEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">updated the description</span>
        </div>

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// ASSIGNEE CHANGED ENTRY
// ============================================================================

function AssigneeChangedEntry({ activity }: { activity: ActivityEntry }) {
  const change = activity.changes?.find((c) => c.field === "assignee");

  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed assignee</span>
        </div>

        {change && (
          <div className="flex items-center gap-2 text-sm">
            {change.oldValue && (
              <>
                <span className="text-muted-foreground line-through">{change.oldValue}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </>
            )}
            {change.newValue ? (
              <span className="font-medium">{change.newValue}</span>
            ) : (
              <span className="text-muted-foreground italic">Unassigned</span>
            )}
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// COMMENT ADDED ENTRY
// ============================================================================

function CommentAddedEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">commented</span>
        </div>

        {activity.comment && (
          <div className="bg-muted/50 rounded-lg p-3 mt-2">
            <p className="text-sm whitespace-pre-wrap">{activity.comment}</p>
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={MessageSquare} variant="comment" />
    </div>
  );
}

// ============================================================================
// ATTACHMENT ADDED ENTRY
// ============================================================================

function AttachmentAddedEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">added</span>
          <span className="text-sm text-muted-foreground">attachment</span>
        </div>

        {activity.comment && (
          <div className="flex items-center gap-2 mt-2">
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="text-sm">{activity.comment}</span>
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={Paperclip} variant="attachment" />
    </div>
  );
}

// ============================================================================
// ATTACHMENT REMOVED ENTRY
// ============================================================================

function AttachmentRemovedEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">removed</span>
          <span className="text-sm text-muted-foreground">attachment</span>
        </div>

        {activity.comment && (
          <div className="flex items-center gap-2 mt-2">
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="text-sm">{activity.comment}</span>
          </div>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={Paperclip} variant="attachment" />
    </div>
  );
}

// ============================================================================
// GENERIC ENTRY (Fallback)
// ============================================================================

function GenericEntry({ activity }: { activity: ActivityEntry }) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">
            {activity.type.replace(/_/g, " ")}
          </span>
        </div>

        {activity.comment && (
          <p className="text-sm text-muted-foreground">{activity.comment}</p>
        )}

        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>

      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function ActivityAvatar({ actor }: { actor: ActivityEntry["actor"] }) {
  const initials = actor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="size-8">
      <AvatarImage src={actor.avatarUrl || undefined} alt={actor.name} />
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}

function ActivityIcon({
  icon: Icon,
  variant
}: {
  icon: React.ElementType;
  variant: "created" | "status" | "update" | "comment" | "attachment" | "priority";
}) {
  const colors = {
    created: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
    status: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    priority: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    update: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    comment: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    attachment: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30"
  };

  return (
    <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", colors[variant])}>
      <Icon className="size-4" />
    </div>
  );
}

function ActivityTimestamp({ timestamp }: { timestamp: string }) {
  const [relativeTime, setRelativeTime] = React.useState(() =>
    formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  );

  // Update relative time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <time
      className="text-xs text-muted-foreground"
      dateTime={new Date(timestamp).toISOString()}
      title={new Date(timestamp).toLocaleString()}
    >
      {relativeTime}
    </time>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; className?: string }> = {
    open: { variant: "outline", className: "border-blue-500 text-blue-700 dark:text-blue-400" },
    in_progress: { variant: "default", className: "bg-purple-500 hover:bg-purple-600" },
    in_review: { variant: "secondary", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    resolved: { variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    archived: { variant: "outline", className: "border-muted-foreground/30 text-muted-foreground" }
  };

  const config = variants[status] || { variant: "outline" as const };
  const label = status.replace(/_/g, " ");

  return (
    <Badge variant={config.variant} className={cn("capitalize", config.className)}>
      {label}
    </Badge>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading activity">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="size-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
          <div className="size-8 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
