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
  Loader2
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { 
  ActivityEntry, 
  ActivityTimelineProps,
  StatusChangeDetails,
  FieldUpdateDetails,
  CommentDetails,
  AttachmentDetails
} from "@/types/issue";

// Enhanced props to include error handling
interface EnhancedActivityTimelineProps extends ActivityTimelineProps {
  error?: Error | null;
  onRetry?: () => void;
}

// ============================================================================
// ACTIVITY TIMELINE CONTAINER
// ============================================================================

export function ActivityTimeline({
  issueId,
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  error,
  onRetry
}: EnhancedActivityTimelineProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
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
        <Clock className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Failed to load activity</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {error.message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:text-primary/80 underline mt-2"
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
    <div className="flex flex-col h-full" role="region" aria-label="Issue activity timeline">
      <div className="px-6 py-4 border-b">
        <h3 className="text-sm font-semibold" id="activity-heading">Activity</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div 
          className="px-6 py-4 space-y-4" 
          ref={scrollRef}
          role="log"
          aria-labelledby="activity-heading"
          aria-live="polite"
        >
          {isLoading && activities.length === 0 ? (
            // Initial loading state
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
          {hasMore && !isLoading && (
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
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// ACTIVITY ENTRY RENDERER
// ============================================================================

function ActivityEntryRenderer({ activity }: { activity: ActivityEntry }) {
  const details = activity.details as any;

  switch (activity.type) {
    case "status_change":
      return <StatusChangeEntry activity={activity} details={details as StatusChangeDetails} />;
    case "field_update":
      return <FieldUpdateEntry activity={activity} details={details as FieldUpdateDetails} />;
    case "comment":
      return <CommentEntry activity={activity} details={details as CommentDetails} />;
    case "attachment":
      return <AttachmentEntry activity={activity} details={details as AttachmentDetails} />;
    default:
      return null;
  }
}

// ============================================================================
// STATUS CHANGE ENTRY
// ============================================================================

function StatusChangeEntry({ 
  activity, 
  details 
}: { 
  activity: ActivityEntry; 
  details: StatusChangeDetails;
}) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">changed status</span>
        </div>
        
        <div className="flex items-center gap-2">
          {details.from && (
            <>
              <StatusBadge status={details.from} />
              <ArrowRight className="size-3 text-muted-foreground" />
            </>
          )}
          <StatusBadge status={details.to} />
        </div>
        
        {details.note && (
          <p className="text-sm text-muted-foreground mt-2">{details.note}</p>
        )}
        
        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>
      
      <ActivityIcon icon={Clock} variant="status" />
    </div>
  );
}

// ============================================================================
// FIELD UPDATE ENTRY
// ============================================================================

function FieldUpdateEntry({ 
  activity, 
  details 
}: { 
  activity: ActivityEntry; 
  details: FieldUpdateDetails;
}) {
  const fieldLabel = formatFieldName(details.field);
  
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">updated</span>
          <span className="text-sm font-medium">{fieldLabel}</span>
        </div>
        
        <div className="text-sm space-y-1">
          {details.oldValue && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">From:</span>
              <span className="text-muted-foreground line-through">
                {formatFieldValue(details.field, details.oldValue)}
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0">To:</span>
            <span className="font-medium">
              {formatFieldValue(details.field, details.newValue)}
            </span>
          </div>
        </div>
        
        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>
      
      <ActivityIcon icon={FileText} variant="update" />
    </div>
  );
}

// ============================================================================
// COMMENT ENTRY
// ============================================================================

function CommentEntry({ 
  activity, 
  details 
}: { 
  activity: ActivityEntry; 
  details: CommentDetails;
}) {
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className="text-sm text-muted-foreground">commented</span>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3 mt-2">
          <p className="text-sm whitespace-pre-wrap">{details.body}</p>
        </div>
        
        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>
      
      <ActivityIcon icon={MessageSquare} variant="comment" />
    </div>
  );
}

// ============================================================================
// ATTACHMENT ENTRY
// ============================================================================

function AttachmentEntry({ 
  activity, 
  details 
}: { 
  activity: ActivityEntry; 
  details: AttachmentDetails;
}) {
  const action = details.action === "added" ? "added" : "removed";
  const actionColor = details.action === "added" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  
  return (
    <div className="flex gap-3">
      <ActivityAvatar actor={activity.actor} />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{activity.actor.name}</span>
          <span className={cn("text-sm font-medium", actionColor)}>{action}</span>
          <span className="text-sm text-muted-foreground">attachment</span>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <span className="text-sm font-mono">{details.filename}</span>
        </div>
        
        <ActivityTimestamp timestamp={activity.createdAt} />
      </div>
      
      <ActivityIcon icon={Paperclip} variant="attachment" />
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
      <AvatarImage src={actor.image || undefined} alt={actor.name} />
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}

function ActivityIcon({ 
  icon: Icon, 
  variant 
}: { 
  icon: React.ElementType; 
  variant: "status" | "update" | "comment" | "attachment";
}) {
  const colors = {
    status: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
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

function ActivityTimestamp({ timestamp }: { timestamp: Date }) {
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
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    open: { variant: "outline", label: "Open" },
    triaged: { variant: "secondary", label: "Triaged" },
    in_progress: { variant: "default", label: "In Progress" },
    resolved: { variant: "secondary", label: "Resolved" },
    archived: { variant: "outline", label: "Archived" }
  };

  const config = variants[status] || { variant: "outline" as const, label: status };

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    title: "Title",
    description: "Description",
    type: "Type",
    priority: "Priority",
    assigneeId: "Assignee",
    page: "Page",
    figmaLink: "Figma Link"
  };

  return labels[field] || field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (typeof value === "string") {
    // Truncate long strings
    if (field === "description" && value.length > 100) {
      return value.slice(0, 100) + "...";
    }
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
