# Image Components Import Graph

## Valid Import Chains

### Application Layer
```typescript
// src/features/issues/components/optimized-attachment-view.tsx
import { AttachmentImage } from './optimized-image';

// ✅ Allowed: Feature component imports from same feature
```

### Feature Component Layer (Wiring)
```typescript
// src/features/issues/components/optimized-image.tsx
import {
  OptimizedImage as UIOptimizedImage,
  AttachmentImage as UIAttachmentImage,
  // ...
} from '@/components/ui/optimized-image';

import {
  useOptimizedImage,
  useAttachmentImage,
  // ...
} from '@/features/issues/hooks';

// ✅ Allowed: Feature component imports from:
//    - UI components (@/components/ui)
//    - Own feature hooks (@/features/issues/hooks)
```

### Feature Hook Layer (Business Logic)
```typescript
// src/features/issues/hooks/use-optimized-image.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { useImageLazyLoading } from '@/lib/performance';

// ✅ Allowed: Feature hook imports from:
//    - React
//    - Global utilities (@/lib)
```

### UI Component Layer (Presentation)
```typescript
// src/components/ui/optimized-image.tsx
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// ✅ Allowed: UI component imports from:
//    - External libraries (motion, react)
//    - Global utilities (@/lib/utils)
```

### Global Utilities Layer
```typescript
// src/lib/performance.ts
import { useEffect, useRef, useCallback } from 'react';

// ✅ Allowed: Global utilities import from:
//    - React
//    - Node modules
```

---

## Complete Import Graph (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│ optimized-attachment-view.tsx                                │
│ (Application Component)                                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ import { AttachmentImage }
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ features/issues/components/optimized-image.tsx              │
│ (Feature Wiring Layer)                                      │
└────────┬────────────────────────────────────────┬───────────┘
         │                                        │
         │ import { useAttachmentImage }          │ import { UIAttachmentImage }
         ↓                                        ↓
┌──────────────────────────────┐    ┌────────────────────────────┐
│ features/issues/hooks/       │    │ components/ui/             │
│ use-optimized-image.ts       │    │ optimized-image.tsx        │
│ (Business Logic)             │    │ (Presentation)             │
└────────┬─────────────────────┘    └────────┬───────────────────┘
         │                                    │
         │ import { useImageLazyLoading }     │ import { cn }
         ↓                                    ↓
┌──────────────────────────────┐    ┌────────────────────────────┐
│ lib/performance.ts           │    │ lib/utils.ts               │
│ (Global Utilities)           │    │ (Global Utilities)         │
└──────────────────────────────┘    └────────────────────────────┘
```

---

## Import Rules Enforcement

### ✅ Allowed Imports

| From | To | Example |
|------|-----|---------|
| App Components | Feature Components | `import { AttachmentImage } from '@/features/issues/components'` |
| Feature Components | Feature Hooks | `import { useOptimizedImage } from '@/features/issues/hooks'` |
| Feature Components | UI Components | `import { OptimizedImage } from '@/components/ui'` |
| Feature Hooks | Global Utils | `import { useImageLazyLoading } from '@/lib/performance'` |
| UI Components | Global Utils | `import { cn } from '@/lib/utils'` |
| Any Layer | React/External | `import { useState } from 'react'` |

### ❌ Forbidden Imports

| From | To | Why |
|------|-----|-----|
| UI Components | Feature Hooks | UI must remain feature-agnostic |
| UI Components | Feature Components | Creates circular dependency |
| Global Utils | Features | Utils must be globally reusable |
| Global Utils | UI Components | Utils are lower level |
| Feature A | Feature B | Cross-feature imports violate isolation |

---

## Real Import Examples

### ✅ Good: Application uses feature component
```typescript
// src/features/issues/components/optimized-attachment-view.tsx
import { AttachmentImage } from './optimized-image';

function OptimizedAttachmentView() {
  return (
    <AttachmentImage
      src="/uploads/image.jpg"
      alt="Screenshot"
      width={800}
      height={600}
    />
  );
}
```

### ✅ Good: Feature component wires hook to UI
```typescript
// src/features/issues/components/optimized-image.tsx
import { OptimizedImage as UIOptimizedImage } from '@/components/ui/optimized-image';
import { useOptimizedImage } from '@/features/issues/hooks';

export function OptimizedImage(props) {
  const hookResult = useOptimizedImage(props);
  return <UIOptimizedImage {...hookResult} />;
}
```

### ✅ Good: Hook uses global utility
```typescript
// src/features/issues/hooks/use-optimized-image.ts
import { useImageLazyLoading } from '@/lib/performance';

export function useOptimizedImage({ src, lazy }) {
  const { observeImage } = useImageLazyLoading();
  // Use observeImage...
}
```

### ❌ Bad: UI component imports feature hook
```typescript
// src/components/ui/optimized-image.tsx
import { useOptimizedImage } from '@/features/issues/hooks'; // ❌ FORBIDDEN

// UI components must remain feature-agnostic!
```

### ❌ Bad: Global util imports from feature
```typescript
// src/lib/performance.ts
import { generateOptimizedSrc } from '@/features/issues/hooks'; // ❌ FORBIDDEN

// Global utils cannot depend on features!
```

### ❌ Bad: Cross-feature imports
```typescript
// src/features/projects/components/something.tsx
import { useOptimizedImage } from '@/features/issues/hooks'; // ❌ FORBIDDEN

// Features must remain isolated!
// Solution: Move shared logic to lib/ or components/ui/
```

---

## Dependency Direction

```
        Lower Level (More Reusable)
               ↑
               │
┌──────────────┴──────────────┐
│  lib/                       │  ← Most reusable, no dependencies on app
│  - performance.ts           │
│  - utils.ts                 │
└──────────────┬──────────────┘
               ↑
               │
┌──────────────┴──────────────┐
│  components/ui/             │  ← Reusable UI, no feature knowledge
│  - optimized-image.tsx      │
└──────────────┬──────────────┘
               ↑
               │
┌──────────────┴──────────────┐
│  features/issues/hooks/     │  ← Feature-specific logic
│  - use-optimized-image.ts   │
└──────────────┬──────────────┘
               ↑
               │
┌──────────────┴──────────────┐
│  features/issues/components/│  ← Feature components (wiring)
│  - optimized-image.tsx      │
└──────────────┬──────────────┘
               ↑
               │
┌──────────────┴──────────────┐
│  features/issues/components/│  ← Application components
│  - optimized-attachment-*.tsx│
└─────────────────────────────┘
               ↑
               │
        Higher Level (Less Reusable)
```

**Rule**: Dependencies always flow upward (from higher to lower level)

---

## Barrel Exports

### Feature Hook Barrel
```typescript
// src/features/issues/hooks/index.ts
export * from './use-optimized-image';
export * from './use-issue-details';
// ... other hooks
```

**Usage**:
```typescript
// Good: Import from barrel
import { useOptimizedImage, useIssueDetails } from '@/features/issues/hooks';

// Also OK: Direct import for tree-shaking
import { useOptimizedImage } from '@/features/issues/hooks/use-optimized-image';
```

### UI Component Barrel
```typescript
// src/components/ui/index.ts
export * from './optimized-image';
export * from './button';
// ... other components
```

**Usage**:
```typescript
// Good: Import from barrel
import { OptimizedImage, Button } from '@/components/ui';

// Also OK: Direct import
import { OptimizedImage } from '@/components/ui/optimized-image';
```

---

## Import Path Aliases

### Configured in `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Usage
```typescript
// ✅ Use alias for cleaner imports
import { useOptimizedImage } from '@/features/issues/hooks';

// ❌ Avoid relative paths for cross-directory imports
import { useOptimizedImage } from '../../../features/issues/hooks';
```

---

## ESLint Configuration (Recommended)

Enforce import rules with ESLint:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*'],
            importNames: ['*'],
            message: 'UI components cannot import from features',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/components/ui/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@/features/**',
              // UI components cannot import from features
            ],
          },
        ],
      },
    },
    {
      files: ['src/lib/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@/features/**',
              '@/components/**',
              // Global utils cannot import from app
            ],
          },
        ],
      },
    },
  ],
};
```

---

## Circular Dependency Prevention

### ❌ Circular Dependency (Bad)
```
ComponentA.tsx
  ↓ imports
ComponentB.tsx
  ↓ imports
ComponentA.tsx  ← CIRCULAR!
```

### ✅ Solution: Extract shared logic
```
ComponentA.tsx ───┐
                  ↓ imports
ComponentB.tsx ───┘  shared-utils.ts
```

### Our Architecture Prevents Circulars

The strict layering ensures:
1. UI never imports from Features
2. Features never import from each other
3. Utils never import from app code
4. Clear unidirectional dependency flow

---

## TypeScript Import Checking

```typescript
// Type imports use 'import type' for clarity
import type { OptimizedImageProps } from '@/components/ui/optimized-image';

// Value imports
import { OptimizedImage } from '@/components/ui/optimized-image';
```

---

## Summary: Import Chain

```
Application Component
    ↓ imports
Feature Component (Wiring)
    ├─ imports → Feature Hook (Logic)
    │               ↓ imports
    │           Global Util
    │
    └─ imports → UI Component (Presentation)
                    ↓ imports
                Global Util
```

**Key Principle**: Each layer only imports from lower, more reusable layers.
