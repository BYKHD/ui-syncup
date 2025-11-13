# Annotations Feature

A complete annotation system for images with pin and box annotations, featuring full undo/redo support, keyboard shortcuts, and a beautiful UI.

## ✨ Features

- 🎯 **Multiple Annotation Types**: Pin markers and box regions
- ↩️ **Full Undo/Redo**: Complete history tracking with keyboard shortcuts
- ⌨️ **Keyboard Shortcuts**: Navigate and create annotations efficiently
- 🎨 **Beautiful UI**: Smooth animations and intuitive interactions
- 📱 **Responsive**: Works on all screen sizes
- 🔒 **Type-Safe**: Full TypeScript support
- 🧩 **Composable**: Use the parts you need

## 🚀 Quick Start

### Option 1: Complete Example (Fastest)

Copy the [complete example](./examples/complete-example.tsx) to get started immediately with all features working:

```tsx
import { CompleteAnnotationExample } from '@/features/annotations/examples/complete-example';

<CompleteAnnotationExample
  attachmentId="123"
  imageUrl="/image.png"
  onAnnotationsChange={(annotations) => {
    // Save to API
  }}
/>
```

### Option 2: Step-by-Step (More Control)

Follow the [Quick Start Guide](./QUICK_START.md) for a 3-step implementation.

## 📚 Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Get up and running in 3 steps
- **[examples/complete-example.tsx](./examples/complete-example.tsx)** - Copy-paste ready example

### In-Depth Guides
- **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** - ⭐ Best practices for undo/redo (read this!)
- **[UNDO_REDO_IMPLEMENTATION.md](./UNDO_REDO_IMPLEMENTATION.md)** - Complete undo/redo architecture
- **[BOX_ANNOTATION_GUIDE.md](./BOX_ANNOTATION_GUIDE.md)** - Box annotation details
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was implemented

## 🎮 User Experience

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Toggle Edit Mode | `E` |
| Cursor Tool | `1` or `C` |
| Pin Tool | `2` or `P` |
| Box Tool | `3` or `B` |
| Undo | `Cmd+Z` / `Ctrl+Z` |
| Redo | `Cmd+Shift+Z` / `Ctrl+Y` |

### Mouse Interactions
- **Create Pin**: Click with pin tool active
- **Create Box**: Click and drag with box tool active
- **Move Annotation**: Drag with cursor tool active
- **Resize Box**: Drag corner handles
- **Select Annotation**: Click on annotation

## 📦 Main Components

### Components
- `<AnnotationToolbar />` - Tool selection and undo/redo controls
- `<AnnotationCanvas />` - Drawing surface for creating annotations
- `<AnnotationLayer />` - Renders existing annotations
- `<AnnotationPin />` - Pin marker component
- `<AnnotationBox />` - Box region component

### Hooks
- `useAnnotationTools()` - Manages tools, edit mode, and history
- `useAnnotationsWithHistory()` - ⭐ Manages annotations with automatic undo/redo
- `useAnnotationDrafts()` - Manages draft state during creation

### Utilities
- `createHistoryEntry()` - Create a history entry
- `createSnapshot()` - Capture annotation state
- `draftToAnnotation()` - Convert draft to annotation

## 🔧 API Reference

### useAnnotationsWithHistory

The easiest way to implement annotations with undo/redo:

```tsx
const {
  annotations,              // Current annotation list
  setAnnotations,           // Update from external source
  handleAnnotationMove,     // Pin move handler (with history)
  handleBoxAnnotationMove,  // Box move/resize handler (with history)
  handleAnnotationCreate,   // Create handler (with history)
  handleAnnotationDelete,   // Delete handler (with history)
  applyUndo,                // Apply undo operation
  applyRedo,                // Apply redo operation
} = useAnnotationsWithHistory({
  initialAnnotations: [],
  onPushHistory: pushHistory,
});
```

### useAnnotationTools

Manages toolbar state and keyboard shortcuts:

```tsx
const {
  tools,                    // Available tools
  activeTool,               // Currently selected tool
  editModeEnabled,          // Whether edit mode is active
  canUndo,                  // Whether undo is available
  canRedo,                  // Whether redo is available
  selectTool,               // Change active tool
  toggleEditMode,           // Toggle edit mode
  undo,                     // Trigger undo
  redo,                     // Trigger redo
  pushHistory,              // Add to history
  handToolActive,           // Whether hand tool is active (spacebar)
} = useAnnotationTools({
  initialTool: 'box',
  initialEditMode: false,
  enableKeyboardShortcuts: true,
  onUndo: applyUndo,        // Callback when undo is triggered
  onRedo: applyRedo,        // Callback when redo is triggered
});
```

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Parent Component                      │
│  (Manages annotation data, API calls, etc.)             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ├─► useAnnotationTools
                    │    - Tool selection
                    │    - Edit mode
                    │    - History state (canUndo/canRedo)
                    │    - Keyboard shortcuts
                    │
                    └─► useAnnotationsWithHistory
                         - Annotation CRUD with history
                         - Undo/redo application
                         │
                         └─► History Manager Utils
                              - Snapshot creation
                              - History entry creation
```

## 🏗️ Project Structure

```
src/features/annotations/
├── components/
│   ├── annotation-toolbar.tsx       # Toolbar with undo/redo
│   ├── annotation-canvas.tsx        # Drawing surface
│   ├── annotation-layer.tsx         # Renders annotations
│   ├── annotation-pin.tsx           # Pin component
│   ├── annotation-box.tsx           # Box component
│   └── ...
├── hooks/
│   ├── use-annotation-tools.ts      # Tool & history management
│   ├── use-annotations-with-history.ts  # ⭐ Complete solution
│   └── use-annotation-drafts.ts     # Draft state
├── utils/
│   ├── history-manager.ts           # History utilities
│   └── ...
├── types/
│   ├── annotation.ts                # Core types
│   └── index.ts
├── examples/
│   └── complete-example.tsx         # 📋 Copy-paste ready example
├── QUICK_START.md                   # 🚀 Get started fast
├── UNDO_REDO_IMPLEMENTATION.md      # 📖 Detailed guide
├── IMPLEMENTATION_SUMMARY.md        # ✅ What was built
└── README.md                        # 👈 You are here
```

## 💡 Examples

### Basic Usage

```tsx
import {
  useAnnotationTools,
  useAnnotationsWithHistory,
  AnnotationToolbar,
  AnnotationLayer,
} from '@/features/annotations';

function MyComponent() {
  const { annotations, applyUndo, applyRedo, ...handlers } =
    useAnnotationsWithHistory();

  const { canUndo, canRedo, undo, redo, ...toolState } =
    useAnnotationTools({ onUndo: applyUndo, onRedo: applyRedo });

  return (
    <>
      <AnnotationToolbar
        {...toolState}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      <AnnotationLayer annotations={annotations} {...handlers} />
    </>
  );
}
```

### Custom Undo/Redo Logic

```tsx
const handleCustomUndo = (entry: AnnotationHistoryEntry) => {
  // Your custom logic
  if (entry.action === 'move') {
    updateAnnotation(entry.annotationId, entry.previousSnapshot);
  }
};

const { undo, redo } = useAnnotationTools({
  onUndo: handleCustomUndo,
  onRedo: handleCustomRedo,
});
```

## 🧪 Testing

```tsx
// Test undo/redo
it('should undo annotation creation', () => {
  const { result } = renderHook(() =>
    useAnnotationsWithHistory()
  );

  // Create annotation
  act(() => {
    result.current.handleAnnotationCreate(mockAnnotation);
  });

  expect(result.current.annotations).toHaveLength(1);

  // Undo
  act(() => {
    result.current.applyUndo(mockHistoryEntry);
  });

  expect(result.current.annotations).toHaveLength(0);
});
```

## 🤝 Contributing

When adding new annotation types or operations:

1. Add the action type to `AnnotationActionType`
2. Update `AnnotationSnapshot` if needed
3. Implement undo/redo logic in your handlers
4. Create history entries with `createHistoryEntry()`
5. Add tests
6. Update documentation

## 📝 License

Part of the UI SyncUp project.

---

**Need help?** Check out:
- [Quick Start Guide](./QUICK_START.md) - Fastest way to get started
- [Complete Example](./examples/complete-example.tsx) - Working code you can copy
- [Implementation Guide](./UNDO_REDO_IMPLEMENTATION.md) - Deep dive into architecture
