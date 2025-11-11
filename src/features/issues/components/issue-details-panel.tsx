'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PanelHeader } from './panel-header';
import { MetadataSection } from './metadata-section';
import { ActivityTimeline } from './activity-timeline';
import type {
  IssueDetailData,
  IssuePermissions,
  ActivityEntry,
  AttachmentAnnotation,
  IssueAttachment,
} from '@/types/issue';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type AnnotationThreadWithMeta = AttachmentAnnotation & {
  attachmentName?: string;
  attachmentVariant?: IssueAttachment['reviewVariant'];
  attachmentPreview?: string | null;
};

type DetailsPanelTab = 'general' | 'comments';

interface IssueDetailsPanelProps {
  issueData: IssueDetailData;
  permissions: IssuePermissions;
  activities: ActivityEntry[];
  activitiesLoading: boolean;
  hasMoreActivities: boolean;
  onLoadMoreActivities: () => void;
  onUpdate: (field: string, value: any) => Promise<void>;
  onDelete: () => Promise<void>;
  isLoading: boolean;
  activityError?: Error | null;
  onRetryActivity?: () => void;
  // Editing state props for keyboard shortcuts
  isEditingTitle?: boolean;
  isEditingDescription?: boolean;
  onEditingTitleChange?: (editing: boolean) => void;
  onEditingDescriptionChange?: (editing: boolean) => void;
  // Keyboard shortcuts help
  onToggleShortcutsHelp?: () => void;
  annotations?: AnnotationThreadWithMeta[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string) => void;
}

export default function IssueDetailsPanel({
  issueData,
  permissions,
  activities,
  activitiesLoading,
  hasMoreActivities,
  onLoadMoreActivities,
  onUpdate,
  onDelete,
  isLoading,
  activityError,
  onRetryActivity,
  isEditingTitle,
  isEditingDescription,
  onEditingTitleChange,
  onEditingDescriptionChange,
  onToggleShortcutsHelp,
  annotations = [],
  activeAnnotationId = null,
  onAnnotationSelect,
}: IssueDetailsPanelProps) {
  const [panelTab, setPanelTab] = useState<DetailsPanelTab>('general');
  
  return (
    <div 
      className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-card md:border-l md:border-border"
      role="complementary"
      aria-label="Issue details and activity"
    >
      <PanelHeader
        issueKey={issueData.issueKey}
        issue={issueData}
        onDelete={onDelete}
        isLoading={isLoading}
        onToggleShortcutsHelp={onToggleShortcutsHelp}
      />
      
      <div className="flex flex-1 flex-col">
        <Tabs
          value={panelTab}
          onValueChange={(value) => setPanelTab(value as DetailsPanelTab)}
          className="flex flex-1 flex-col"
        >
          <TabsList className="h-12 w-full justify-start rounded-none border-b px-6">
            <TabsTrigger value="general" className="h-full">General</TabsTrigger>
            <TabsTrigger value="comments" className="h-full">Comments</TabsTrigger>
          </TabsList>

          <TabsContent
            value="general"
            className="flex-1 data-[state=inactive]:hidden focus-visible:outline-none"
          >
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 space-y-8">
                <MetadataSection 
                  issue={issueData} 
                  onUpdate={onUpdate}
                  isLoading={isLoading}
                  isEditingTitle={isEditingTitle}
                  isEditingDescription={isEditingDescription}
                  onEditingTitleChange={onEditingTitleChange}
                  onEditingDescriptionChange={onEditingDescriptionChange}
                />
                
                <ActivityTimeline
                  issueId={issueData.id}
                  activities={activities}
                  isLoading={activitiesLoading}
                  hasMore={hasMoreActivities}
                  onLoadMore={onLoadMoreActivities}
                  error={activityError}
                  onRetry={onRetryActivity}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="comments"
            className="flex-1 data-[state=inactive]:hidden focus-visible:outline-none"
          >
            <AnnotationCommentsPanel
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              onAnnotationSelect={onAnnotationSelect}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface AnnotationCommentsPanelProps {
  annotations?: AnnotationThreadWithMeta[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string) => void;
}

const annotationStatusTokens = {
  open: {
    label: 'Open',
    className: 'bg-destructive/10 text-destructive border border-destructive/30',
  },
  in_review: {
    label: 'In Review',
    className: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-200',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200',
  },
} satisfies Record<string, { label: string; className: string }>;

function AnnotationCommentsPanel({
  annotations = [],
  activeAnnotationId,
  onAnnotationSelect,
}: AnnotationCommentsPanelProps) {
  const hasExternalControl = typeof onAnnotationSelect === 'function';
  const [localActiveId, setLocalActiveId] = useState<string | null>(annotations[0]?.id ?? null);

  useEffect(() => {
    if (!annotations.length) {
      setLocalActiveId(null);
      return;
    }
    if (!localActiveId) {
      setLocalActiveId(annotations[0].id);
    }
  }, [annotations, localActiveId]);

  const resolvedActiveId = hasExternalControl
    ? activeAnnotationId ?? annotations[0]?.id ?? null
    : localActiveId ?? annotations[0]?.id ?? null;

  const resolvedAnnotation =
    annotations.find((annotation) => annotation.id === resolvedActiveId) ?? annotations[0];

  const handleSelect = (annotationId: string) => {
    if (hasExternalControl) {
      onAnnotationSelect?.(annotationId);
    } else {
      setLocalActiveId(annotationId);
    }
  };

  if (!annotations.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <p>No canvas annotations yet.</p>
        <p>As soon as someone drops a pin on the mock, threads will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-6">
          {annotations.map((annotation) => {
            const isActive = annotation.id === resolvedActiveId;
            const statusStyles = annotationStatusTokens[annotation.status] ?? annotationStatusTokens.open;

            return (
              <button
                key={annotation.id}
                type="button"
                onClick={() => handleSelect(annotation.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <span>Annotation {annotation.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-semibold capitalize",
                      statusStyles.className
                    )}
                  >
                    {statusStyles.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {annotation.attachmentVariant && (
                    <Badge variant="outline" className="uppercase">
                      {annotation.attachmentVariant.replace('_', ' ')}
                    </Badge>
                  )}
                  {annotation.attachmentName && <span>{annotation.attachmentName}</span>}
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {annotation.description || 'Unknown annotation detail'}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {annotation.comments?.length ? (
                    <span>{annotation.comments.length} comment{annotation.comments.length > 1 ? 's' : ''}</span>
                  ) : (
                    <span>No comments yet</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="space-y-4 border-t bg-card/80 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Thread preview
          </p>
          {resolvedAnnotation?.comments?.length ? (
            <div className="space-y-2">
              {resolvedAnnotation.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{comment.author.name}</span>
                    <time dateTime={comment.createdAt}>
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{comment.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments on this annotation yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Add comment
          </p>
          <Textarea
            placeholder="Ready-to-wire mockup — comments coming soon"
            disabled
            className="resize-none"
          />
          <Button size="sm" className="w-full" disabled>
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
