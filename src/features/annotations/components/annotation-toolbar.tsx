'use client';

import type { AnnotationToolId } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  Highlighter,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TOOL_ICONS: Record<AnnotationToolId, LucideIcon> = {
  pin: MapPin,
  box: Square,
  arrow: ArrowUpRight,
  highlight: Highlighter,
};

const TOOL_LABELS: Record<AnnotationToolId, { label: string; shortcut: string }> = {
  pin: { label: 'Pin', shortcut: '1 · P' },
  box: { label: 'Box', shortcut: '2 · B' },
  arrow: { label: 'Arrow', shortcut: '3 · A' },
  highlight: { label: 'Highlight', shortcut: '4 · H' },
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
    <TooltipProvider delayDuration={100}>
      <Card
        className={cn(
          'w-full max-w-md rounded-2xl border-border/70 bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Annotation Tools
            </p>
            <p className="text-xs text-muted-foreground/90">Press E to toggle edit mode</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="annotation-edit-mode" className="text-xs font-medium text-muted-foreground">
              Edit mode
            </Label>
            <Switch
              id="annotation-edit-mode"
              checked={editModeEnabled}
              onCheckedChange={onToggleEditMode}
              aria-label="Toggle annotation edit mode"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => {
            const Icon = TOOL_ICONS[tool];
            const meta = TOOL_LABELS[tool];
            const isActive = activeTool === tool;
            return (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isActive ? 'default' : 'secondary'}
                    size="sm"
                    aria-label={`${meta.label} tool`}
                    aria-pressed={isActive}
                    disabled={!editModeEnabled}
                    onClick={() => onToolChange(tool)}
                    className={cn(
                      'justify-start gap-2 rounded-xl border text-left shadow-sm',
                      isActive && 'shadow-primary/20',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        {meta.shortcut}
                      </span>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs font-semibold">{meta.label}</p>
                  <p className="text-[11px] text-muted-foreground">Shortcut · {meta.shortcut.replace('·', '/')}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canUndo || !editModeEnabled}
                  onClick={onUndo}
                  aria-label="Undo annotation change"
                  className="w-10 rounded-full"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">Undo</p>
                <p className="text-[11px] text-muted-foreground">⌘ / Ctrl + Z</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canRedo || !editModeEnabled}
                  onClick={onRedo}
                  aria-label="Redo annotation change"
                  className="w-10 rounded-full"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">Redo</p>
                <p className="text-[11px] text-muted-foreground">⇧ + ⌘ / Ctrl + Z</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Cmd/Ctrl + Z to undo · Shift + Cmd/Ctrl + Z to redo
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
