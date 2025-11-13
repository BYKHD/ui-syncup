'use client';

import type { AnnotationToolId } from '../types';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RemixiconComponentType, RiArrowGoBackLine, RiArrowGoForwardLine, RiCursorLine, RiMapPin3Line, RiPencilFill, RiPencilLine, RiSquareLine } from '@remixicon/react';

import { AnimatePresence, motion } from 'motion/react';

const TOOL_ICONS: Record<AnnotationToolId, RemixiconComponentType> = {
  cursor: RiCursorLine,
  pin: RiMapPin3Line,
  box: RiSquareLine,
};

const TOOL_META: Record<AnnotationToolId, { label: string; shortcut: string }> = {
  cursor: { label: 'Cursor', shortcut: '1 or C' },
  pin: { label: 'Pin', shortcut: '2 or P' },
  box: { label: 'Box', shortcut: '3 or B' },
};

export interface AnnotationToolbarProps {
  className?: string;
  activeTool: AnnotationToolId;
  tools: readonly AnnotationToolId[];
  editModeEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: AnnotationToolId) => void;
  onToggleEditMode: (next: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function AnnotationToolbar({
  className,
  activeTool,
  tools,
  editModeEnabled,
  canUndo,
  canRedo,
  onToolChange,
  onToggleEditMode,
  onUndo,
  onRedo,
}: AnnotationToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('inline-flex flex-col items-center gap-3', className)}>
        {/* Keyboard Shortcuts Hint - Show when edit mode is off */}
        <AnimatePresence mode="wait">
          {!editModeEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{
                duration: 0.3,
                ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
                opacity: { duration: 0.25 }
              }}
              className="rounded-2xl border border-dashed border-border/70 bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-sm"
            >
              Edit mode is off. Press <span className="font-semibold">E</span> to start annotating.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar Controls */}
        <div className="inline-flex items-center gap-2">
          {/* Edit Mode Toggle - Separate Container */}
          <div
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
            role="toolbar"
            aria-label="Edit mode toggle"
          >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editModeEnabled ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-full transition-colors',
                  editModeEnabled && 'shadow-sm',
                )}
                onClick={() => onToggleEditMode(!editModeEnabled)}
                aria-label="Toggle edit mode"
                aria-pressed={editModeEnabled}
              >
                {editModeEnabled ? <RiPencilFill className="h-4 w-4" /> : <RiPencilLine className="h-4 w-4" /> }
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs font-medium">
                {editModeEnabled ? 'Exit Edit Mode' : 'Edit Mode'}
              </p>
              <p className="text-[11px] text-muted-foreground">Press E</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Annotation Tools - Show/Hide with Animation */}
        <AnimatePresence mode="wait">
          {editModeEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, x: -12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.88, x: -12, filter: 'blur(8px)' }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94], // Smooth cubic-bezier easing
                filter: { duration: 0.25 }
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
              role="toolbar"
              aria-label="Annotation tools"
            >
              {tools.map((tool, index) => {
                const Icon = TOOL_ICONS[tool];
                const meta = TOOL_META[tool];
                const isActive = activeTool === tool;
                return (
                  <motion.div
                    key={tool}
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: index * 0.06 + 0.1,
                      duration: 0.3,
                      ease: [0.34, 1.56, 0.64, 1], // Spring-like easing for bounce effect
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={isActive ? 'default' : 'ghost'}
                          size="icon"
                          className={cn(
                            'h-9 w-9 rounded-full transition-colors',
                            isActive && 'shadow-sm',
                          )}
                          onClick={() => onToolChange(tool)}
                          aria-label={`${meta.label} tool`}
                          aria-pressed={isActive}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs font-medium">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground">Press {meta.shortcut}</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{
                  delay: tools.length * 0.06 + 0.1,
                  duration: 0.2,
                  ease: 'easeOut'
                }}
                className="mx-1 h-6 w-px bg-border/70"
                role="separator"
                aria-orientation="vertical"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: tools.length * 0.06 + 0.15,
                  duration: 0.3,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={!canUndo}
                      onClick={onUndo}
                      aria-label="Undo last change"
                    >
                      <RiArrowGoBackLine className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs font-medium">Undo</p>
                    <p className="text-[11px] text-muted-foreground">⌘Z or Ctrl+Z</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: tools.length * 0.06 + 0.21,
                  duration: 0.3,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={!canRedo}
                      onClick={onRedo}
                      aria-label="Redo last change"
                    >
                      <RiArrowGoForwardLine className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs font-medium">Redo</p>
                    <p className="text-[11px] text-muted-foreground">⇧⌘Z or Ctrl+Shift+Z</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
