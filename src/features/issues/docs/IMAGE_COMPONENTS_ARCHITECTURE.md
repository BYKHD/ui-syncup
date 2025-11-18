# Image Components Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│                                                                       │
│  src/features/issues/components/optimized-attachment-view.tsx       │
│  └─ Uses: AttachmentImage from feature components                   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      FEATURE WIRING LAYER                            │
│                                                                       │
│  src/features/issues/components/optimized-image.tsx                 │
│                                                                       │
│  Components:                                                         │
│  ├─ OptimizedImage       (wires hook → UI)                          │
│  ├─ AttachmentImage      (wires hook → UI)                          │
│  ├─ AvatarImage          (wires hook → UI)                          │
│  └─ ThumbnailImage       (wires hook → UI)                          │
└───────────────────┬────────────────────────────────┬────────────────┘
                    │                                │
                    ↓                                ↓
    ┌───────────────────────────────┐   ┌───────────────────────────┐
    │   BUSINESS LOGIC LAYER        │   │   PRESENTATION LAYER      │
    │                               │   │                           │
    │  src/features/issues/hooks/  │   │  src/components/ui/       │
    │  use-optimized-image.ts      │   │  optimized-image.tsx      │
    │                               │   │                           │
    │  Hooks:                       │   │  Components:              │
    │  ├─ useOptimizedImage        │   │  ├─ OptimizedImage        │
    │  ├─ useAttachmentImage       │   │  ├─ AttachmentImage       │
    │  ├─ useAvatarImage           │   │  ├─ AvatarImage           │
    │  └─ useThumbnailImage        │   │  └─ ThumbnailImage        │
    │                               │   │                           │
    │  Utilities:                   │   │  Props:                   │
    │  ├─ generateOptimizedSrc     │   │  ├─ src, alt, width       │
    │  └─ generateSrcSet            │   │  ├─ isLoaded, isError    │
    │                               │   │  └─ onLoad, onError       │
    └───────────────┬───────────────┘   └───────────┬───────────────┘
                    │                               │
                    │                               │
                    └───────────┬───────────────────┘
                                │
                                ↓
                ┌───────────────────────────────────┐
                │   GLOBAL UTILITIES LAYER          │
                │                                   │
                │  src/lib/performance.ts           │
                │                                   │
                │  Exports:                         │
                │  ├─ PerformanceMonitor           │
                │  ├─ useImageLazyLoading          │
                │  ├─ usePerformanceMonitoring     │
                │  ├─ useMemoryOptimization        │
                │  ├─ optimizedSWRConfig           │
                │  └─ debounce, throttle           │
                └───────────────────────────────────┘
```

---

## Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. User Component calls feature component                          │
│                                                                     │
│    <AttachmentImage                                                │
│      src="/uploads/image.jpg"                                      │
│      alt="Screenshot"                                              │
│      width={800}                                                   │
│    />                                                              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│ 2. Feature component calls hook for business logic                 │
│                                                                     │
│    const {                                                         │
│      currentSrc,      ← Generated with width/quality params        │
│      srcSet,          ← Responsive breakpoints                     │
│      isLoaded,        ← State: image loaded?                       │
│      isError,         ← State: failed to load?                     │
│      handleLoad,      ← Callback: mark as loaded                   │
│      handleError,     ← Callback: handle error + fallback          │
│    } = useAttachmentImage({ src, width, quality: 75 })            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│ 3. Hook performs business logic                                    │
│                                                                     │
│    a. Generate optimized URL:                                      │
│       "/uploads/image.jpg?w=800&q=75"                              │
│                                                                     │
│    b. Generate srcSet:                                             │
│       "image.jpg?w=480&q=75 480w,                                  │
│        image.jpg?w=768&q=75 768w, ..."                             │
│                                                                     │
│    c. Set up Intersection Observer for lazy loading                │
│                                                                     │
│    d. Manage state (isLoaded, isError)                             │
│                                                                     │
│    e. Handle fallback on error                                     │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│ 4. Feature component passes computed props to UI component         │
│                                                                     │
│    return (                                                        │
│      <UIAttachmentImage                                            │
│        src={currentSrc}         ← Hook output                      │
│        srcSet={srcSet}          ← Hook output                      │
│        isLoaded={isLoaded}      ← Hook state                       │
│        isError={isError}        ← Hook state                       │
│        onLoad={handleLoad}      ← Hook callback                    │
│        onError={handleError}    ← Hook callback                    │
│        alt={alt}                ← Pass through                     │
│      />                                                            │
│    )                                                               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│ 5. UI component renders based on state                             │
│                                                                     │
│    if (isError) {                                                  │
│      return <ErrorState />        ← Shows error icon               │
│    }                                                               │
│                                                                     │
│    if (!isLoaded) {                                                │
│      return (                                                      │
│        <>                                                          │
│          <BlurPlaceholder />      ← Blur effect                    │
│          <LoadingSpinner />       ← Animated spinner               │
│        </>                                                         │
│      )                                                             │
│    }                                                               │
│                                                                     │
│    return (                                                        │
│      <motion.img                  ← Fade in animation              │
│        src={src}                                                   │
│        srcSet={srcSet}                                             │
│        onLoad={onLoad}            ← Triggers handleLoad            │
│        onError={onError}          ← Triggers handleError           │
│      />                                                            │
│    )                                                               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Responsibility Matrix

| Layer | Responsibility | Can Import From | Cannot Import From |
|-------|---------------|-----------------|-------------------|
| **UI Components**<br>`src/components/ui/` | • Render visual states<br>• Handle animations<br>• No business logic | • `@/lib/utils`<br>• Other UI components | • `@/features/*`<br>• Business logic |
| **Feature Hooks**<br>`src/features/*/hooks/` | • URL generation<br>• State management<br>• Lazy loading setup<br>• Error handling | • `@/lib/performance`<br>• Feature types<br>• Feature utils | • Feature components<br>• UI components |
| **Feature Components**<br>`src/features/*/components/` | • Wire hooks to UI<br>• Feature-specific API<br>• Thin layer | • Feature hooks<br>• UI components<br>• `@/lib/*` | • Other features |
| **Global Utils**<br>`src/lib/` | • Reusable utilities<br>• Performance tools<br>• No React imports | • Node modules<br>• Type definitions | • `@/features/*`<br>• `@/components/*` |

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      HOOK STATE (Source of Truth)                │
│                                                                  │
│  const [isLoaded, setIsLoaded] = useState(false)                │
│  const [isError, setIsError] = useState(false)                  │
│  const [currentSrc, setCurrentSrc] = useState(initial)          │
│                                                                  │
│  Effects:                                                        │
│  ├─ Lazy Loading Observer → Updates currentSrc                  │
│  ├─ Priority Loading → Updates currentSrc                       │
│  └─ Fallback Logic → Updates currentSrc                         │
│                                                                  │
│  Callbacks:                                                      │
│  ├─ handleLoad() → setIsLoaded(true)                            │
│  └─ handleError() → setIsError(true) or try fallback            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓ (returns)
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    WIRING COMPONENT (Pass Through)               │
│                                                                  │
│  Receives state from hook → Passes to UI component              │
│  No state transformation                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓ (props)
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    UI COMPONENT (Consumer)                       │
│                                                                  │
│  Receives props → Renders appropriate state                     │
│  No state management                                             │
│                                                                  │
│  Render Logic:                                                   │
│  ├─ isError === true → <ErrorState />                           │
│  ├─ isLoaded === false → <LoadingState />                       │
│  └─ isLoaded === true → <Image />                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Example: Lazy Loading Flow

```
1. Component Mount
   └─ Feature Component renders
      └─ Hook initializes: useAttachmentImage()
         ├─ currentSrc = "" (empty for lazy)
         ├─ isLoaded = false
         └─ isError = false

2. Effect Runs (Lazy Loading Setup)
   └─ useEffect in hook
      └─ Set img.dataset.src = optimized URL
         └─ Call observeImage(img)
            └─ IntersectionObserver created (from lib/performance)

3. Image Enters Viewport
   └─ IntersectionObserver callback fires
      └─ Reads img.dataset.src
         └─ Sets img.src = optimized URL
            └─ Browser starts loading image

4. Image Loads Successfully
   └─ <img onLoad> fires
      └─ handleLoad() called
         └─ setIsLoaded(true)
            └─ Component re-renders
               └─ UI shows loaded image with fade-in

5. If Load Fails
   └─ <img onError> fires
      └─ handleError() called
         ├─ Check if fallbackSrc exists
         │  ├─ Yes → setCurrentSrc(fallbackSrc), retry
         │  └─ No → setIsError(true)
         └─ Component re-renders
            └─ UI shows error state
```

---

## Performance Optimization Strategy

### 1. Lazy Loading
```typescript
// Hook sets up Intersection Observer
useEffect(() => {
  if (!lazy || priority) return;

  img.dataset.src = optimizedSrc;
  observeImage(img);  // From lib/performance
}, [lazy, priority, src]);
```

### 2. URL Optimization
```typescript
// Generate URLs with optimization params
generateOptimizedSrc("/uploads/image.jpg", 800, 75)
// → "/uploads/image.jpg?w=800&q=75"
```

### 3. Responsive Images
```typescript
// Generate srcSet for different screen sizes
generateSrcSet("/uploads/image.jpg", 1200, 75)
// → "image.jpg?w=480&q=75 480w,
//     image.jpg?w=768&q=75 768w,
//     image.jpg?w=1024&q=75 1024w, ..."
```

### 4. Progressive Loading
```typescript
// Show blur placeholder → spinner → final image
{blurDataURL && <BlurPlaceholder />}
{!isLoaded && <LoadingSpinner />}
{isLoaded && <FinalImage />}
```

### 5. Fallback Handling
```typescript
// Try fallback before showing error
handleError() {
  if (fallbackSrc && currentSrc !== fallbackSrc) {
    setCurrentSrc(fallbackSrc);
    return;
  }
  setIsError(true);
}
```

---

## Testing Strategy

### UI Components (Presentation)
```typescript
// Test with controlled props
test('shows loading state when not loaded', () => {
  render(<OptimizedImage isLoaded={false} isError={false} />);
  expect(screen.getByRole('loading')).toBeInTheDocument();
});

test('shows error state when error', () => {
  render(<OptimizedImage isLoaded={false} isError={true} />);
  expect(screen.getByText('Failed to load')).toBeInTheDocument();
});
```

### Hooks (Business Logic)
```typescript
// Test logic independently
test('generates optimized src', () => {
  const result = generateOptimizedSrc('/uploads/img.jpg', 800, 75);
  expect(result).toBe('/uploads/img.jpg?w=800&q=75');
});

test('hook returns correct state', () => {
  const { result } = renderHook(() =>
    useOptimizedImage({ src: '/test.jpg', lazy: true })
  );

  expect(result.current.isLoaded).toBe(false);
  expect(result.current.currentSrc).toBe('');
});
```

### Feature Components (Integration)
```typescript
// Test wiring between hook and UI
test('passes hook state to UI component', () => {
  render(<AttachmentImage src="/test.jpg" alt="Test" />);

  // Verify UI receives correct props from hook
  expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
});
```

---

## Benefits Summary

✅ **Separation of Concerns**: Logic separate from presentation
✅ **Reusability**: Each layer independently composable
✅ **Testability**: Test each layer in isolation
✅ **Maintainability**: Changes don't cascade across layers
✅ **Type Safety**: Full TypeScript coverage
✅ **Performance**: Optimized loading, lazy loading, responsive images
✅ **Scalability**: Pattern can be applied to other components
✅ **Standards Compliance**: Follows AGENTS.md guidelines
