'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import type { AnnotationThread, AnnotationComment, AnnotationAuthor } from '../types';
import { formatDistanceToNow } from 'date-fns';

export interface AnnotationThreadPreviewProps<T extends AnnotationAuthor = AnnotationAuthor> {
  thread: AnnotationThread<T> | null;
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

export function AnnotationThreadPreview<T extends AnnotationAuthor = AnnotationAuthor>({ thread, onCommentSubmit }: AnnotationThreadPreviewProps<T>) {
  // Empty state - no thread selected
  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-2">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Select a thread to view comments</p>
        </div>
      </div>
    );
  }

  const comments = thread.comments || [];
  const hasComments = comments.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Thread Header */}
      <div className="border-b p-4 space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-primary/10 text-xs font-semibold text-primary">
            {thread.label}
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {thread.description || 'Annotation thread'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
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
