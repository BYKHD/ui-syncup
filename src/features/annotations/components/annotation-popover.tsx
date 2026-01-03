'use client';

import { useRef, useCallback, useState, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, Loader2, MessageSquare } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AnnotationThread, AnnotationComment, AnnotationAuthor } from '../types';
import { useAnnotationComments } from '../hooks/use-annotation-comments';
import { useSession } from '@/features/auth/hooks/use-session';
import type { PopoverMode } from '../hooks/use-annotation-popover';

const PREVIEW_WIDTH = 240;
const EXPANDED_WIDTH = 320;
const PREVIEW_HEIGHT = 80; // Estimated preview height
const EXPANDED_HEIGHT = 400; // Max expanded height
const VIRTUAL_SCROLL_THRESHOLD = 10;
const OFFSET = 12; // Gap between anchor and popover
const PADDING = 16; // Minimum distance from viewport edges

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface AnnotationPopoverProps<T extends AnnotationAuthor = AnnotationAuthor> {
  annotation: AnnotationThread<T>;
  issueId: string;
  attachmentId: string;
  mode: PopoverMode;
  open: boolean;
  /** Position of the anchor element (percentage 0-1) */
  anchorPosition: { x: number; y: number };
  /** Reference to the overlay element for positioning */
  overlayRef: React.RefObject<HTMLDivElement | null>;
  onModeChange: (mode: PopoverMode) => void;
  onClose: () => void;
  /** Called when mouse enters the popover */
  onMouseEnter?: () => void;
  /** Called when mouse leaves the popover */
  onMouseLeave?: () => void;
}

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
 * Calculate the best placement for the popover using available space
 */
function calculateBestPlacement(
  anchorX: number,
  anchorY: number,
  popoverWidth: number,
  popoverHeight: number,
  containerWidth: number,
  containerHeight: number,
  preferredPlacement: Placement = 'top'
): { placement: Placement; left: number; top: number } {
  // Calculate available space in each direction
  const spaceTop = anchorY - PADDING;
  const spaceBottom = containerHeight - anchorY - PADDING;
  const spaceLeft = anchorX - PADDING;
  const spaceRight = containerWidth - anchorX - PADDING;

  // Required space (popover dimension + offset)
  const requiredVertical = popoverHeight + OFFSET;
  const requiredHorizontal = popoverWidth + OFFSET;

  // Define placement order based on preference
  const placements: Placement[] = preferredPlacement === 'top' 
    ? ['top', 'bottom', 'right', 'left']
    : preferredPlacement === 'bottom'
    ? ['bottom', 'top', 'right', 'left']
    : preferredPlacement === 'left'
    ? ['left', 'right', 'top', 'bottom']
    : ['right', 'left', 'top', 'bottom'];

  // Check each placement and find the first one that fits
  for (const placement of placements) {
    let fits = false;
    
    switch (placement) {
      case 'top':
        fits = spaceTop >= requiredVertical;
        break;
      case 'bottom':
        fits = spaceBottom >= requiredVertical;
        break;
      case 'left':
        fits = spaceLeft >= requiredHorizontal;
        break;
      case 'right':
        fits = spaceRight >= requiredHorizontal;
        break;
    }

    if (fits) {
      return calculatePosition(placement, anchorX, anchorY, popoverWidth, popoverHeight, containerWidth, containerHeight);
    }
  }

  // Fallback: use the direction with most space
  const spaces = [
    { placement: 'top' as Placement, space: spaceTop },
    { placement: 'bottom' as Placement, space: spaceBottom },
    { placement: 'left' as Placement, space: spaceLeft },
    { placement: 'right' as Placement, space: spaceRight },
  ];
  const best = spaces.sort((a, b) => b.space - a.space)[0];
  
  return calculatePosition(best.placement, anchorX, anchorY, popoverWidth, popoverHeight, containerWidth, containerHeight);
}

/**
 * Calculate exact position for a given placement
 */
function calculatePosition(
  placement: Placement,
  anchorX: number,
  anchorY: number,
  popoverWidth: number,
  popoverHeight: number,
  containerWidth: number,
  containerHeight: number
): { placement: Placement; left: number; top: number } {
  let left = 0;
  let top = 0;

  switch (placement) {
    case 'top':
      left = anchorX - popoverWidth / 2;
      top = anchorY - popoverHeight - OFFSET;
      break;
    case 'bottom':
      left = anchorX - popoverWidth / 2;
      top = anchorY + OFFSET;
      break;
    case 'left':
      left = anchorX - popoverWidth - OFFSET;
      top = anchorY - popoverHeight / 2;
      break;
    case 'right':
      left = anchorX + OFFSET;
      top = anchorY - popoverHeight / 2;
      break;
  }

  // Apply "fit" strategy - nudge into viewport if needed
  left = Math.max(PADDING, Math.min(left, containerWidth - popoverWidth - PADDING));
  top = Math.max(PADDING, Math.min(top, containerHeight - popoverHeight - PADDING));

  return { placement, left, top };
}

function CommentItem<T extends AnnotationAuthor = AnnotationAuthor>({ 
  comment,
  style,
}: { 
  comment: AnnotationComment<T>;
  style?: React.CSSProperties;
}) {
  const author = comment.author;
  const initials = getInitials(author.name);

  return (
    <div className="flex gap-2 p-2 rounded-lg bg-muted/30" style={style}>
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={author.avatarUrl || undefined} alt={author.name} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">{author.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words line-clamp-3">
          {comment.message}
        </p>
      </div>
    </div>
  );
}

function VirtualizedCommentList<T extends AnnotationAuthor = AnnotationAuthor>({
  comments,
}: {
  comments: AnnotationComment<T>[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="h-[180px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <CommentItem comment={comments[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContent<T extends AnnotationAuthor = AnnotationAuthor>({
  annotation,
  onClick,
}: {
  annotation: AnnotationThread<T>;
  onClick: () => void;
}) {
  const commentCount = annotation.comments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-0 bg-transparent border-none cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-annotation text-annotation-foreground text-[10px] font-semibold">
          {annotation.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2">
            {annotation.description || 'No description'}
          </p>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px]">
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ExpandedContent<T extends AnnotationAuthor = AnnotationAuthor>({
  annotation,
  issueId,
  attachmentId,
  onClose,
}: {
  annotation: AnnotationThread<T>;
  issueId: string;
  attachmentId: string;
  onClose: () => void;
}) {
  const comments = annotation.comments || [];
  const hasComments = comments.length > 0;
  const useVirtualScroll = comments.length >= VIRTUAL_SCROLL_THRESHOLD;
  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useSession();

  const {
    addComment,
    isAddingComment,
  } = useAnnotationComments({
    issueId,
    attachmentId,
    annotationId: annotation.id,
    currentUser: user ? { id: user.id, name: user.name || 'You' } : undefined,
  });

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

  return (
    <div className="flex flex-col max-h-[360px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-annotation text-annotation-foreground text-[10px] font-semibold">
            {annotation.label}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {annotation.description || 'Annotation'}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Comments */}
      <div className="flex-1 min-h-0 py-2">
        {hasComments ? (
          useVirtualScroll ? (
            <VirtualizedCommentList comments={comments} />
          ) : (
            <ScrollArea className="h-[180px]">
              <div className="space-y-2 pr-2">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            </ScrollArea>
          )
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">No comments yet</p>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="pt-2 border-t space-y-2">
        <Textarea
          ref={textareaRef}
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] text-xs resize-none"
          disabled={isAddingComment}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
          </span>
          <Button 
            size="sm" 
            className="h-7 text-xs"
            onClick={handleSubmit}
            disabled={isAddingComment || !newComment.trim()}
          >
            {isAddingComment ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * An absolutely positioned popover that renders next to an annotation.
 * Uses smart positioning to find the best placement (top/bottom/left/right)
 * with collision detection and fit strategy to stay within bounds.
 */
export function AnnotationPopover<T extends AnnotationAuthor = AnnotationAuthor>({
  annotation,
  issueId,
  attachmentId,
  mode,
  open,
  anchorPosition,
  overlayRef,
  onModeChange,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: AnnotationPopoverProps<T>) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; placement: Placement } | null>(null);

  // Calculate position using smart placement algorithm
  useLayoutEffect(() => {
    if (!open || !overlayRef.current) {
      setPosition(null);
      return;
    }

    const overlay = overlayRef.current;
    // Use offsetWidth/offsetHeight for internal dimensions since popover is
    // inside the same transformed container as the overlay. getBoundingClientRect
    // would give screen coordinates affected by parent transforms (pan/zoom).
    const containerWidth = overlay.offsetWidth;
    const containerHeight = overlay.offsetHeight;
    const popoverWidth = mode === 'preview' ? PREVIEW_WIDTH : EXPANDED_WIDTH;
    const popoverHeight = mode === 'preview' ? PREVIEW_HEIGHT : EXPANDED_HEIGHT;
    
    // Convert percentage anchor to pixel position within overlay
    const anchorX = anchorPosition.x * containerWidth;
    const anchorY = anchorPosition.y * containerHeight;

    // Calculate best placement with collision detection
    const result = calculateBestPlacement(
      anchorX,
      anchorY,
      popoverWidth,
      popoverHeight,
      containerWidth,
      containerHeight,
      'top' // Prefer top placement
    );
    
    setPosition(result);
  }, [open, anchorPosition, overlayRef, mode]);

  const handleExpandClick = useCallback(() => {
    onModeChange('expanded');
  }, [onModeChange]);

  // Handle click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't close if clicking inside the popover
      if (popoverRef.current?.contains(target)) return;
      
      // Don't close if clicking on annotation elements
      if (target.closest('[data-annotation-pin]') || target.closest('[data-annotation-box]')) return;
      
      onClose();
    };

    // Delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !position) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        // No entrance animation - appear instantly
        initial={false}
        animate={{ 
          // Smooth morphing when mode changes (preview → expanded)
          width: mode === 'preview' ? PREVIEW_WIDTH : EXPANDED_WIDTH,
          height: 'auto',
        }}
        transition={{ 
          // Smooth morphing transition for size changes
          width: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        }}
        className={cn(
          "absolute bg-popover text-popover-foreground rounded-lg border shadow-lg p-3 z-50",
          "pointer-events-auto overflow-hidden"
        )}
        style={{
          left: position.left,
          top: position.top,
        }}
        data-annotation-popover="true"
        data-placement={position.placement}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {mode === 'preview' ? (
          <PreviewContent 
            annotation={annotation} 
            onClick={handleExpandClick}
          />
        ) : (
          <ExpandedContent
            annotation={annotation}
            issueId={issueId}
            attachmentId={attachmentId}
            onClose={onClose}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
