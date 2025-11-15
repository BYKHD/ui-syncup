'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X } from 'lucide-react';
import type { AnnotationThread, AnnotationComment, AnnotationAuthor } from '../types';
import { formatDistanceToNow } from 'date-fns';

export interface AnnotationThreadPreviewProps<T extends AnnotationAuthor = AnnotationAuthor> {
  thread: AnnotationThread<T>;
  onClose: () => void;
  onCommentSubmit?: (threadId: string, message: string) => void;
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

function CommentCard<T extends AnnotationAuthor = AnnotationAuthor>({ comment }: { comment: AnnotationComment<T> }) {
  const author = comment.author;
  const initials = getInitials(author.name);

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={author.avatarUrl || undefined} alt={author.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{author.name}</span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.message}</p>
      </div>
    </div>
  );
}

export function AnnotationThreadPreview<T extends AnnotationAuthor = AnnotationAuthor>({ thread, onClose, onCommentSubmit }: AnnotationThreadPreviewProps<T>) {
  const comments = thread.comments || [];
  const hasComments = comments.length > 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Drag Handle */}
      <div className="flex items-center justify-center pt-2 pb-1">
        <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Thread Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-top gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-annotation shadow-sm text-xs font-semibold text-annotation-foreground">
                {thread.label}
              </div>
              <div className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground">
              
              <h3 className="text-sm font-semibold text-foreground">
                {thread.description || 'Annotation thread'}
              </h3>
              <span>
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>

            </div>
            
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label="Close thread preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {hasComments ? (
            comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Comment Input */}
      <div className="border-t p-4 space-y-3">
        <Textarea
          placeholder="Reply to thread..."
          className="min-h-[80px] resize-none"
          disabled
        />
        <div className="flex justify-end">
          <Button size="sm" disabled>
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
