# Box Annotation Feature - Integration Guide

## Overview

The box annotation feature allows users to draw rectangular boxes on images/attachments, with support for:
- Drawing boxes that can extend outside image bounds (like professional annotation tools)
- Moving and resizing boxes with interactive handles
- Visual feedback during drawing
- Status-based coloring (open, in_review, resolved)
- Ready-to-wire architecture for future database integration

## Architecture

Following the project's feature-first architecture (see `AGENTS.md`), the box annotation feature is organized as:

```
src/features/annotations/
├── components/
│   ├── annotation-box.tsx        # Renders individual box annotations
│   ├── annotation-canvas.tsx     # Handles drawing new annotations
│   ├── annotation-layer.tsx      # Renders all annotations (pins + boxes)
│   └── annotation-toolbar.tsx    # Tool selection UI
├── hooks/
│   ├── use-annotation-tools.ts   # Tool state & keyboard shortcuts
│   └── use-annotation-drafts.ts  # Draft annotation management
└── types/
    └── annotation.ts             # Domain types with shape support
```

## Components

### AnnotationBox

Renders a single box annotation with interactive handles for resizing and moving.

**Key Features:**
- No boundary clamping - boxes can extend beyond image bounds
- 4 corner resize handles (only shown when active)
- Move entire box by dragging the box area
- Status-based coloring
- Label badge above box

**Props:**
```typescript
interface AnnotationBoxProps {
  annotation: BoxAnnotation;      // Box data (id, label, start, end, status)
  overlayRef: RefObject<HTMLDivElement>; // Parent container ref
  isActive?: boolean;             // Highlight as selected
  interactive?: boolean;          // Enable drag/resize
  onSelect?: (id: string) => void;
  onMove?: (id: string, start: Position, end: Position) => void;
}
```

### AnnotationCanvas

Drawing surface that captures pointer events to create new annotations.

**Key Features:**
- Handles pointer events for drawing
- Shows live preview while drawing
- Supports all annotation tools (pin, box, arrow)
- Ignores existing annotations (clicks pass through to them)
- Respects edit mode and hand tool states

**Props:**
```typescript
interface AnnotationCanvasProps {
  overlayRef: RefObject<HTMLDivElement>;
  activeTool: AnnotationToolId;
  editModeEnabled: boolean;
  handToolActive?: boolean;
  onDraftCreate?: (draft: AnnotationDraft) => void;
  onDraftUpdate?: (draft: AnnotationDraft) => void;
  onDraftCommit?: (draft: AnnotationDraft) => void;
  onDraftCancel?: () => void;
}
```

### AnnotationLayer

Updated to render both pins and boxes based on shape metadata.

**Key Changes:**
- Added `onBoxMove` prop for handling box movements (different signature than pin moves)
- Checks for `annotation.shape` field to determine rendering strategy
- Falls back to pin rendering for backward compatibility

## Hooks

### useAnnotationDrafts

Manages draft annotation state during drawing operations.

```typescript
const {
  currentDraft,
  isDrawing,
  createDraft,
  updateDraft,
  commitDraft,
  cancelDraft,
} = useAnnotationDrafts({
  onCommit: async (draft) => {
    // Convert draft to AttachmentAnnotation and persist
    const annotation = draftToAnnotation(
      draft,
      attachmentId,
      currentUser,
      getNextLabel()
    );
    await createAnnotationMutation(annotation);
  },
});
```

**Helper Function:**
```typescript
draftToAnnotation(
  draft: AnnotationDraft,
  attachmentId: string,
  author: AnnotationAuthor,
  label: string
): Omit<AttachmentAnnotation, 'id'>
```

Converts a draft to a ready-to-persist annotation object.

## Types

### AnnotationShape (Discriminated Union)

```typescript
type AnnotationShape =
  | { type: 'pin'; position: AnnotationPosition }
  | { type: 'box'; start: AnnotationPosition; end: AnnotationPosition }
  | { type: 'arrow'; start: AnnotationPosition; end: AnnotationPosition };
```

### AttachmentAnnotation (Extended)

```typescript
interface AttachmentAnnotation {
  id: string;
  attachmentId: string;
  label: string;
  status: 'open' | 'in_review' | 'resolved';
  x: number;  // For backward compatibility (center for boxes)
  y: number;  // For backward compatibility
  author: AnnotationAuthor;
  createdAt: string;
  shape?: AnnotationShape;  // NEW: Optional shape metadata
  // ... other fields
}
```

## Integration Example

### Complete Screen Implementation

```tsx
'use client';

import { useRef, useState } from 'react';
import {
  AnnotationToolbar,
  AnnotationLayer,
  AnnotationCanvas,
  useAnnotationTools,
  useAnnotationDrafts,
  draftToAnnotation,
} from '@/features/annotations';

export function ImageAnnotationScreen({ attachmentId }: { attachmentId: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<AttachmentAnnotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Tool state management
  const {
    tools,
    activeTool,
    editModeEnabled,
    canUndo,
    canRedo,
    handToolActive,
    selectTool,
    toggleEditMode,
    undo,
    redo,
    pushHistory,
  } = useAnnotationTools({
    initialTool: 'box',
    enableKeyboardShortcuts: true,
  });

  // Draft management
  const { createDraft, updateDraft, commitDraft, cancelDraft } = useAnnotationDrafts({
    onCommit: async (draft) => {
      // Generate next label
      const nextLabel = String.fromCharCode(65 + annotations.length); // A, B, C...

      // Convert draft to annotation
      const newAnnotation = draftToAnnotation(draft, attachmentId, currentUser, nextLabel);

      // In real implementation, persist to database:
      // const created = await createAnnotation(newAnnotation);
      // setAnnotations([...annotations, created]);

      // For now, add locally with temp ID
      const withId = { ...newAnnotation, id: `temp-${Date.now()}` };
      setAnnotations([...annotations, withId]);

      // Record in history
      pushHistory({
        id: withId.id,
        label: `Created ${draft.tool} annotation`,
        timestamp: Date.now(),
      });
    },
  });

  // Handle pin movements
  const handlePinMove = (id: string, position: AnnotationPosition) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === id ? { ...ann, x: position.x, y: position.y } : ann
      )
    );
  };

  // Handle box movements/resizes
  const handleBoxMove = (
    id: string,
    start: AnnotationPosition,
    end: AnnotationPosition
  ) => {
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id !== id) return ann;
        return {
          ...ann,
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
          shape: { type: 'box', start, end },
        };
      })
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="absolute left-6 top-6 z-20">
        <AnnotationToolbar
          activeTool={activeTool}
          tools={tools}
          editModeEnabled={editModeEnabled}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={selectTool}
          onToggleEditMode={toggleEditMode}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      {/* Image Container */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={overlayRef} className="relative h-full w-full">
          {/* Your image component */}
          <img
            src={imageUrl}
            alt="Attachment"
            className="h-full w-full object-contain"
          />

          {/* Annotation Layer - Renders existing annotations */}
          <div className="pointer-events-none absolute inset-0">
            <AnnotationLayer
              annotations={annotations}
              overlayRef={overlayRef}
              activeAnnotationId={activeAnnotationId}
              interactive={editModeEnabled}
              onSelect={setActiveAnnotationId}
              onMove={handlePinMove}
              onBoxMove={handleBoxMove}
            />
          </div>

          {/* Drawing Canvas - Captures drawing interactions */}
          {editModeEnabled && (
            <AnnotationCanvas
              overlayRef={overlayRef}
              activeTool={activeTool}
              editModeEnabled={editModeEnabled}
              handToolActive={handToolActive}
              onDraftCreate={createDraft}
              onDraftUpdate={updateDraft}
              onDraftCommit={commitDraft}
              onDraftCancel={cancelDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

## Wiring to Database

When ready to persist annotations, implement the following:

### 1. API Layer (`features/annotations/api/`)

```typescript
// api/create-annotation.ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';

const CreateAnnotationSchema = z.object({
  attachmentId: z.string(),
  label: z.string(),
  status: z.enum(['open', 'in_review', 'resolved']),
  x: z.number(),
  y: z.number(),
  shape: z.discriminatedUnion('type', [
    z.object({ type: z.literal('pin'), position: z.object({ x: z.number(), y: z.number() }) }),
    z.object({ type: z.literal('box'), start: z.object({ x: z.number(), y: z.number() }), end: z.object({ x: z.number(), y: z.number() }) }),
    // ... other shapes
  ]).optional(),
});

export async function createAnnotation(
  data: z.infer<typeof CreateAnnotationSchema>
): Promise<AttachmentAnnotation> {
  const validated = CreateAnnotationSchema.parse(data);
  return apiClient.post(`/api/annotations`, validated);
}
```

### 2. React Query Hook (`features/annotations/hooks/`)

```typescript
// hooks/use-create-annotation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAnnotation } from '../api/create-annotation';

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnotation,
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['annotations', data.attachmentId]);
    },
  });
}
```

### 3. Update Screen to Use Mutation

```typescript
const createAnnotationMutation = useCreateAnnotation();

const { commitDraft } = useAnnotationDrafts({
  onCommit: async (draft) => {
    const annotation = draftToAnnotation(draft, attachmentId, currentUser, nextLabel);
    await createAnnotationMutation.mutateAsync(annotation);
  },
});
```

## Database Schema Example

```sql
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES attachments(id),
  label VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  x DECIMAL(10, 8) NOT NULL,  -- Normalized 0-1
  y DECIMAL(10, 8) NOT NULL,  -- Normalized 0-1
  shape_type VARCHAR(20),     -- 'pin', 'box', 'arrow'
  shape_data JSONB,           -- { start: {x,y}, end: {x,y} }
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotations_attachment ON annotations(attachment_id);
CREATE INDEX idx_annotations_status ON annotations(status);
```

## Keyboard Shortcuts

The feature includes built-in keyboard shortcuts (managed by `useAnnotationTools`):

- **E**: Toggle edit mode
- **1 or P**: Select Pin tool
- **2 or B**: Select Box tool
- **3 or A**: Select Arrow tool
- **Space**: Temporary hand tool (pan)
- **Cmd/Ctrl + Z**: Undo
- **Shift + Cmd/Ctrl + Z**: Redo

## Styling & Customization

All components use Tailwind CSS with semantic color variables:

```css
/* Status colors for boxes */
.border-blue-500   /* open */
.border-amber-500  /* in_review */
.border-green-500  /* resolved */

/* Primary color for active/hover states */
.border-primary
.bg-primary
.text-primary-foreground
```

Override by passing custom `className` props where supported.

## Best Practices

1. **Always provide an overlayRef**: The ref is used to calculate relative positions
2. **Manage edit mode carefully**: Disable interactive features when edit mode is off
3. **Use optimistic updates**: Update local state immediately, sync to server asynchronously
4. **Handle errors gracefully**: Show toasts when mutations fail, roll back optimistic updates
5. **Validate on server**: Never trust client-side coordinates, re-validate with Zod
6. **Keep labels short**: Single letters or numbers work best for UI space
7. **Debounce move operations**: Consider debouncing `onMove` callbacks for performance

## Testing

When implementing, ensure you test:

- Drawing boxes that extend outside image bounds
- Resizing boxes in all directions
- Moving boxes (including partially off-screen boxes)
- Switching tools mid-draw (should cancel current draft)
- Keyboard shortcuts in various contexts
- Undo/redo operations
- Status changes and color updates

## Next Steps

See [NEXTSTEP.md](./NEXTSTEP.md) for additional planned features:
- Arrow annotations
- Highlight annotations
- Collaboration (live presence)
- Mobile/touch support
- Accessibility improvements
