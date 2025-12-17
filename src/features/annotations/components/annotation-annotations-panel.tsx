'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationThread } from '../types';
import { AnnotationThreadPreview } from './annotation-thread-preview';
import { RiChatUnreadLine } from '@remixicon/react';

export interface AnnotationAnnotationsPanelProps<A extends AnnotationThread = AnnotationThread> {
  annotations?: A[];
  /** Issue ID for comment API calls */
  issueId: string;
  /** Attachment ID for comment API calls */
  attachmentId: string;
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string | null) => void;
  isMobile?: boolean;
  hideThreadPreview?: boolean;
}

export function AnnotationAnnotationsPanel<A extends AnnotationThread>({
  annotations = [],
  issueId,
  attachmentId,
  activeAnnotationId,
  onAnnotationSelect,
  isMobile = false,
  hideThreadPreview = false,
}: AnnotationAnnotationsPanelProps<A>) {
  const hasExternalControl = typeof onAnnotationSelect === 'function';
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [prevThreadId, setPrevThreadId] = useState<string | null>(null);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const resolvedActiveId = hasExternalControl ? activeAnnotationId : localActiveId;
  const selectedThread = annotations.find((a) => a.id === resolvedActiveId) ?? null;

  // Auto-open sheet when annotation is selected
  useEffect(() => {
    if (resolvedActiveId && !isSheetOpen) {
      setIsSheetOpen(true);
      setPrevThreadId(resolvedActiveId);
    } else if (resolvedActiveId && isSheetOpen && resolvedActiveId !== prevThreadId) {
      // Thread changed while sheet is open - trigger swap animation
      setPrevThreadId(resolvedActiveId);
    }
  }, [resolvedActiveId, isSheetOpen, prevThreadId]);

  const handleSelect = (annotationId: string) => {
    if (hasExternalControl) {
      onAnnotationSelect?.(annotationId);
    } else {
      setLocalActiveId(annotationId);
    }
  };

  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    // Clear selection when sheet closes
    if (hasExternalControl) {
      onAnnotationSelect?.(null);
    } else {
      setLocalActiveId(null);
    }
  }, [hasExternalControl, onAnnotationSelect]);

  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const threshold = isMobile ? 100 : 80;
      if (info.offset.y > threshold) {
        handleClose();
      }
    },
    [isMobile, handleClose]
  );

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

  return (
    <div className="relative flex h-full flex-col">
      {/* Full-width Annotation List */}
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RiChatUnreadLine className="h-4 w-4" />
            <span>Annotation ({annotations.length})</span>
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
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold shadow-sm',
                        isActive
                          ? 'border-annotation-bold bg-annotation-bold text-annotation-foreground'
                          : 'border-2 border-white bg-annotation text-annotation-foreground',
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

      {/* Bottom Sheet with Thread Preview */}
      {!hideThreadPreview && (
        <AnimatePresence mode="wait">
          {isSheetOpen && selectedThread && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'absolute inset-0 bg-black/40 z-40',
                  isMobile ? 'fixed' : 'absolute'
                )}
                onClick={handleClose}
                aria-hidden="true"
              />

              {/* Sheet Container - entire sheet animates with thread change */}
              <motion.div
                key={selectedThread.id}
                ref={sheetRef}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                  type: 'spring',
                  damping: 30,
                  stiffness: 300,
                }}
                drag={isMobile ? 'y' : false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={handleDragEnd}
                className={cn(
                  'z-50 flex flex-col bg-background shadow-lg rounded-t-2xl border-t',
                  isMobile
                    ? 'fixed inset-x-0 bottom-0 h-[85vh] max-h-[85vh]'
                    : 'absolute inset-x-0 bottom-0 h-[70vh] max-h-[70vh]'
                )}
                style={{ touchAction: 'none' }}
              >
                <AnnotationThreadPreview 
                  thread={selectedThread} 
                  issueId={issueId}
                  attachmentId={attachmentId}
                  onClose={handleClose} 
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
