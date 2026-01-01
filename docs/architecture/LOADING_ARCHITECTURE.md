# Loading Architecture

This document describes the loading state architecture for UI SyncUp and provides **patterns that should be followed when building any new feature**.

---

## Principles

1. **Single source of truth** - Each screen has ONE loading state owner
2. **Server-first** - Prefetch data on server when possible
3. **Parallel fetching** - Never wait for parent data if you don't need it
4. **Preload on intent** - Load components when user shows interest (hover/focus)
5. **Graceful degradation** - SSR failures should fall back to client loading

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER COMPONENT                                │
│  • Prefetch all data needed for initial render                          │
│  • Pass data as props to client components                              │
│  • Use timeout protection for non-critical data                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT COMPONENT (Wrapper)                       │
│  • Dynamic import with loading fallback                                 │
│  • Prevents hydration mismatches                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTAINER COMPONENT (Loading Owner)                   │
│  • Manages loading state for its section                                │
│  • Shows skeleton/spinner when loading                                  │
│  • Uses initial data if available, else React Query                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATIONAL COMPONENT (No Loading)                  │
│  • Pure render, receives data as props                                  │
│  • NO loading state - parent handles it                                 │
│  • Can trigger preloads on user interactions                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Patterns

### Pattern 1: Server-Side Prefetching

Use this pattern when a page can benefit from server-fetched data.

#### Step 1: Create Server Fetch Function

```typescript
// src/features/{feature}/api/get-{resource}-server.ts
export interface ServerFetchOptions {
  cookieHeader: string;
}

export async function get{Resource}Server(
  id: string,
  options: ServerFetchOptions
): Promise<{Resource}Response | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/{resource}/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': options.cookieHeader,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`Error prefetching {resource}:`, error);
    return null;
  }
}
```

#### Step 2: Use in Server Component with Timeout

```tsx
// src/app/(protected)/{route}/page.tsx
export default async function Page({ params }) {
  const cookieHeader = await getCookieHeader();
  
  // Parallel prefetch with timeout protection
  const dataPromise = get{Resource}Server(id, { cookieHeader });
  
  const data = await Promise.race([
    dataPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
  ]);
  
  return <ClientWrapper initialData={data?.items} />;
}
```

#### Step 3: Accept Initial Data in Client Component

```tsx
// src/features/{feature}/components/{component}.tsx
interface Props {
  resourceId: string;
  initialData?: Item[];  // Optional SSR prefetched data
}

export function Component({ resourceId, initialData }: Props) {
  const { data, isLoading } = useQuery({ ... });
  
  // Prefer initial data, fall back to query data
  const items = initialData ?? data?.items ?? [];
  
  // Only show loading if no data at all
  const showLoading = isLoading && !initialData && !data;
  
  if (showLoading) return <Skeleton />;
  return <List items={items} />;
}
```

---

### Pattern 2: Loading State Ownership

#### ✅ DO: Container Owns Loading

```tsx
// Container component (OWNS loading state)
function ProjectIssues({ projectId }) {
  const { data, isLoading } = useProjectIssues({ projectId });
  
  if (isLoading) return <IssuesListSkeleton />;
  return <IssuesList issues={data.issues} />;  // No loading prop
}

// Presentational component (NO loading state)
function IssuesList({ issues }) {
  return issues.map(issue => <IssueRow issue={issue} />);
}
```

#### ❌ DON'T: Duplicate Loading States

```tsx
// BAD: Both components have loading state
function ProjectIssues({ projectId }) {
  const { data, isLoading } = useProjectIssues({ projectId });
  return <IssuesList issues={data?.issues} isLoading={isLoading} />;
}

function IssuesList({ issues, isLoading }) {
  if (isLoading) return <Skeleton />;  // ❌ Duplicate!
  return issues.map(...);
}
```

---

### Pattern 3: Parallel Data Fetching

#### ✅ DO: Fetch in Parallel

```tsx
function DetailsScreen({ id }) {
  // Both queries start immediately
  const { data: main } = useMainData({ id });
  const { data: related } = useRelatedData({ id, enabled: !!id });
  
  if (!main) return <Skeleton />;
  return <Details main={main} related={related} />;
}
```

#### ❌ DON'T: Create Waterfalls

```tsx
function DetailsScreen({ id }) {
  const { data: main } = useMainData({ id });
  
  // ❌ Waits for main to complete
  const { data: related } = useRelatedData({
    id,
    enabled: !!main,  // Creates waterfall!
  });
}
```

---

### Pattern 4: Component Preloading

Create preload utilities for heavy lazy-loaded components:

```typescript
// src/features/{feature}/components/preload.ts
export function preload{Feature}Components() {
  import('./{heavy-component-1}');
  import('./{heavy-component-2}');
}
```

Trigger on hover/focus:

```tsx
function ListItem({ item, onClick }) {
  const hasPreloaded = useRef(false);
  
  const handleHover = useCallback(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preload{Feature}Components();
    }
  }, []);
  
  return (
    <div 
      onClick={onClick} 
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      {item.name}
    </div>
  );
}
```

---

### Pattern 5: Dynamic Import with Skeleton

For components that can't be SSR'd (e.g., using Radix UI):

```tsx
// src/features/{feature}/components/{component}-wrapper.tsx
import dynamic from "next/dynamic";
import { ComponentSkeleton } from "./component-skeleton";

const Component = dynamic(
  () => import("./component").then(mod => ({ default: mod.Component })),
  { 
    ssr: false,
    loading: () => <ComponentSkeleton />
  }
);

export function ComponentWrapper(props) {
  return <Component {...props} />;
}
```

---

## Adding a New Feature Checklist

When adding a new feature with data loading:

- [ ] **Server Component**: Can data be prefetched? Create server fetch function
- [ ] **Timeout Protection**: Add 3s timeout for non-critical SSR data
- [ ] **Loading Owner**: Identify which component owns loading state
- [ ] **No Duplicate Skeletons**: Presentational components have NO loading state
- [ ] **Parallel Fetching**: Check for unnecessary `enabled: !!parentData`
- [ ] **Preloading**: Heavy lazy components have preload functions
- [ ] **Wrapper Pattern**: Use dynamic import for Radix UI components
- [ ] **staleTime**: Set appropriate cache time (default: 30s)

---

## React Query Configuration

### Recommended staleTime Values

| Data Type | staleTime | Reason |
|-----------|-----------|--------|
| User profile | 5 min | Rarely changes |
| Static lists | 5 min | Cached well |
| Active data (issues, tasks) | 30s | Balance freshness/caching |
| Real-time data | 0 + `refetchInterval` | Always fresh |

### Template Hook

```typescript
export function use{Resource}({ id }: Params) {
  return useQuery({
    queryKey: ['{resource}', id],
    queryFn: () => get{Resource}(id),
    enabled: !!id,
    staleTime: 30 * 1000,  // 30 seconds
    retry: 1,
  });
}
```

---

## File Structure Template

```
src/features/{feature}/
├── api/
│   ├── get-{resource}.ts           # Client-side API
│   ├── get-{resource}-server.ts    # Server-side API (SSR)
│   └── index.ts
├── components/
│   ├── {list-component}.tsx        # Presentational (no loading)
│   ├── {container-component}.tsx   # Owns loading state
│   ├── {component}-skeleton.tsx    # Skeleton for this feature
│   └── preload.ts                  # Preload utilities
├── hooks/
│   └── use-{resource}.ts           # React Query hook
└── screens/
    └── {screen}.tsx                # Screen component
```

---

## Reference Implementation

See these files for reference implementations:

| Pattern | Reference File |
|---------|---------------|
| Server prefetch | `src/app/(protected)/(team)/(routes)/[projectSlug]/page.tsx` |
| Server fetch function | `src/features/issues/api/get-project-issues-server.ts` |
| Loading owner | `src/features/projects/components/project-issues.tsx` |
| Pure presentational | `src/features/issues/components/issues-list.tsx` |
| Preload utilities | `src/features/issues/components/preload.ts` |
| Parallel fetching | `src/features/issues/screens/issue-details-screen.tsx` |
| Dynamic wrapper | `src/components/layout/app-shell-wrapper.tsx` |
| Shell skeleton | `src/components/layout/app-shell-skeleton.tsx` |

