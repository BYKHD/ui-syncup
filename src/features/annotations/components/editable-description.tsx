'use client';

/**
 * EditableDescription
 *
 * Click-to-edit annotation description used in both the thread panel header
 * (`size="default"`) and the on-canvas popover's expanded view (`size="compact"`).
 * Shares edit-state mechanics (⌘/Ctrl+Enter save, Esc cancel, Esc stop-propagation)
 * with comments via `useInlineEdit`.
 *
 * @module features/annotations/components/editable-description
 */

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInlineEdit } from '../hooks/use-inline-edit';

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
  const { isEditing, draft, setDraft, start, save, cancel, handleKeyDown, textareaRef } = useInlineEdit({
    value: description,
    onCommit: onSave,
  });

  const compact = size === 'compact';
  const headingSize = compact ? 'text-xs font-medium line-clamp-1' : 'text-sm font-semibold';

  if (isEditing) {
    return (
      <div className="w-full space-y-2">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
            onClick={cancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(compact && 'h-7 text-xs')}
            onClick={save}
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
      onClick={start}
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
