'use client';

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationThread } from '../types';
import { AnnotationThreadPreview } from './annotation-thread-preview';

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

  const handleSelect = (annotationId: string) => {
    if (hasExternalControl) {
      onAnnotationSelect?.(annotationId);
    } else {
      setLocalActiveId(annotationId);
    }
  };

  if (!annotations.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Pin className="h-12 w-12 text-muted-foreground/50" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No canvas annotations yet</p>
          <p className="text-xs text-muted-foreground">
            Annotation threads will appear here when created
          </p>
        </div>
      </div>
    );
  }

  const selectedThread = annotations.find((a) => a.id === resolvedActiveId) ?? null;

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Annotation List - Left side on desktop, top on mobile */}
      <div className="flex flex-col border-b md:w-80 md:border-b-0 md:border-r">
        <div className="border-b p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Comments ({annotations.length})</span>
          </div>
        </div>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-2 p-3">
            {annotations.map((annotation) => {
              const isActive = annotation.id === resolvedActiveId;
              const commentCount = annotation.comments?.length ?? 0;

              return (
                <button
                  key={annotation.id}
                  type="button"
                  onClick={() => handleSelect(annotation.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background hover:border-primary/50 hover:bg-accent/50',
                  )}
                  aria-pressed={isActive}
                  aria-label={`View annotation ${annotation.label}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground bg-muted text-muted-foreground',
                      )}
                    >
                      {annotation.label}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {annotation.description || 'Untitled annotation'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>
                          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Thread Preview - Right side on desktop, bottom on mobile */}
      <div className="flex-1 min-h-0">
        <AnnotationThreadPreview thread={selectedThread} />
      </div>
    </div>
  );
}
