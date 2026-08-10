'use client';

/**
 * AnnotationThreadPanel Component
 *
 * Displays annotation comments with real API integration and mobile-optimized layout.
 * Uses useAnnotationComments for add/update/delete operations with optimistic updates.
 *
 * Requirements: 3.1, 3.4, 9.4
 *
 * @module features/annotations/components/annotation-thread-panel
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Send, X, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/features/auth/hooks/use-session';
import { useAnnotationComments } from '../hooks/use-annotation-comments';
import { useCanPerformAnnotationAction } from '../hooks/use-annotation-permissions';
import { EditableDescription } from './editable-description';
import { EditableComment } from './editable-comment';
import type { AnnotationComment, AttachmentAnnotation } from '../types';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface AnnotationThreadPanelProps {
  /** The annotation to display comments for */
  annotation: AttachmentAnnotation;
  /** Issue ID for API calls */
  issueId: string;
  /** Attachment ID for API calls */
  attachmentId: string;
  /** Callback when panel should be closed */
  onClose: () => void;
  /** Is the panel currently open */
  open?: boolean;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sort comments chronologically (oldest first)
 * Requirement 3.4: Comments displayed in ascending order by createdAt
 */
function sortCommentsChronologically(comments: AnnotationComment[]): AnnotationComment[] {
  return [...comments].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// The platform never changes for the lifetime of the page, so there is nothing to
// subscribe to — these are module scope so their identity stays stable across renders.
const subscribeToNothing = () => () => {};
const getIsMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const getIsMacServer = () => false;

// ============================================================================
// THREAD CONTENT COMPONENT
// ============================================================================

interface ThreadContentProps {
  annotation: AttachmentAnnotation;
  issueId: string;
  attachmentId: string;
  currentUserId?: string;
  onClose: () => void;
  /** Hide the close button (used when Sheet provides its own) */
  hideCloseButton?: boolean;
}

function ThreadContent({
  annotation,
  issueId,
  attachmentId,
  currentUserId,
  onClose,
  hideCloseButton = false,
}: ThreadContentProps) {
  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // `navigator` does not exist on the server, so this cannot be read during render.
  // useSyncExternalStore is React's API for exactly that: it serves the server snapshot
  // while hydrating and the real value after, with no effect and no state to sync.
  // (`navigator.platform` is deprecated — userAgent is the supported replacement.)
  const isMac = useSyncExternalStore(subscribeToNothing, getIsMac, getIsMacServer);

  const {
    addComment,
    updateComment,
    deleteComment,
    updateDescription,
    markAsRead,
    isAddingComment,
    isUpdatingComment,
    isDeletingComment,
    isUpdatingDescription,
    hasUnreadComments,
  } = useAnnotationComments({
    issueId,
    attachmentId,
    annotationId: annotation.id,
    currentUser: currentUserId ? { id: currentUserId, name: 'You' } : undefined,
  });

  // Description is editable for owners (own annotations) and editors (any) —
  // the `annotation:update` permission.
  const isOwnAnnotation = annotation.author.id === currentUserId;
  const canEditDescription = useCanPerformAnnotationAction('edit', isOwnAnnotation);

  // Sort comments chronologically (oldest first)
  const sortedComments = useMemo(
    () => sortCommentsChronologically(annotation.comments ?? []),
    [annotation.comments]
  );

  // Mark as read when opening panel
  useEffect(() => {
    if (hasUnreadComments) {
      void markAsRead();
    }
  }, [hasUnreadComments, markAsRead]);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [sortedComments.length]);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim() || isAddingComment) return;
    
    await addComment(newComment.trim());
    setNewComment('');
    textareaRef.current?.focus();
  }, [newComment, isAddingComment, addComment]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleSubmit();
    }
  }, [handleSubmit]);

  const handleEditComment = useCallback(async (commentId: string, message: string) => {
    await updateComment(commentId, message);
  }, [updateComment]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await deleteComment(commentId);
  }, [deleteComment]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Drag Handle (mobile) */}
      <div className="flex items-center justify-center pt-2 pb-1 md:hidden">
        <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Thread Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-top gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-annotation shadow-sm text-xs font-semibold text-annotation-foreground">
                {annotation.label}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-xs text-muted-foreground">
                <EditableDescription
                  description={annotation.description ?? ''}
                  canEdit={canEditDescription}
                  onSave={updateDescription}
                  isSaving={isUpdatingDescription}
                />
                <span>
                  {sortedComments.length} {sortedComments.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>
            </div>
          </div>
          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
              aria-label="Close thread preview"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 overflow-auto" ref={scrollAreaRef}>
        <div className="p-4 space-y-3">
          {sortedComments.length > 0 ? (
            sortedComments.map((comment) => (
              <EditableComment
                key={comment.id}
                comment={comment}
                canModify={comment.author.id === currentUserId}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                isUpdating={isUpdatingComment}
                isDeleting={isDeletingComment}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Be the first to comment on this annotation
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Comment Input */}
      <div className="border-t p-4 space-y-3">
        <Textarea
          ref={textareaRef}
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
          disabled={isAddingComment}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {isMac ? '⌘' : 'Ctrl'} + Enter to submit
          </span>
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={isAddingComment || !newComment.trim()}
          >
            {isAddingComment ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AnnotationThreadPanel displays comments for an annotation with real API integration.
 *
 * Features:
 * - Chronological comment display (oldest first)
 * - Add, edit, delete comments with optimistic updates
 * - Mobile-optimized Sheet layout
 * - Desktop inline panel layout
 * - Unread indicator and mark-as-read on open
 */
export function AnnotationThreadPanel({
  annotation,
  issueId,
  attachmentId,
  onClose,
  open = true,
  className,
}: AnnotationThreadPanelProps) {
  const isMobile = useIsMobile();
  const { user } = useSession();

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <ThreadContent
            annotation={annotation}
            issueId={issueId}
            attachmentId={attachmentId}
            currentUserId={user?.id}
            onClose={onClose}
            hideCloseButton={true}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: inline panel
  if (!open) return null;

  return (
    <div className={cn("h-full border-l bg-background", className)}>
      <ThreadContent
        annotation={annotation}
        issueId={issueId}
        attachmentId={attachmentId}
        currentUserId={user?.id}
        onClose={onClose}
      />
    </div>
  );
}

export default AnnotationThreadPanel;
