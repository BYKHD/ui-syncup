"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// PANEL HEADER SKELETON
// ============================================================================

export function PanelHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20" /> {/* Issue key */}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16" /> {/* Edit button */}
        <Skeleton className="h-8 w-8" />  {/* More actions */}
      </div>
    </div>
  );
}

// ============================================================================
// METADATA SECTION SKELETON
// ============================================================================

export function MetadataSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" /> {/* Label */}
        <Skeleton className="h-8 w-full" /> {/* Title */}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" /> {/* Label */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Status and Type row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" /> {/* Status label */}
          <Skeleton className="h-6 w-20" /> {/* Status badge */}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-8" /> {/* Type label */}
          <Skeleton className="h-6 w-16" /> {/* Type badge */}
        </div>
      </div>

      {/* Priority and Assignee row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" /> {/* Priority label */}
          <Skeleton className="h-6 w-18" /> {/* Priority badge */}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" /> {/* Assignee label */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" /> {/* Avatar */}
            <Skeleton className="h-4 w-24" /> {/* Name */}
          </div>
        </div>
      </div>

      {/* Reporter */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" /> {/* Reporter label */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" /> {/* Avatar */}
          <Skeleton className="h-4 w-28" /> {/* Name */}
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" /> {/* Created label */}
          <Skeleton className="h-3 w-24" /> {/* Created time */}
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" /> {/* Updated label */}
          <Skeleton className="h-3 w-20" /> {/* Updated time */}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY TIMELINE SKELETON
// ============================================================================

export function ActivityTimelineSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" /> {/* Avatar */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" /> {/* Actor name */}
              <Skeleton className="h-4 w-16" /> {/* Action */}
              <Skeleton className="h-4 w-12" /> {/* Field/target */}
            </div>
            <Skeleton className="h-4 w-3/4" /> {/* Details */}
            <Skeleton className="h-3 w-16" /> {/* Timestamp */}
          </div>
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" /> {/* Action icon */}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ATTACHMENT CANVAS SKELETON
// ============================================================================

export function AttachmentCanvasSkeleton() {
  return (
    <div className="h-full w-full bg-white relative">
      {/* Background pattern */}
      <div
        className="absolute inset-0 z-0 bg-canvas"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-canvas-dotted) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />
      
      {/* Loading content */}
      <div className="relative z-10 h-full w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-64 w-96 mx-auto" /> {/* Main image area */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" /> {/* Loading text */}
            <Skeleton className="h-3 w-24 mx-auto" /> {/* File info */}
          </div>
        </div>
      </div>

      {/* Zoom controls skeleton */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm">
        <Skeleton className="h-8 w-8" /> {/* Zoom out */}
        <Skeleton className="h-6 w-12" /> {/* Zoom level */}
        <Skeleton className="h-8 w-8" /> {/* Zoom in */}
        <Separator orientation="vertical" className="h-6" />
        <Skeleton className="h-8 w-8" /> {/* Fit */}
        <Skeleton className="h-8 w-8" /> {/* Actual size */}
      </div>

      {/* File info bar skeleton */}
      <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur rounded-lg p-3 border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" /> {/* Filename */}
            <Skeleton className="h-3 w-20" /> {/* File size */}
          </div>
          <Skeleton className="h-8 w-8" /> {/* Download button */}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// IMAGE SELECTOR SKELETON
// ============================================================================

export function ImageSelectorSkeleton({ layout = 'thumbnails' }: { layout?: 'thumbnails' | 'dropdown' }) {
  if (layout === 'dropdown') {
    return (
      <div className="p-4 border-b">
        <Skeleton className="h-10 w-full" /> {/* Dropdown */}
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-12 rounded" /> /* Thumbnail */
      ))}
    </div>
  );
}

// ============================================================================
// COMPLETE ISSUE DETAILS PANEL SKELETON
// ============================================================================

export function IssueDetailsPanelSkeleton() {
  return (
    <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-card md:border-l md:border-border">
      <PanelHeaderSkeleton />
      
      <ScrollArea className="flex-1 h-fill overflow-auto">
        <div className="p-6 space-y-8">
          <MetadataSectionSkeleton />
          
          <Separator />
          
          <div className="space-y-4">
            <div className="px-6 py-4 border-b">
              <Skeleton className="h-5 w-16" /> {/* Activity title */}
            </div>
            <ActivityTimelineSkeleton count={4} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// ENHANCED RESPONSIVE LAYOUT SKELETON
// ============================================================================

export function EnhancedResponsiveIssueLayoutSkeleton() {
  return (
    <div className="flex h-full">
      {/* Attachment canvas skeleton */}
      <div className="flex-1 bg-muted/30 relative">
        <AttachmentCanvasSkeleton />
      </div>
      
      {/* Details panel skeleton */}
      <div className="md:w-[360px] lg:w-[480px]">
        <IssueDetailsPanelSkeleton />
      </div>
    </div>
  );
}

// ============================================================================
// PARTIAL LOADING STATES
// ============================================================================

export function PartialLoadingOverlay({ 
  message, 
  isRetrying = false 
}: { 
  message: string; 
  isRetrying?: boolean; 
}) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center space-y-2">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {isRetrying && (
          <p className="text-xs text-muted-foreground">Retrying...</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENTS
// ============================================================================

export function PartialErrorState({ 
  title, 
  message, 
  onRetry, 
  isRetrying = false 
}: { 
  title: string; 
  message: string; 
  onRetry: () => void; 
  isRetrying?: boolean; 
}) {
  return (
    <div className="flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{message}</div>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? 'Retrying...' : 'Try again'}
        </button>
      </div>
    </div>
  );
}