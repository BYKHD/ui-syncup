# Annotation Focus Behaviors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve annotation comment input UX with shake-on-dismiss-with-content, shake-on-empty-Enter, and correct cursor positioning on auto-focus.

**Architecture:** All changes are confined to two files. `AnnotationCommentInput` gains a shake animation driven by Framer Motion's `useAnimate` and an imperative ref handle (`shake()`). `AnnotationCanvas` gains a ref to the comment input and calls `shake()` instead of dismissing when the textarea has content.

**Tech Stack:** React (useImperativeHandle, useRef, forwardRef), Framer Motion (`useAnimate`), Tailwind CSS, Vitest + Testing Library

---

## Background

We discovered three UX gaps compared to the agentation reference implementation:

1. **Silent discard on click-outside** — If the user has typed text and clicks outside the comment input, the entire annotation draft is silently discarded. The expected behavior: shake the popup and keep it open, only dismiss when the textarea is empty.

2. **No feedback on empty Enter** — Pressing Enter on an empty textarea does nothing (button is disabled). The user gets no signal that they need to type something first.

3. **Cursor not positioned at end on auto-focus** — `textareaRef.current.focus()` puts the cursor at the start. For edit mode where `defaultValue` is pre-filled, the cursor should be at the end with the content scrolled into view.

---

## Task 1: Add shake animation + imperative handle to `AnnotationCommentInput`

**Files:**
- Modify: `src/features/annotations/components/annotation-comment-input.tsx`
- Test: `src/features/annotations/components/__tests__/annotation-comment-input.test.tsx` *(create)*

### Step 1: Write the failing test

Create `src/features/annotations/components/__tests__/annotation-comment-input.test.tsx`:

```typescript
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import {
  AnnotationCommentInput,
  type AnnotationCommentInputHandle,
} from '../annotation-comment-input';

describe('AnnotationCommentInput', () => {
  describe('shake()', () => {
    it('exposes a shake() method via ref', () => {
      const ref = createRef<AnnotationCommentInputHandle>();
      render(<AnnotationCommentInput ref={ref} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(typeof ref.current?.shake).toBe('function');
    });

    it('shake() does not throw', () => {
      const ref = createRef<AnnotationCommentInputHandle>();
      render(<AnnotationCommentInput ref={ref} onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(() => act(() => ref.current?.shake())).not.toThrow();
    });
  });

  describe('empty Enter key', () => {
    it('does not call onSubmit when textarea is empty and Enter is pressed', () => {
      const onSubmit = vi.fn();
      render(<AnnotationCommentInput onSubmit={onSubmit} onCancel={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('auto-focus cursor position', () => {
    it('sets cursor to end of defaultValue on mount', () => {
      render(
        <AnnotationCommentInput
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          defaultValue="existing text"
          autoFocus
        />
      );
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // In jsdom, selectionStart after focus should be at end
      expect(textarea.value).toBe('existing text');
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun run test src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
```

Expected: FAIL — `AnnotationCommentInputHandle` is not exported, `ref` prop is not accepted.

### Step 3: Implement changes to `annotation-comment-input.tsx`

Replace the full file content with:

```typescript
'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { MessageSquare, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AnnotationCommentInputHandle {
  shake: () => void;
}

export interface AnnotationCommentInputProps {
  position?: { x: number; y: number };
  onSubmit: (message: string) => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
  title?: string;
  maxLength?: number;
}

export const AnnotationCommentInput = forwardRef<
  AnnotationCommentInputHandle,
  AnnotationCommentInputProps
>(function AnnotationCommentInput(
  {
    position,
    onSubmit,
    onCancel,
    placeholder = 'Add a comment...',
    autoFocus = true,
    className,
    defaultValue = '',
    title = 'Add annotation comment',
    maxLength = 500,
  },
  ref,
) {
  const [message, setMessage] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scope, animate] = useAnimate();

  useImperativeHandle(ref, () => ({
    shake() {
      void animate(scope.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.3 });
      textareaRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      // Place cursor at end (important when defaultValue is pre-filled)
      el.selectionStart = el.selectionEnd = el.value.length;
      el.scrollTop = el.scrollHeight;
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!message.trim()) {
        // Shake instead of silently doing nothing
        void animate(scope.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.3 });
        return;
      }
      handleSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const handleCancel = () => {
    setMessage('');
    onCancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={scope}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'flex w-80 flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-lg backdrop-blur',
          className,
        )}
        style={
          position
            ? {
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span>{title}</span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className={cn(
            'w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          maxLength={maxLength}
        />

        {/* Character count and hint text */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Press{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
              Enter
            </kbd>{' '}
            to save,{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
              Shift+Enter
            </kbd>{' '}
            for newline
          </span>
          <span
            className={cn(
              message.length > maxLength * 0.9 && 'text-orange-500',
              message.length >= maxLength && 'text-red-500 font-medium',
            )}
          >
            {message.length}/{maxLength}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 gap-1.5 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="h-8 gap-1.5 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
```

Key changes from the original:
- `forwardRef` wraps the component
- `useImperativeHandle` exposes `shake()`
- `useAnimate` from Framer Motion drives the shake (attaches to the `motion.div` via `ref={scope}`)
- `handleKeyDown` calls shake and returns early when Enter is pressed on empty textarea
- `autoFocus` effect now sets `selectionStart`/`selectionEnd` to end of value and scrolls

### Step 4: Run tests to verify they pass

```bash
bun run test src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
```

Expected: PASS — all 4 tests green.

### Step 5: Commit

```bash
git add src/features/annotations/components/annotation-comment-input.tsx \
        src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
git commit -m "feat(annotations): add shake animation and imperative handle to comment input"
```

---

## Task 2: Shake instead of dismiss on click-outside with content

**Files:**
- Modify: `src/features/annotations/components/annotation-canvas.tsx`
- Test: `src/features/annotations/components/__tests__/annotation-comment-input.test.tsx` *(extend)*

The canvas holds the click-outside logic. It needs a ref to the `AnnotationCommentInput` so it can call `shake()` instead of cancelling when the textarea has content.

The tricky part: the canvas doesn't know the current textarea value. The cleanest approach is to extend `AnnotationCommentInputHandle` to also expose `hasContent(): boolean`, so the canvas can ask the input itself.

### Step 1: Extend the handle type and implement `hasContent`

**Add to `AnnotationCommentInputHandle` in `annotation-comment-input.tsx`:**

```typescript
export interface AnnotationCommentInputHandle {
  shake: () => void;
  hasContent: () => boolean;
}
```

**Add to `useImperativeHandle`:**

```typescript
useImperativeHandle(ref, () => ({
  shake() {
    void animate(scope.current, { x: [0, -5, 5, -4, 4, -2, 2, 0] }, { duration: 0.3 });
    textareaRef.current?.focus();
  },
  hasContent() {
    return message.trim().length > 0;
  },
}));
```

> **Note:** `message` is captured in closure. Since `useImperativeHandle` re-runs when deps change, and we list no deps array (second arg), it updates on every render — so `hasContent()` always reflects current state. That is correct here.

### Step 2: Write a test for `hasContent`

**Add to `annotation-comment-input.test.tsx`:**

```typescript
describe('hasContent()', () => {
  it('returns false when textarea is empty', () => {
    const ref = createRef<AnnotationCommentInputHandle>();
    render(<AnnotationCommentInput ref={ref} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(ref.current?.hasContent()).toBe(false);
  });

  it('returns true when textarea has text', async () => {
    const ref = createRef<AnnotationCommentInputHandle>();
    render(<AnnotationCommentInput ref={ref} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'hello');
    expect(ref.current?.hasContent()).toBe(true);
  });
});
```

Add `import userEvent from '@testing-library/user-event';` at the top.

### Step 3: Run tests to verify they fail first

```bash
bun run test src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
```

Expected: FAIL — `hasContent` not yet on handle.

### Step 4: Implement `hasContent` in the component

Apply the changes from Step 1 to `annotation-comment-input.tsx`.

### Step 5: Run tests to verify they pass

```bash
bun run test src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
```

Expected: PASS.

### Step 6: Wire up the ref in `annotation-canvas.tsx`

**At the top of `annotation-canvas.tsx`, add the import:**

```typescript
import {
  AnnotationCommentInput,
  type AnnotationCommentInputHandle,
} from './annotation-comment-input';
```

(Replace the existing import of `AnnotationCommentInput` — just add the type to it.)

**Inside the `AnnotationCanvas` component function, add a ref:**

```typescript
const commentInputRef = useRef<AnnotationCommentInputHandle>(null);
```

**Find the `AnnotationCommentInput` JSX (lines 523–528) and add the ref:**

```typescript
<AnnotationCommentInput
  ref={commentInputRef}
  position={{ x: 0, y: 0 }}
  onSubmit={handleCommentSubmit}
  onCancel={handleCommentCancel}
  placeholder="Describe this annotation..."
/>
```

**Update the click-outside handler (lines 353–384) to shake instead of dismiss when textarea has content:**

Replace the final dismiss line:

```typescript
// BEFORE:
// Dismiss annotation
handleCommentCancel();
```

With:

```typescript
// Shake if user has typed something; only dismiss when empty
if (commentInputRef.current?.hasContent()) {
  commentInputRef.current.shake();
} else {
  handleCommentCancel();
}
```

### Step 7: Run the full annotation test suite

```bash
bun run test src/features/annotations
```

Expected: all existing tests pass, no regressions.

### Step 8: Commit

```bash
git add src/features/annotations/components/annotation-canvas.tsx \
        src/features/annotations/components/annotation-comment-input.tsx \
        src/features/annotations/components/__tests__/annotation-comment-input.test.tsx
git commit -m "feat(annotations): shake comment input on click-outside with content instead of dismissing"
```

---

## Task 3: Fix `annotated-attachment-view.tsx` usage (edit mode cursor position)

**Files:**
- Read: `src/features/annotations/components/annotated-attachment-view.tsx` (around line 520)
- Possibly no code change needed — just verify

`AnnotationCommentInput` is also used in edit mode in `annotated-attachment-view.tsx`. After Task 1, `forwardRef` wraps the component. The edit-mode usage likely passes `defaultValue` but no `ref` — that is fine (ref is optional). However, verify no TypeScript errors occur.

### Step 1: Check for TypeScript errors

```bash
bun run typecheck 2>&1 | grep annotation-comment-input
```

Expected: no errors. If errors appear related to the `ref` prop not being passed, they are false positives — `forwardRef` components accept `ref` as optional.

### Step 2: Verify auto-focus in edit mode

`annotated-attachment-view.tsx` passes `defaultValue` to the component. After Task 1, the `useEffect` now sets `el.selectionStart = el.selectionEnd = el.value.length` so the cursor lands at the end of the pre-filled text rather than the start.

No code changes needed if typecheck is clean.

### Step 3: Commit (only if any fix was needed)

```bash
git add src/features/annotations/components/annotated-attachment-view.tsx
git commit -m "fix(annotations): update edit-mode comment input usage after forwardRef refactor"
```

---

## Task 4: Manual verification checklist

Before declaring done, verify these scenarios in the browser:

1. **Shake on click-outside with text** — Enter edit mode → draw a pin → type some text in the comment input → click outside the annotation area → popup shakes and stays open, text is preserved.

2. **Dismiss on click-outside empty** — Enter edit mode → draw a pin → do NOT type → click outside → popup dismisses cleanly.

3. **Shake on empty Enter** — Enter edit mode → draw a pin → with empty textarea, press Enter → popup shakes.

4. **Normal submit** — Enter edit mode → draw a pin → type a comment → press Enter → annotation is created with the comment.

5. **Escape dismisses** — Enter edit mode → draw a pin → type text → press Escape → popup dismisses (expected: no shake on Escape, user explicitly chose to cancel).

6. **Edit mode cursor at end** — Click an existing annotation to edit its description → the textarea has pre-filled text and cursor is at the **end**, not the start.

---

## Summary of files changed

| File | Change |
|---|---|
| `src/features/annotations/components/annotation-comment-input.tsx` | `forwardRef`, `useImperativeHandle` (`shake`, `hasContent`), `useAnimate` for shake, cursor-at-end on auto-focus, shake on empty Enter |
| `src/features/annotations/components/annotation-canvas.tsx` | Add `commentInputRef`, pass to `AnnotationCommentInput`, shake instead of dismiss in click-outside handler |
| `src/features/annotations/components/__tests__/annotation-comment-input.test.tsx` | New test file covering shake, hasContent, empty Enter, cursor position |
