'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RiLoader4Line } from '@remixicon/react';
import { Textarea } from '@/src/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface InlineEditableTextareaProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  canEdit: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  className?: string;
  displayClassName?: string;
  // External editing state control for keyboard shortcuts
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export function InlineEditableTextarea({
  value,
  onSave,
  canEdit,
  placeholder = 'Click to edit',
  minLength = 20,
  maxLength = 5000,
  rows = 4,
  className,
  displayClassName,
  isEditing: externalIsEditing,
  onEditingChange
}: InlineEditableTextareaProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use external editing state if provided, otherwise use internal state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const setIsEditing = (editing: boolean) => {
    if (onEditingChange) {
      onEditingChange(editing);
    } else {
      setInternalIsEditing(editing);
    }
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const validate = (val: string): string | null => {
    if (val.trim().length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    if (val.length > maxLength) {
      return `Must be no more than ${maxLength} characters`;
    }
    return null;
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    // Validation
    const validationError = validate(trimmedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    // No change
    if (trimmedValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
      
      // Show success feedback
      toast.success('Saved', {
        description: 'Changes saved successfully',
        duration: 2000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo()
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      toast.error('Failed to save', {
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = async () => {
    try {
      await onSave(value);
      toast.success('Undone');
    } catch (err) {
      toast.error('Failed to undo');
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
    // Note: We don't use Enter to save for textarea, only blur
  };

  if (!canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn('whitespace-pre-wrap text-sm cursor-not-allowed opacity-75', displayClassName)}
            role="textbox"
            aria-readonly="true"
            aria-label={`${placeholder} (read-only)`}
          >
            {value || <span className="text-muted-foreground">{placeholder}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>You don&apos;t have permission to edit this field</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          'w-full text-left whitespace-pre-wrap text-sm hover:bg-accent/50 rounded px-2 py-1 -mx-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          displayClassName
        )}
        type="button"
        data-editable="true"
        aria-label={`Edit ${placeholder.toLowerCase()}. Current value: ${value || 'empty'}. Press Enter or click to edit.`}
        role="textbox"
        tabIndex={0}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </button>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          rows={rows}
          className={cn(error && 'border-destructive')}
          maxLength={maxLength}
          aria-label={`Editing ${placeholder.toLowerCase()}`}
          aria-describedby={error ? 'edit-error' : 'edit-help'}
        />
        
        {isSaving && (
          <div className="absolute right-2 top-2">
            <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {error && (
        <p id="edit-error" className="text-xs text-destructive" role="alert">{error}</p>
      )}

      <div id="edit-help" className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Click outside to save, Esc to cancel</span>
        <span aria-label={`Character count: ${editValue.length} of ${maxLength}`}>
          {editValue.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
