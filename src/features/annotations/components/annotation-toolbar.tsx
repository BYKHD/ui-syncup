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
import {
  MapPin,
  Square,
  ArrowUpRight,
  Undo2,
  Redo2,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TOOL_ICONS: Record<AnnotationToolId, LucideIcon> = {
  pin: MapPin,
  box: Square,
  arrow: ArrowUpRight,
};

const TOOL_META: Record<AnnotationToolId, { label: string; shortcut: string }> = {
  pin: { label: 'Pin', shortcut: '1 or P' },
  box: { label: 'Box', shortcut: '2 or B' },
  arrow: { label: 'Arrow', shortcut: '3 or A' },
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
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
          className,
        )}
        role="toolbar"
        aria-label="Annotation toolbar"
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
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">
              {editModeEnabled ? 'Exit Edit Mode' : 'Edit Mode'}
            </p>
            <p className="text-[11px] text-muted-foreground">Press E</p>
          </TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border/70" role="separator" aria-orientation="vertical" />

        {tools.map((tool) => {
          const Icon = TOOL_ICONS[tool];
          const meta = TOOL_META[tool];
          const isActive = activeTool === tool;
          return (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-full transition-colors',
                    isActive && 'shadow-sm',
                  )}
                  disabled={!editModeEnabled}
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
          );
        })}

        <div className="mx-1 h-6 w-px bg-border/70" role="separator" aria-orientation="vertical" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={!canUndo || !editModeEnabled}
              onClick={onUndo}
              aria-label="Undo last change"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Undo</p>
            <p className="text-[11px] text-muted-foreground">⌘Z or Ctrl+Z</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={!canRedo || !editModeEnabled}
              onClick={onRedo}
              aria-label="Redo last change"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Redo</p>
            <p className="text-[11px] text-muted-foreground">⇧⌘Z or Ctrl+Shift+Z</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
