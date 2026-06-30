'use client';

/**
 * useInlineEdit
 *
 * Shared click-to-edit state for the annotation inline editors (description +
 * comments). Owns the edit toggle, draft buffer, save-guard (trim + skip
 * unchanged), and ⌘/Ctrl+Enter / Esc handling. Esc/save stop propagation so
 * editing inside the on-canvas popover doesn't trip its document-level
 * Esc-to-close handler.
 *
 * @module features/annotations/hooks/use-inline-edit
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface UseInlineEditOptions {
  /** Current persisted value (re-read each time editing starts) */
  value: string;
  /** Called with the trimmed draft only when it is non-empty and changed */
  onCommit: (next: string) => void;
}

export function useInlineEdit({ value, onCommit }: UseInlineEditOptions) {
  const [isEditing, setIsEditing] = useState(false);
  // Seeded on start(); never rendered before then, so init empty rather than
  // deriving state from the value prop.
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const start = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onCommit(trimmed);
    }
    setIsEditing(false);
  }, [draft, value, onCommit]);

  const cancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.stopPropagation();
        save();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        cancel();
      }
    },
    [save, cancel]
  );

  // Focus + caret-to-end when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const end = textareaRef.current.value.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(end, end);
    }
  }, [isEditing]);

  return { isEditing, draft, setDraft, start, save, cancel, handleKeyDown, textareaRef };
}
