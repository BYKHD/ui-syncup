'use client';

/**
 * EditableComment
 *
 * One comment row shared by the thread panel (`size="default"`) and the
 * on-canvas popover (`size="compact"`). Single edit/delete affordance across
 * both surfaces: click/tap the message to edit, plus subtle pencil/trash icons
 * (visible for touch, brighten on hover). Author-gated via `canModify`.
 *
 * @module features/annotations/components/editable-comment
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInlineEdit } from '../hooks/use-inline-edit';
import type { AnnotationComment, AnnotationAuthor } from '../types';

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

export interface EditableCommentProps {
  comment: AnnotationComment<AnnotationAuthor>;
  /** Author-gated: shows the edit/delete affordances and enables click-to-edit */
  canModify: boolean;
  onEdit: (commentId: string, message: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  /** 'default' for the thread panel; 'compact' for the on-canvas popover */
  size?: 'default' | 'compact';
}

export function EditableComment({
  comment,
  canModify,
  onEdit,
  onDelete,
  isUpdating,
  isDeleting,
  size = 'default',
}: EditableCommentProps) {
  const compact = size === 'compact';
  const { isEditing, draft, setDraft, start, save, cancel, handleKeyDown, textareaRef } = useInlineEdit({
    value: comment.message,
    onCommit: (message) => onEdit(comment.id, message),
  });

  const author = comment.author;
  const initials = getInitials(author.name);
  const isOptimistic = comment.id.startsWith('optimistic_');
  const showActions = canModify && !isOptimistic && !isEditing;

  // Click the message to edit — unless the user is selecting text.
  const handleMessageClick = () => {
    if (canModify && !window.getSelection()?.toString()) start();
  };

  return (
    <div
      className={cn(
        'group flex rounded-lg bg-muted/30 transition-opacity',
        compact ? 'gap-2 p-2' : 'gap-3 p-3',
        isOptimistic && 'opacity-60',
        isDeleting && 'opacity-40'
      )}
    >
      <Avatar className={cn('shrink-0', compact ? 'h-6 w-6' : 'h-8 w-8')}>
        <AvatarImage src={author.avatarUrl || undefined} alt={author.name} />
        <AvatarFallback className={compact ? 'text-[10px]' : 'text-xs'}>{initials}</AvatarFallback>
      </Avatar>
      <div className={cn('flex-1 min-w-0', compact ? 'space-y-0.5' : 'space-y-1')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className={cn('font-medium text-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
              {author.name}
            </span>
            <span className={cn('text-muted-foreground shrink-0', compact ? 'text-[10px]' : 'text-xs')}>
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          {showActions && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className={compact ? 'h-5 w-5' : 'h-6 w-6'}
                onClick={start}
                disabled={isUpdating}
                aria-label="Edit comment"
              >
                <Pencil className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-destructive', compact ? 'h-5 w-5' : 'h-6 w-6')}
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                aria-label="Delete comment"
              >
                <Trash2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn('resize-none', compact ? 'min-h-[44px] text-xs' : 'min-h-[60px] text-sm')}
              disabled={isUpdating}
            />
            <div className={cn('flex justify-end', compact ? 'gap-1.5' : 'gap-2')}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(compact && 'h-6 text-xs')}
                onClick={cancel}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={cn(compact && 'h-6 text-xs')}
                onClick={save}
                disabled={isUpdating || !draft.trim()}
              >
                {isUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            onClick={handleMessageClick}
            title={canModify ? 'Click to edit' : undefined}
            className={cn(
              'text-foreground/90 whitespace-pre-wrap break-words',
              compact ? 'text-xs line-clamp-3' : 'text-sm',
              canModify && 'cursor-pointer'
            )}
          >
            {comment.message}
          </p>
        )}
      </div>
    </div>
  );
}
