# Issue Details Feature Architecture

## 🏗️ Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                       │
│                   (Next.js Page/Route)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     SCREEN COMPONENT                         │
│          (issue-details-screen-new.tsx)                      │
│                                                              │
│  • Thin composition layer (~160 lines)                       │
│  • No business logic                                         │
│  • Composes hooks + components                              │
│  • Handles routing/navigation                               │
└────────────────┬────────────────────────┬───────────────────┘
                 │                        │
                 │                        │
        ┌────────▼─────────┐     ┌────────▼──────────┐
        │  REACT HOOKS      │     │   COMPONENTS      │
        │  (features/hooks) │     │  (presentational) │
        │                   │     │                   │
        │ • useIssueDetails │     │ • ResponsiveLayout│
        │ • useActivities   │     │ • DetailsPanel    │
        │ • useUpdate       │     │ • AttachmentsView │
        │ • useDelete       │     │ • ActivityTimeline│
        └─────────┬─────────┘     └───────────────────┘
                  │
                  │ SWR caching
                  │
        ┌─────────▼─────────┐
        │     API LAYER     │
        │  (features/api)   │
        │                   │
        │ • getIssueDetails │
        │ • getActivities   │
        │ • updateIssue     │
        │ • deleteIssue     │
        └─────────┬─────────┘
                  │
                  │ Currently: Mock
                  │ Future: Real API
                  │
        ┌─────────▼─────────┐
        │    DATA SOURCE    │
        │                   │
        │  MOCK: fixtures   │
        │  REAL: Backend    │
        └───────────────────┘
```

## 📊 Data Flow

### Reading Data (GET)
```
User Action
    │
    ▼
Screen Component
    │
    ├─> useIssueDetails hook
    │       │
    │       ├─> SWR cache check
    │       │       │
    │       │       ├─> Cache HIT: return cached data
    │       │       │
    │       │       └─> Cache MISS:
    │       │               │
    │       │               ▼
    │       └─> getIssueDetails(api)
    │               │
    │               ├─> [MOCK] fixtures
    │               └─> [REAL] fetch(/api/issues/:id)
    │                       │
    │                       ▼
    │               Response + Cache
    │
    └─> Component renders with data
```

### Writing Data (UPDATE/DELETE)
```
User Action (e.g., edit title)
    │
    ▼
Screen Component
    │
    └─> useIssueUpdate hook
            │
            ├─> Optimistic update (immediate UI)
            │       │
            │       └─> Update local cache
            │               │
            │               └─> Re-render with new data
            │
            └─> updateIssue(api)
                    │
                    ├─> [MOCK] simulated update
                    └─> [REAL] fetch(/api/issues/:id, PATCH)
                            │
                            ├─> Success: keep optimistic update
                            └─> Error: rollback to previous
```

## 🗂️ File Organization

```
src/
├── types/
│   └── issue.ts                          # Global types
│       ├── IssueDetailData
│       ├── ActivityEntry
│       ├── IssueAttachment
│       ├── IssuePermissions
│       └── ... (all domain types)
│
├── mocks/                                # Mock data (for mockup)
│   ├── issue.fixtures.ts
│   ├── attachment.fixtures.ts
│   └── activity.fixtures.ts
│
└── features/issues/
    ├── api/                              # API layer
    │   ├── get-issue-details.ts         # [MOCK → REAL]
    │   ├── get-issue-activities.ts      # [MOCK → REAL]
    │   ├── update-issue.ts              # [MOCK → REAL]
    │   └── delete-issue.ts              # [MOCK → REAL]
    │
    ├── hooks/                            # React hooks
    │   ├── use-issue-details.ts         # ✅ Ready
    │   ├── use-issue-activities.ts      # ✅ Ready
    │   ├── use-issue-update.ts          # ✅ Ready
    │   └── use-issue-delete.ts          # ✅ Ready
    │
    ├── components/                       # Presentational
    │   ├── responsive-issue-layout.tsx  # ✅ Pure UI
    │   ├── issue-details-panel.tsx      # ✅ Pure UI
    │   ├── issue-attachments-view.tsx   # ✅ Pure UI
    │   ├── metadata-section.tsx         # ✅ Pure UI
    │   └── activity-timeline.tsx        # ✅ Pure UI
    │
    ├── screens/                          # Screen composition
    │   └── issue-details-screen-new.tsx # ✅ Thin & clean
    │
    ├── types/                            # Re-exports
    │   └── index.ts
    │
    └── index.ts                          # Feature exports
```

## 🔄 State Management

### SWR Cache Keys
```typescript
// Issue details
['issue-details', issueId]

// Activities
['issue-activities', issueId, cursor, limit]

// Automatic cache invalidation on mutations
mutate(['issue-details', issueId])      // After update
mutate(['issue-activities', issueId])   // After update
```

### Component State (Local)
```typescript
// Screen level
- activityCursor (pagination)
- permissions (derived from user/issue)

// Component level
- selectedAttachmentId (image selector)
- isPanelCollapsed (layout toggle)
- isEditingTitle/Description (inline editing)
```

## 🎨 Component Hierarchy

```
IssueDetailsScreen
├── ResponsiveIssueLayout
│   ├── IssueAttachmentsView
│   │   ├── CenteredCanvasView
│   │   │   ├── ImageCanvas
│   │   │   └── ZoomControls
│   │   └── ImageSelector
│   │
│   └── IssueDetailsPanel
│       ├── PanelHeader
│       │   ├── IssueKey
│       │   ├── Actions
│       │   └── IssueDeletionDialog
│       │
│       ├── MetadataSection
│       │   ├── InlineEditableText (title)
│       │   ├── InlineEditableTextarea (description)
│       │   ├── InlineEditableSelect (status/type)
│       │   ├── PrioritySelector
│       │   └── InlineEditableUserSelect (assignee)
│       │
│       └── ActivityTimeline
│           ├── ActivityEntry (repeated)
│           └── LoadMoreButton
```

## 🚀 Migration Path: Mock → Real

### Step 1: Update API Layer
```typescript
// Before (Mock)
export async function getIssueDetails(params) {
  const mockData = getDetailedIssueById(params.issueId);
  return { issue: mockData };
}

// After (Real)
export async function getIssueDetails(params) {
  const response = await fetch(`/api/issues/${params.issueId}`);
  const data = await response.json();
  return IssueDetailResponseSchema.parse(data);
}
```

### Step 2: No Changes Needed!
- ✅ Hooks work the same
- ✅ Components work the same
- ✅ Screen works the same
- ✅ Types are already correct
- ✅ Error handling in place
- ✅ Loading states in place

### Step 3: Testing
```typescript
// Test with real backend
const { issue } = useIssueDetails({ issueId: 'real_issue_id' });

// Everything just works! 🎉
```

## 📦 Dependencies Flow

```
External Dependencies
    │
    ├─> react (UI)
    ├─> swr (data fetching/caching)
    ├─> sonner (toasts)
    ├─> framer-motion (animations)
    └─> @radix-ui/* (UI primitives)
        │
        ▼
Internal Dependencies
    │
    ├─> @/features/issues/types (types)
    ├─> @/src/mocks/* (fixtures)
    ├─> @/components/ui/* (shadcn)
    ├─> @/lib/utils (utilities)
    └─> @/hooks/* (global hooks)
```

## 🎯 Benefits of This Architecture

1. **Separation of Concerns**
   - Each layer has a single responsibility
   - Easy to understand and modify

2. **Testability**
   - API layer: Unit test pure functions
   - Hooks: Test with renderHook()
   - Components: Test with render()
   - Screen: Integration test

3. **Reusability**
   - Hooks can be used in other screens
   - Components can be composed differently
   - API functions can be called directly

4. **Type Safety**
   - End-to-end TypeScript
   - Compile-time error detection
   - IDE autocomplete everywhere

5. **Performance**
   - SWR automatic caching
   - Deduplication of requests
   - Optimistic updates
   - Lazy loading

6. **Maintainability**
   - Clear file structure
   - Easy to find code
   - Simple to onboard new devs
   - Documentation inline

7. **Scalability**
   - Add new features easily
   - Patterns are consistent
   - No technical debt
   - Clean migrations

---

## 💡 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| SWR over React Query | Simpler API, built-in deduplication, smaller bundle |
| Mock API layer | Enables visual mockup without backend |
| Separate hooks | Reusable across features, easier testing |
| Thin screens | Logic in hooks, screens just compose |
| Central types | Single source of truth, no duplication |
| Barrel exports | Clean imports, stable public API |

---

**This architecture follows SOLID principles and allows for easy testing, maintenance, and scaling.**
