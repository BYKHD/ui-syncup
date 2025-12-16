import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ANNOTATION_TOOL_IDS,
  type AnnotationHistoryEntry,
  type AnnotationToolId,
  type AnnotationSnapshot,
  type AnnotationActionType,
} from '../types';
import { createHistoryEntry, createSnapshot, addToHistory } from '../utils/history-manager';

const HISTORY_LIMIT = 50;

const TOOL_SHORTCUTS: Record<AnnotationToolId, string[]> = {
  cursor: ['1', 'c'],
  pin: ['2', 'p'],
  box: ['3', 'b'],
};

const isInputLikeElement = (target: EventTarget | null): target is HTMLElement => {
  if (!target || !(target as HTMLElement).tagName) return false;
  const tag = (target as HTMLElement).tagName?.toLowerCase();
  const editable = (target as HTMLElement).getAttribute('contenteditable');
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    editable === '' ||
    editable === 'true'
  );
};

export interface UseAnnotationToolsOptions {
  initialTool?: AnnotationToolId;
  initialEditMode?: boolean;
  enableKeyboardShortcuts?: boolean;
  activeAnnotationId?: string | null; // Currently selected annotation for edit/delete
  onUndo?: (entry: AnnotationHistoryEntry) => void;
  onRedo?: (entry: AnnotationHistoryEntry) => void;
  onEdit?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
}

export interface AnnotationToolShortcut {
  tool: AnnotationToolId;
  keys: string[];
}

export function useAnnotationTools(options: UseAnnotationToolsOptions = {}) {
  const {
    initialTool = 'cursor',
    initialEditMode = false,
    enableKeyboardShortcuts = true,
    activeAnnotationId = null,
    onUndo,
    onRedo,
    onEdit,
    onDelete,
  } = options;

  const [activeTool, setActiveTool] = useState<AnnotationToolId>(initialTool);
  const [editModeEnabled, setEditModeEnabled] = useState<boolean>(initialEditMode);
  const [history, setHistory] = useState<AnnotationHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationHistoryEntry[]>([]);
  const [handToolActive, setHandToolActive] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);

  const tools = ANNOTATION_TOOL_IDS;
  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  const selectTool = useCallback((tool: AnnotationToolId) => {
    setActiveTool(tool);
  }, []);

  const toggleEditMode = useCallback((next?: boolean) => {
    setEditModeEnabled((prev) => (typeof next === 'boolean' ? next : !prev));
  }, []);

  const pushHistory = useCallback((entry: AnnotationHistoryEntry) => {
    setHistory((prev) => addToHistory(prev, entry));
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const nextHistory = prev.slice(0, -1);
      const entry = prev[prev.length - 1];
      
      // Move entry to redo stack
      setRedoStack((future) => [entry, ...future]);
      
      // Call onUndo with the entry
      queueMicrotask(() => {
        onUndo?.(entry);
      });
      
      return nextHistory;
    });
  }, [onUndo]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const [entry, ...rest] = prev;
      
      // Move entry back to history
      setHistory((hist) => addToHistory(hist, entry));
      
      // Call onRedo with the entry
      queueMicrotask(() => {
        onRedo?.(entry);
      });
      
      return rest;
    });
  }, [onRedo]);

  const resetHistory = useCallback(() => {
    setHistory([]);
    setRedoStack([]);
  }, []);

  const shortcuts: AnnotationToolShortcut[] = useMemo(
    () => tools.map((tool) => ({ tool, keys: TOOL_SHORTCUTS[tool] })),
    [tools],
  );

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        setHandToolActive(false);
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [enableKeyboardShortcuts]);

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputLikeElement(event.target)) return;
      const key = event.key.toLowerCase();
      const isModKey = event.metaKey || event.ctrlKey;

      if (isModKey && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isModKey && (key === 'y' || (event.shiftKey && key === 'z'))) {
        event.preventDefault();
        redo();
        return;
      }

      // ? key: show keyboard shortcuts help modal
      if (key === '?' || (event.shiftKey && key === '/')) {
        event.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      if (key === 'e') {
        event.preventDefault();
        toggleEditMode();
        return;
      }

      if (key === ' ' && editModeEnabled) {
        event.preventDefault();
        setHandToolActive(true);
        return;
      }

      // Enter key: edit selected annotation
      if (key === 'enter' && activeAnnotationId && editModeEnabled) {
        event.preventDefault();
        onEdit?.(activeAnnotationId);
        return;
      }

      // Delete/Backspace key: delete selected annotation
      if ((key === 'delete' || key === 'backspace') && activeAnnotationId && editModeEnabled) {
        event.preventDefault();
        onDelete?.(activeAnnotationId);
        return;
      }

      if (!editModeEnabled) return;

      const nextTool = tools.find((tool) => TOOL_SHORTCUTS[tool].includes(key));
      if (nextTool) {
        event.preventDefault();
        selectTool(nextTool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, editModeEnabled, activeAnnotationId, redo, selectTool, toggleEditMode, tools, undo, onEdit, onDelete]);

  useEffect(() => {
    if (!editModeEnabled) {
      setHandToolActive(false);
    }
  }, [editModeEnabled]);

  return {
    tools,
    shortcuts,
    activeTool,
    editModeEnabled,
    canUndo,
    canRedo,
    history,
    redoStack,
    handToolActive,
    showShortcutsHelp,
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
    resetHistory,
    setShowShortcutsHelp,
  };
}
