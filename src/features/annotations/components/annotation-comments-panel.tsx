'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AnnotationThread } from '../types';


export interface AnnotationCommentsPanelProps<A extends AnnotationThread = AnnotationThread> {
  annotations?: A[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string) => void;
}

export function AnnotationCommentsPanel<A extends AnnotationThread>({
  annotations = [],
  activeAnnotationId,
  onAnnotationSelect,
}: AnnotationCommentsPanelProps<A>) {
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

            return (
              <button
                key={annotation.id}
                type="button"
                onClick={() => handleSelect(annotation.id)}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50',
                )}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Annotation {annotation.label}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {annotation.description || 'Unknown annotation detail'}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {annotation.comments?.length ? (
                    <span>
                      {annotation.comments.length} comment
                      {annotation.comments.length > 1 ? 's' : ''}
                    </span>
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
