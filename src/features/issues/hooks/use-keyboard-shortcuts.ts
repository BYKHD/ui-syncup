'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  target?: HTMLElement | null;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  target
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const activeElement = document.activeElement;
    const isInputElement = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true' ||
      activeElement.getAttribute('role') === 'textbox'
    );

    // Allow Escape key even in input fields for canceling
    if (isInputElement && event.key !== 'Escape') {
      return;
    }

    for (const shortcut of shortcuts) {
      if (shortcut.disabled) continue;

      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        if (shortcut.stopPropagation) {
          event.stopPropagation();
        }
        shortcut.action();
        break;
      }
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    const element = target || document;
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, target]);

  return {
    shortcuts
  };
}

// Helper function to format keyboard shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('⌘');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

// Helper function to get platform-specific modifier key
export function getModifierKey(): 'ctrlKey' | 'metaKey' {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac') 
    ? 'metaKey' 
    : 'ctrlKey';
}