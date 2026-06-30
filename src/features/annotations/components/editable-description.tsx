'use client';

/**
 * EditableDescription
 *
 * Click-to-edit annotation description used in both the thread panel header
 * (`size="default"`) and the on-canvas popover's expanded view (`size="compact"`).
 * ⌘/Ctrl+Enter saves, Esc cancels. Esc/save key events stop propagation so the
 * popover's document-level Esc-to-close handler doesn't fire while editing.
 *
 * @module features/annotations/components/editable-description
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditableDescriptionProps {
  description: string;
  canEdit: boolean;
  onSave: (description: string) => void;
  isSaving: boolean;
  /** 'default' for the thread panel; 'compact' for the on-canvas popover */
  size?: 'default' | 'compact';
  /** Placeholder/affordance shown when empty and the user can edit */
  emptyLabel?: string;
  /** Text shown when empty and the user cannot edit */
  readOnlyEmptyLabel?: string;
}

export function EditableDescription({
  description,
  canEdit,
  onSave,
  isSaving,
  size = 'default',
  emptyLabel = 'Add a description...',
  readOnlyEmptyLabel = 'Annotation thread',
}: EditableDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const compact = size === 'compact';
  const headingSize = compact ? 'text-xs font-medium line-clamp-1' : 'text-sm font-semibold';

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== description) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [value, description, onSave]);

  const handleCancel = useCallback(() => {
    setValue(description);
    setIsEditing(false);
  }, [description]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.stopPropagation();
        handleSave();
      } else if (e.key === 'Escape') {
        // Don't let the popover's document-level Esc handler close the whole
        // popover — Esc should only cancel this edit.
        e.stopPropagation();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const startEditing = useCallback(() => {
    // Seed from the current description at edit time, so external (optimistic)
    // updates while idle are picked up without a prop→state sync effect.
    setValue(description);
    setIsEditing(true);
  }, [description]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const end = textareaRef.current.value.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(end, end);
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="w-full space-y-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={emptyLabel}
          className={cn('resize-none', compact ? 'min-h-[44px] text-xs' : 'min-h-[60px] text-sm')}
          disabled={isSaving}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(compact && 'h-7 text-xs')}
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(compact && 'h-7 text-xs')}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <h3 className={cn(headingSize, 'text-foreground')}>
        {description || readOnlyEmptyLabel}
      </h3>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="group flex items-center gap-1.5 text-left"
      aria-label="Edit description"
    >
      <h3
        className={cn(
          headingSize,
          description ? 'text-foreground' : 'font-normal italic text-muted-foreground'
        )}
      >
        {description || emptyLabel}
      </h3>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
