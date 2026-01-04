'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RiLoader4Line } from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InlineEditableTextProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  canEdit: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  className?: string;
  displayClassName?: string;
  // External editing state control for keyboard shortcuts
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  renderView?: (props: { value: string; placeholder: string; startEditing: () => void }) => React.ReactNode;
}

export function InlineEditableText({
  value,
  onSave,
  canEdit,
  placeholder = 'Click to edit',
  minLength = 4,
  maxLength = 200,
  className,
  displayClassName,
  isEditing: externalIsEditing,
  onEditingChange,
  renderView
}: InlineEditableTextProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const validate = (val: string): string | null => {
    if (minLength > 0 && val.trim().length < minLength) {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn('text-sm cursor-not-allowed opacity-75', displayClassName)}
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
    if (renderView) {
      return (
        <>
          {renderView({
            value,
            placeholder,
            startEditing: () => setIsEditing(true)
          })}
        </>
      );
    }

    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          'w-full text-left text-sm hover:bg-accent/50 rounded px-2 py-1 -mx-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={cn('h-8', error && 'border-destructive')}
          maxLength={maxLength}
          aria-label={`Editing ${placeholder.toLowerCase()}`}
          aria-describedby={error ? 'edit-error' : 'edit-help'}
        />
        
        {isSaving && (
          <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p id="edit-error" className="text-xs text-destructive" role="alert">{error}</p>
      )}

      <div id="edit-help" className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Press Enter to save, Esc to cancel</span>
      </div>
    </div>
  );
}
