import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ANNOTATION_TOOL_IDS,
  type AnnotationHistoryEntry,
  type AnnotationToolId,
} from '../types';

const HISTORY_LIMIT = 50;

const TOOL_SHORTCUTS: Record<AnnotationToolId, string[]> = {
  pin: ['1', 'p'],
  box: ['2', 'b'],
  arrow: ['3', 'a'],
  highlight: ['4', 'h'],
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
}

export interface AnnotationToolShortcut {
  tool: AnnotationToolId;
  keys: string[];
}

export function useAnnotationTools(options: UseAnnotationToolsOptions = {}) {
  const {
    initialTool = 'pin',
    initialEditMode = false,
    enableKeyboardShortcuts = true,
  } = options;

  const [activeTool, setActiveTool] = useState<AnnotationToolId>(initialTool);
  const [editModeEnabled, setEditModeEnabled] = useState<boolean>(initialEditMode);
  const [history, setHistory] = useState<AnnotationHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationHistoryEntry[]>([]);
  const [handToolActive, setHandToolActive] = useState<boolean>(false);

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
    setHistory((prev) => {
      const nextHistory = [...prev, entry].slice(-HISTORY_LIMIT);
      return nextHistory;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const nextHistory = prev.slice(0, -1);
      const popped = prev[prev.length - 1];
      setRedoStack((future) => [popped, ...future]);
      return nextHistory;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const [head, ...rest] = prev;
      setHistory((hist) => [...hist, head].slice(-HISTORY_LIMIT));
      return rest;
    });
  }, []);

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

      if (!editModeEnabled) return;

      const nextTool = tools.find((tool) => TOOL_SHORTCUTS[tool].includes(key));
      if (nextTool) {
        event.preventDefault();
        selectTool(nextTool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, editModeEnabled, redo, selectTool, toggleEditMode, tools, undo]);

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
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
    resetHistory,
  };
}
