# Annotation Marker Color Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users pick a marker color (6 options) that persists in localStorage and instantly recolors all annotation pins, boxes, and handles on the canvas.

**Architecture:** Color is a viewer preference — it is NOT stored on the annotation record. A `data-annotation-accent` attribute on the root container drives all color changes via CSS cascade. `AnnotationPin` and `AnnotationBox` require zero changes because they already consume `bg-annotation` / `border-annotation` Tailwind tokens that map to `--annotation` / `--annotation-bold` CSS variables. We just override those variables per accent choice.

**Tech Stack:** CSS custom properties (OKLCH), Tailwind CSS v4 (`@theme inline`), React (`useState`, `useCallback`), localStorage, Framer Motion (swatch animation), Vitest + Testing Library

---

## Background & Design Decisions

**Reference:** agentation uses `data-agentation-accent` attribute + `--agentation-color-accent` CSS variable driven by 7 sRGB/P3 swatches. We follow the same attribute-cascade pattern but use OKLCH (matching the existing project color system) and simplify to 6 colors.

**Why CSS attributes instead of props:** The annotation layer, pin, box, and toolbar are deep in the tree. Propagating color as a prop through all of them adds friction. A single `data-annotation-accent="blue"` on the outer wrapper overrides the CSS variables for the whole subtree instantly, with no re-renders in children.

**Why not store color on the annotation record:** Color is a display preference of the current viewer, like zoom level. Persisting it per-annotation would require API changes and schema migrations for a cosmetic feature.

**Default color:** Orange — keeps the current behavior as the default (no change for existing users).

---

## Color Palette (OKLCH)

Six colors chosen to cover the spectrum while matching the project's OKLCH convention.
Each entry has: `id`, `label`, `light` mode values, `dark` mode values.

```
orange  hue ~41   (current default)
red     hue ~25
yellow  hue ~90
green   hue ~145
blue    hue ~250
indigo  hue ~275
```

---

## Task 1: Define `ANNOTATION_COLOR_OPTIONS` constant

**Files:**
- Create: `src/features/annotations/constants/annotation-colors.ts`
- Test: `src/features/annotations/constants/__tests__/annotation-colors.test.ts` *(create)*

### Step 1: Write the failing test

Create `src/features/annotations/constants/__tests__/annotation-colors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ANNOTATION_COLOR_OPTIONS,
  DEFAULT_ANNOTATION_COLOR_ID,
  type AnnotationColorOption,
} from '../annotation-colors';

describe('ANNOTATION_COLOR_OPTIONS', () => {
  it('has exactly 6 entries', () => {
    expect(ANNOTATION_COLOR_OPTIONS).toHaveLength(6);
  });

  it('each entry has id, label, and light/dark OKLCH values', () => {
    for (const option of ANNOTATION_COLOR_OPTIONS) {
      expect(option.id).toBeTruthy();
      expect(option.label).toBeTruthy();
      expect(option.light.annotation).toMatch(/^oklch\(/);
      expect(option.light.annotationBold).toMatch(/^oklch\(/);
      expect(option.light.annotationLite).toMatch(/^oklch\(/);
      expect(option.dark.annotation).toMatch(/^oklch\(/);
      expect(option.dark.annotationBold).toMatch(/^oklch\(/);
      expect(option.dark.annotationLite).toMatch(/^oklch\(/);
    }
  });

  it('DEFAULT_ANNOTATION_COLOR_ID is "orange"', () => {
    expect(DEFAULT_ANNOTATION_COLOR_ID).toBe('orange');
  });

  it('default color exists in options', () => {
    expect(ANNOTATION_COLOR_OPTIONS.find(c => c.id === DEFAULT_ANNOTATION_COLOR_ID)).toBeDefined();
  });

  it('all ids are unique', () => {
    const ids = ANNOTATION_COLOR_OPTIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun run test src/features/annotations/constants/__tests__/annotation-colors.test.ts
```

Expected: FAIL — module not found.

### Step 3: Create `annotation-colors.ts`

Create `src/features/annotations/constants/annotation-colors.ts`:

```typescript
export interface AnnotationColorValues {
  /** Base annotation color (marker background when inactive) */
  annotation: string;
  /** Bold annotation color (marker background when active, border when active) */
  annotationBold: string;
  /** Lite annotation color (subtle backgrounds, hover fills) */
  annotationLite: string;
  /** Foreground color on annotation backgrounds */
  annotationForeground: string;
}

export interface AnnotationColorOption {
  id: string;
  label: string;
  /** Preview color for the swatch button (light mode representative hex) */
  previewColor: string;
  light: AnnotationColorValues;
  dark: AnnotationColorValues;
}

export const DEFAULT_ANNOTATION_COLOR_ID = 'orange';

export const ANNOTATION_COLOR_OPTIONS: AnnotationColorOption[] = [
  {
    id: 'orange',
    label: 'Orange',
    previewColor: '#e8612a',
    light: {
      annotation: 'oklch(64.6% 0.222 41.116)',
      annotationBold: 'oklch(55.3% 0.195 38.402)',
      annotationLite: 'oklch(95.4% 0.038 75.164)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
    dark: {
      annotation: 'oklch(83.7% 0.128 66.29)',
      annotationBold: 'oklch(75% 0.183 55.934)',
      annotationLite: 'oklch(40.8% 0.123 38.172)',
      annotationForeground: 'oklch(0 0 0)',
    },
  },
  {
    id: 'red',
    label: 'Red',
    previewColor: '#e53935',
    light: {
      annotation: 'oklch(58% 0.22 25)',
      annotationBold: 'oklch(48% 0.22 25)',
      annotationLite: 'oklch(95% 0.04 25)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
    dark: {
      annotation: 'oklch(78% 0.16 25)',
      annotationBold: 'oklch(68% 0.19 25)',
      annotationLite: 'oklch(38% 0.12 25)',
      annotationForeground: 'oklch(0 0 0)',
    },
  },
  {
    id: 'yellow',
    label: 'Yellow',
    previewColor: '#f59e0b',
    light: {
      annotation: 'oklch(76% 0.17 88)',
      annotationBold: 'oklch(66% 0.17 88)',
      annotationLite: 'oklch(96% 0.04 90)',
      annotationForeground: 'oklch(0.145 0 0)',
    },
    dark: {
      annotation: 'oklch(86% 0.13 88)',
      annotationBold: 'oklch(76% 0.15 88)',
      annotationLite: 'oklch(42% 0.1 88)',
      annotationForeground: 'oklch(0.145 0 0)',
    },
  },
  {
    id: 'green',
    label: 'Green',
    previewColor: '#16a34a',
    light: {
      annotation: 'oklch(62% 0.18 145)',
      annotationBold: 'oklch(52% 0.18 145)',
      annotationLite: 'oklch(95% 0.03 145)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
    dark: {
      annotation: 'oklch(78% 0.14 145)',
      annotationBold: 'oklch(68% 0.16 145)',
      annotationLite: 'oklch(38% 0.1 145)',
      annotationForeground: 'oklch(0 0 0)',
    },
  },
  {
    id: 'blue',
    label: 'Blue',
    previewColor: '#2563eb',
    light: {
      annotation: 'oklch(58% 0.2 250)',
      annotationBold: 'oklch(48% 0.2 250)',
      annotationLite: 'oklch(95% 0.03 250)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
    dark: {
      annotation: 'oklch(76% 0.15 250)',
      annotationBold: 'oklch(66% 0.18 250)',
      annotationLite: 'oklch(38% 0.1 250)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    previewColor: '#4f46e5',
    light: {
      annotation: 'oklch(54% 0.2 275)',
      annotationBold: 'oklch(44% 0.2 275)',
      annotationLite: 'oklch(95% 0.03 275)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
    dark: {
      annotation: 'oklch(74% 0.14 275)',
      annotationBold: 'oklch(64% 0.17 275)',
      annotationLite: 'oklch(38% 0.1 275)',
      annotationForeground: 'oklch(0.985 0 0)',
    },
  },
];
```

### Step 4: Run tests to verify they pass

```bash
bun run test src/features/annotations/constants/__tests__/annotation-colors.test.ts
```

Expected: PASS — 5 tests green.

### Step 5: Export from the annotations barrel

Open `src/features/annotations/constants/index.ts` (or create it if missing).
Add:

```typescript
export * from './annotation-colors';
```

Then verify it's accessible from the feature barrel `src/features/annotations/index.ts` — if that file re-exports `constants`, nothing extra is needed. Otherwise add:

```typescript
export * from './constants';
```

### Step 6: Commit

```bash
git add src/features/annotations/constants/annotation-colors.ts \
        src/features/annotations/constants/__tests__/annotation-colors.test.ts
git commit -m "feat(annotations): add ANNOTATION_COLOR_OPTIONS constant with 6 OKLCH colors"
```

---

## Task 2: Create `useAnnotationColor` hook

**Files:**
- Create: `src/features/annotations/hooks/use-annotation-color.ts`
- Test: `src/features/annotations/hooks/__tests__/use-annotation-color.test.ts` *(create)*

### Step 1: Write the failing test

Create `src/features/annotations/hooks/__tests__/use-annotation-color.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationColor } from '../use-annotation-color';
import { DEFAULT_ANNOTATION_COLOR_ID } from '../../constants/annotation-colors';

describe('useAnnotationColor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default color id on first use', () => {
    const { result } = renderHook(() => useAnnotationColor());
    expect(result.current.colorId).toBe(DEFAULT_ANNOTATION_COLOR_ID);
  });

  it('setColor updates the colorId', () => {
    const { result } = renderHook(() => useAnnotationColor());
    act(() => result.current.setColor('blue'));
    expect(result.current.colorId).toBe('blue');
  });

  it('persists the selected color to localStorage', () => {
    const { result } = renderHook(() => useAnnotationColor());
    act(() => result.current.setColor('indigo'));
    expect(localStorage.getItem('annotation-color-preference')).toBe('indigo');
  });

  it('reads a previously saved color from localStorage on mount', () => {
    localStorage.setItem('annotation-color-preference', 'green');
    const { result } = renderHook(() => useAnnotationColor());
    expect(result.current.colorId).toBe('green');
  });

  it('ignores an invalid stored color and falls back to default', () => {
    localStorage.setItem('annotation-color-preference', 'hotpink');
    const { result } = renderHook(() => useAnnotationColor());
    expect(result.current.colorId).toBe(DEFAULT_ANNOTATION_COLOR_ID);
  });

  it('returns the full color option object', () => {
    const { result } = renderHook(() => useAnnotationColor());
    expect(result.current.colorOption).toBeDefined();
    expect(result.current.colorOption?.id).toBe(DEFAULT_ANNOTATION_COLOR_ID);
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun run test src/features/annotations/hooks/__tests__/use-annotation-color.test.ts
```

Expected: FAIL — module not found.

### Step 3: Implement `use-annotation-color.ts`

Create `src/features/annotations/hooks/use-annotation-color.ts`:

```typescript
import { useCallback, useState } from 'react';
import {
  ANNOTATION_COLOR_OPTIONS,
  DEFAULT_ANNOTATION_COLOR_ID,
  type AnnotationColorOption,
} from '../constants/annotation-colors';

const STORAGE_KEY = 'annotation-color-preference';

function readStoredColorId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ANNOTATION_COLOR_OPTIONS.some(c => c.id === stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable (SSR or privacy mode)
  }
  return DEFAULT_ANNOTATION_COLOR_ID;
}

export interface UseAnnotationColorReturn {
  colorId: string;
  colorOption: AnnotationColorOption | undefined;
  setColor: (id: string) => void;
}

export function useAnnotationColor(): UseAnnotationColorReturn {
  const [colorId, setColorId] = useState<string>(readStoredColorId);

  const setColor = useCallback((id: string) => {
    if (!ANNOTATION_COLOR_OPTIONS.some(c => c.id === id)) return;
    setColorId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore write failures
    }
  }, []);

  const colorOption = ANNOTATION_COLOR_OPTIONS.find(c => c.id === colorId);

  return { colorId, colorOption, setColor };
}
```

### Step 4: Run tests to verify they pass

```bash
bun run test src/features/annotations/hooks/__tests__/use-annotation-color.test.ts
```

Expected: PASS — 6 tests green.

### Step 5: Commit

```bash
git add src/features/annotations/hooks/use-annotation-color.ts \
        src/features/annotations/hooks/__tests__/use-annotation-color.test.ts
git commit -m "feat(annotations): add useAnnotationColor hook with localStorage persistence"
```

---

## Task 3: Add CSS variable overrides to `globals.css`

**Files:**
- Modify: `src/styles/globals.css`

No tests for CSS. Manual verification in Task 6.

### Step 1: Add accent attribute rules after the `.dark` block

After line 146 (end of `.dark` block) in `src/styles/globals.css`, add:

```css
/* ─── Annotation color accent overrides ─────────────────────────────────── */
/* Applied via data-annotation-accent attribute on the annotation container.  */
/* Overrides the default orange --annotation* variables for each color theme. */

/* Orange is the default — already defined in :root and .dark, no override needed */

[data-annotation-accent="red"] {
  --annotation: oklch(58% 0.22 25);
  --annotation-bold: oklch(48% 0.22 25);
  --annotation-lite: oklch(95% 0.04 25);
  --annotation-foreground: oklch(0.985 0 0);
}
[data-annotation-accent="red"]:is(.dark *) {
  --annotation: oklch(78% 0.16 25);
  --annotation-bold: oklch(68% 0.19 25);
  --annotation-lite: oklch(38% 0.12 25);
  --annotation-foreground: oklch(0 0 0);
}

[data-annotation-accent="yellow"] {
  --annotation: oklch(76% 0.17 88);
  --annotation-bold: oklch(66% 0.17 88);
  --annotation-lite: oklch(96% 0.04 90);
  --annotation-foreground: oklch(0.145 0 0);
}
[data-annotation-accent="yellow"]:is(.dark *) {
  --annotation: oklch(86% 0.13 88);
  --annotation-bold: oklch(76% 0.15 88);
  --annotation-lite: oklch(42% 0.1 88);
  --annotation-foreground: oklch(0.145 0 0);
}

[data-annotation-accent="green"] {
  --annotation: oklch(62% 0.18 145);
  --annotation-bold: oklch(52% 0.18 145);
  --annotation-lite: oklch(95% 0.03 145);
  --annotation-foreground: oklch(0.985 0 0);
}
[data-annotation-accent="green"]:is(.dark *) {
  --annotation: oklch(78% 0.14 145);
  --annotation-bold: oklch(68% 0.16 145);
  --annotation-lite: oklch(38% 0.1 145);
  --annotation-foreground: oklch(0 0 0);
}

[data-annotation-accent="blue"] {
  --annotation: oklch(58% 0.2 250);
  --annotation-bold: oklch(48% 0.2 250);
  --annotation-lite: oklch(95% 0.03 250);
  --annotation-foreground: oklch(0.985 0 0);
}
[data-annotation-accent="blue"]:is(.dark *) {
  --annotation: oklch(76% 0.15 250);
  --annotation-bold: oklch(66% 0.18 250);
  --annotation-lite: oklch(38% 0.1 250);
  --annotation-foreground: oklch(0.985 0 0);
}

[data-annotation-accent="indigo"] {
  --annotation: oklch(54% 0.2 275);
  --annotation-bold: oklch(44% 0.2 275);
  --annotation-lite: oklch(95% 0.03 275);
  --annotation-foreground: oklch(0.985 0 0);
}
[data-annotation-accent="indigo"]:is(.dark *) {
  --annotation: oklch(74% 0.14 275);
  --annotation-bold: oklch(64% 0.17 275);
  --annotation-lite: oklch(38% 0.1 275);
  --annotation-foreground: oklch(0.985 0 0);
}
```

> **Why `:is(.dark *)` not `.dark [data-annotation-accent]`:** The project uses `@custom-variant dark (&:is(.dark *))` (globals.css line 5). To match that convention exactly, we use the same selector shape for the dark mode overrides.

### Step 2: Commit

```bash
git add src/styles/globals.css
git commit -m "feat(annotations): add data-annotation-accent CSS variable overrides for 6 colors"
```

---

## Task 4: Add color picker to `AnnotationToolbar`

**Files:**
- Modify: `src/features/annotations/components/annotation-toolbar.tsx`
- Test: `src/features/annotations/components/__tests__/annotation-toolbar.test.tsx` *(create)*

The color picker appears as a new floating pill beside the tools pill, visible only when `editModeEnabled` is true. It mirrors the staggered entrance animation of the tools.

### Step 1: Write the failing test

Create `src/features/annotations/components/__tests__/annotation-toolbar.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnotationToolbar } from '../annotation-toolbar';
import { ANNOTATION_COLOR_OPTIONS, DEFAULT_ANNOTATION_COLOR_ID } from '../../constants/annotation-colors';

const baseProps = {
  activeTool: 'cursor' as const,
  tools: ['cursor', 'pin', 'box'] as const,
  editModeEnabled: false,
  canUndo: false,
  canRedo: false,
  onToolChange: vi.fn(),
  onToggleEditMode: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  colorId: DEFAULT_ANNOTATION_COLOR_ID,
  onColorChange: vi.fn(),
};

describe('AnnotationToolbar color picker', () => {
  it('does not show color swatches when edit mode is off', () => {
    render(<AnnotationToolbar {...baseProps} editModeEnabled={false} />);
    expect(screen.queryByRole('radio', { name: /orange/i })).toBeNull();
  });

  it('shows color swatches when edit mode is on', () => {
    render(<AnnotationToolbar {...baseProps} editModeEnabled={true} />);
    // Each color option should have an accessible button
    for (const option of ANNOTATION_COLOR_OPTIONS) {
      expect(screen.getByRole('radio', { name: option.label })).toBeDefined();
    }
  });

  it('marks the current colorId as checked', () => {
    render(<AnnotationToolbar {...baseProps} editModeEnabled={true} colorId="blue" />);
    const blueBtn = screen.getByRole('radio', { name: 'Blue' }) as HTMLButtonElement;
    expect(blueBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onColorChange with the color id when a swatch is clicked', () => {
    const onColorChange = vi.fn();
    render(
      <AnnotationToolbar {...baseProps} editModeEnabled={true} onColorChange={onColorChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Red' }));
    expect(onColorChange).toHaveBeenCalledWith('red');
  });
});
```

### Step 2: Run test to verify it fails

```bash
bun run test src/features/annotations/components/__tests__/annotation-toolbar.test.tsx
```

Expected: FAIL — `colorId` and `onColorChange` props not accepted yet.

### Step 3: Implement color picker in `annotation-toolbar.tsx`

**Add imports** at the top (after existing imports):

```typescript
import { ANNOTATION_COLOR_OPTIONS } from '../constants/annotation-colors';
```

**Extend `AnnotationToolbarProps`** (add two optional props after `onRedo`):

```typescript
  colorId?: string;
  onColorChange?: (id: string) => void;
```

**Add destructuring** in the function signature (after `onRedo`):

```typescript
  colorId,
  onColorChange,
```

**Add color picker JSX** inside the `AnimatePresence` for `editModeEnabled`, after the closing `</motion.div>` of the tools pill (after line 238 — the `</motion.div>` that closes the tools group), as a sibling inside the outer `<div className="inline-flex items-center gap-2">`:

```tsx
{/* Color Picker — appears beside the tools when edit mode is on */}
{onColorChange && colorId && (
  <motion.div
    initial={{ opacity: 0, scale: 0.88, y: 12, filter: 'blur(8px)' }}
    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, scale: 0.88, y: 12, filter: 'blur(8px)' }}
    transition={{
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
      filter: { duration: 0.25 },
    }}
    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    role="radiogroup"
    aria-label="Marker color"
  >
    {ANNOTATION_COLOR_OPTIONS.map((option, index) => (
      <motion.button
        key={option.id}
        role="radio"
        aria-label={option.label}
        aria-checked={colorId === option.id}
        type="button"
        title={option.label}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: index * 0.04 + 0.1,
          duration: 0.25,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        onClick={() => onColorChange(option.id)}
        className="relative h-5 w-5 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: option.previewColor }}
      >
        {colorId === option.id && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white/80" />
          </span>
        )}
      </motion.button>
    ))}
  </motion.div>
)}
```

Place this new `motion.div` **inside** the outer `AnimatePresence` for `editModeEnabled` (the one wrapping the tools pill starting at line 109), as a sibling element after the tools `motion.div`.

### Step 4: Run tests to verify they pass

```bash
bun run test src/features/annotations/components/__tests__/annotation-toolbar.test.tsx
```

Expected: PASS — 4 tests green.

### Step 5: Run the full annotation test suite for regressions

```bash
bun run test src/features/annotations
```

Expected: all existing tests still pass.

### Step 6: Commit

```bash
git add src/features/annotations/components/annotation-toolbar.tsx \
        src/features/annotations/components/__tests__/annotation-toolbar.test.tsx
git commit -m "feat(annotations): add color picker to AnnotationToolbar"
```

---

## Task 5: Wire color state in `annotated-attachment-view.tsx`

**Files:**
- Modify: `src/features/annotations/components/annotated-attachment-view.tsx`

No new tests — this is wiring. The hook is already tested, the toolbar is already tested.

### Step 1: Add import

Add to the imports in `annotated-attachment-view.tsx`:

```typescript
import { useAnnotationColor } from '../hooks/use-annotation-color';
```

### Step 2: Call the hook inside the component

Add near the top of the component body (after existing hook calls):

```typescript
const { colorId, setColor } = useAnnotationColor();
```

### Step 3: Add `data-annotation-accent` to the root div

The root div is at line 535:

```tsx
// BEFORE:
<div className="relative h-full w-full">

// AFTER:
<div className="relative h-full w-full" data-annotation-accent={colorId}>
```

### Step 4: Pass color props to `AnnotationToolbar`

Find the `<AnnotationToolbar …>` JSX (line 539) and add two props:

```tsx
<AnnotationToolbar
  className="pointer-events-auto"
  activeTool={activeTool}
  tools={toolbarTools}
  editModeEnabled={editModeEnabled}
  canUndo={canUndo}
  canRedo={canRedo}
  onToolChange={selectTool}
  onToggleEditMode={toggleEditMode}
  onUndo={undo}
  onRedo={redo}
  colorId={colorId}
  onColorChange={setColor}
/>
```

### Step 5: Typecheck

```bash
bun run typecheck 2>&1 | grep annotated-attachment
```

Expected: no errors.

### Step 6: Commit

```bash
git add src/features/annotations/components/annotated-attachment-view.tsx
git commit -m "feat(annotations): wire annotation color picker into attachment view"
```

---

## Task 6: Manual verification checklist

Open the app in a browser with an issue that has an existing attachment with annotations.

1. **Default color is orange** — existing annotations show the same orange color as before (no regression).

2. **Color picker appears in edit mode** — click the edit pencil button → the color swatch pill slides in with the tools.

3. **Color picker hides outside edit mode** — toggle edit mode off → the color swatches animate out.

4. **Selecting a color recolors all markers instantly** — with multiple annotations visible, click the blue swatch → all pin circles and box borders turn blue immediately with no page reload.

5. **Dark mode** — switch to dark mode with blue selected → markers use the dark-mode blue value (lighter, higher contrast on dark background).

6. **Persistence** — select indigo, reload the page → indigo is still selected; markers are still indigo without the user re-picking.

7. **Selected swatch indicator** — the active color swatch shows a small white dot in its center; clicking another color moves the dot.

8. **No change to annotation data** — open DevTools, check the annotation API responses → no `color` field appears on annotation objects (the color is purely client-side).

---

## Summary of files changed

| File | Change |
|---|---|
| `src/features/annotations/constants/annotation-colors.ts` | **New** — `ANNOTATION_COLOR_OPTIONS` (6 colors, OKLCH light+dark values) |
| `src/features/annotations/hooks/use-annotation-color.ts` | **New** — `useAnnotationColor` hook with localStorage |
| `src/styles/globals.css` | Add `[data-annotation-accent="*"]` CSS rules after `.dark` block |
| `src/features/annotations/components/annotation-toolbar.tsx` | Add `colorId?` + `onColorChange?` props + color picker swatch group |
| `src/features/annotations/components/annotated-attachment-view.tsx` | Wire `useAnnotationColor`, add `data-annotation-accent` on root div, pass props to toolbar |
| `src/features/annotations/constants/__tests__/annotation-colors.test.ts` | **New** — tests for color constant |
| `src/features/annotations/hooks/__tests__/use-annotation-color.test.ts` | **New** — tests for hook |
| `src/features/annotations/components/__tests__/annotation-toolbar.test.tsx` | **New** — tests for toolbar color picker |

**What does NOT change:** `AnnotationPin`, `AnnotationBox`, `AnnotationLayer`, any server-side code, any API types.
