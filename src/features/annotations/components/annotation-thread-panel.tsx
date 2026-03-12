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

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, X, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/features/auth/hooks/use-session';
import { useAnnotationComments } from '../hooks/use-annotation-comments';
import type { AnnotationComment, AnnotationAuthor, AttachmentAnnotation } from '../types';
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

/**
 * Sort comments chronologically (oldest first)
 * Requirement 3.4: Comments displayed in ascending order by createdAt
 */
function sortCommentsChronologically(comments: AnnotationComment[]): AnnotationComment[] {
  return [...comments].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// ============================================================================
// COMMENT CARD COMPONENT
// ============================================================================

interface CommentCardProps {
  comment: AnnotationComment;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (commentId: string, message: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function CommentCard({
  comment,
  isOwn,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.message);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const author = comment.author;
  const initials = getInitials(author.name);

  const handleEdit = useCallback(() => {
    if (editValue.trim() && editValue !== comment.message) {
      onEdit(comment.id, editValue.trim());
    }
    setIsEditing(false);
  }, [comment.id, comment.message, editValue, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditValue(comment.message);
    setIsEditing(false);
  }, [comment.message]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleEdit, handleCancelEdit]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [isEditing, editValue.length]);

  const showActions = isOwn && (canEdit || canDelete);
  const isOptimistic = comment.id.startsWith('optimistic_');

  return (
    <div 
      className={cn(
        "flex gap-3 p-3 rounded-lg bg-muted/30 transition-opacity",
        isOptimistic && "opacity-60",
        isDeleting && "opacity-40"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={author.avatarUrl || undefined} alt={author.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{author.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          {showActions && !isOptimistic && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)} disabled={isUpdating}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(comment.id)} 
                    className="text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none text-sm"
              disabled={isUpdating}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleEdit}
                disabled={isUpdating || !editValue.trim()}
              >
                {isUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {comment.message}
          </p>
        )}
      </div>
    </div>
  );
}

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

  const {
    addComment,
    updateComment,
    deleteComment,
    markAsRead,
    isAddingComment,
    isUpdatingComment,
    isDeletingComment,
    hasUnreadComments,
  } = useAnnotationComments({
    issueId,
    attachmentId,
    annotationId: annotation.id,
    currentUser: currentUserId ? { id: currentUserId, name: 'You' } : undefined,
  });

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
              <div className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground">
                <h3 className="text-sm font-semibold text-foreground">
                  {annotation.description || 'Annotation thread'}
                </h3>
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
              <CommentCard
                key={comment.id}
                comment={comment}
                isOwn={comment.author.id === currentUserId}
                canEdit={comment.author.id === currentUserId}
                canDelete={comment.author.id === currentUserId}
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
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to submit
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
