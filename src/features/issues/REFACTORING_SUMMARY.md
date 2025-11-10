# Issue Hooks Refactoring Summary

## Overview
Refactored all issue hooks to follow the "ready-to-wire" pattern according to project scaffolding guidelines (AGENTS.md and AI_MOCKUP_INST.md).

## Changes Made

### 1. Migrated from SWR to React Query
**Motivation**: Project uses `@tanstack/react-query` as the standard data fetching library

**Files Changed**:
- `use-issue-details.ts` - Now uses `useQuery` instead of `useSWR`
- `use-issue-activities.ts` - Now uses `useQuery` instead of `useSWR`

**Key Improvements**:
- Added centralized query keys (`issueKeys`) for cache management
- Added `enabled` parameter for conditional fetching
- Consistent API with other feature hooks (projects, etc.)
- Better TypeScript types with proper error handling

### 2. Converted Manual State to React Query Mutations
**Motivation**: Eliminate manual state management; use React Query's built-in mutation handling

**Files Changed**:
- `use-issue-update.ts` - Now uses `useMutation` with automatic cache invalidation
- `use-issue-delete.ts` - Now uses `useMutation` with automatic cache invalidation

**Key Improvements**:
- Automatic revalidation of related queries after mutations
- Built-in toast notifications for success/error
- Consistent mutation API (`mutate`/`mutateAsync`, `isPending`, `error`, `reset`)
- No manual `useState` or `useCallback` - cleaner code

### 3. Extracted Business Logic to Pure Utilities
**Motivation**: Separate business logic from React hooks for testability and reusability

**Files Created**:
- `src/features/issues/utils/filter-issues.ts` - Pure filtering/sorting functions
- `src/features/issues/utils/index.ts` - Barrel export

**Files Changed**:
- `use-issue-filters.ts` - Now delegates to pure utility functions

**Key Improvements**:
- Business logic can be tested without React
- Utilities can be reused in non-React contexts
- Hook is now just state management + memoization
- Follows single responsibility principle

### 4. Kept Visual Utility Hooks As-Is
**Files Unchanged**:
- `use-keyboard-shortcuts.ts` - Already follows ready-to-wire pattern (visual utility)

### 5. Updated Barrel Exports
**Files Changed**:
- `src/features/issues/hooks/index.ts` - Added comments grouping hooks by type

## Architecture Alignment

### Query Keys Pattern
```typescript
export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...issueKeys.lists(), filters] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  activities: (id: string) => [...issueKeys.detail(id), 'activities'] as const,
};
```

This follows the hierarchical pattern established in `use-project.ts`.

### Hook Signatures

#### Before (SWR):
```typescript
const { issue, isLoading, error, mutate, isValidating } = useIssueDetails({
  issueId: 'issue_1'
});
```

#### After (React Query):
```typescript
const { issue, isLoading, error, refetch } = useIssueDetails({
  issueId: 'issue_1',
  enabled: true
});
```

#### Before (Manual State):
```typescript
const { updateField, isUpdating, error } = useIssueUpdate({
  onSuccess: () => {},
  onError: () => {}
});
await updateField('issue_1', 'status', 'done', 'user_1');
```

#### After (React Query Mutation):
```typescript
const { mutate, isPending, error } = useIssueUpdate({
  onSuccess: () => {},
  onError: () => {}
});
mutate({
  issueId: 'issue_1',
  field: 'status',
  value: 'done',
  actorId: 'user_1'
});
```

## Benefits

### 1. Type Safety
- All hooks have proper TypeScript interfaces
- Consistent parameter and return types
- Eliminates `any` types

### 2. Cache Management
- Automatic cache invalidation after mutations
- Hierarchical query keys enable targeted invalidation
- Optimized refetching reduces unnecessary network calls

### 3. Developer Experience
- Consistent API across all hooks
- Built-in loading/error states
- Automatic toast notifications
- Better IDE autocomplete

### 4. Testability
- Pure utility functions can be unit tested easily
- Hooks are thin wrappers around utilities and React Query
- Mock data already consolidated in `src/mocks/`

### 5. Maintainability
- Clear separation of concerns (data fetching vs. business logic vs. UI state)
- Follows established patterns from `projects` feature
- Aligns with AGENTS.md scaffolding guidelines

## Migration Guide for Components

### Updating useIssueDetails
```diff
- const { issue, mutate } = useIssueDetails({ issueId });
+ const { issue, refetch } = useIssueDetails({ issueId });
```

### Updating useIssueUpdate
```diff
- const { updateField, isUpdating } = useIssueUpdate();
- await updateField(issueId, 'status', 'done', userId);
+ const { mutate, isPending } = useIssueUpdate();
+ mutate({ issueId, field: 'status', value: 'done', actorId: userId });
```

### Updating useIssueDelete
```diff
- const { deleteIssueById, isDeleting } = useIssueDelete();
- await deleteIssueById(issueId, userId);
+ const { mutate, isPending } = useIssueDelete();
+ mutate({ issueId, actorId: userId });
```

## Next Steps

1. ✅ All hooks refactored to ready-to-wire pattern
2. ✅ Pure utility functions extracted
3. ✅ TypeScript types aligned
4. ⏳ Update components using old signatures (if any)
5. ⏳ Add unit tests for utility functions
6. ⏳ Add integration tests for hooks
7. ⏳ Wire to real backend when available

## Files Modified

### Hooks
- `src/features/issues/hooks/use-issue-details.ts`
- `src/features/issues/hooks/use-issue-activities.ts`
- `src/features/issues/hooks/use-issue-update.ts`
- `src/features/issues/hooks/use-issue-delete.ts`
- `src/features/issues/hooks/use-issue-filters.ts`
- `src/features/issues/hooks/index.ts`

### Utils (New)
- `src/features/issues/utils/filter-issues.ts`
- `src/features/issues/utils/index.ts`

### Unchanged
- `src/features/issues/hooks/use-keyboard-shortcuts.ts` (already compliant)
- `src/features/issues/api/*` (no changes needed)
- `src/mocks/*` (existing fixtures reused)

## Compliance Checklist

- ✅ **Ready-to-wire**: All hooks are pure data fetching or thin state wrappers
- ✅ **No business logic in hooks**: Extracted to `utils/`
- ✅ **Type-safe**: All parameters and returns properly typed
- ✅ **Follows AGENTS.md**: Feature-first structure, layered architecture
- ✅ **Consistent with project**: Matches `projects` feature patterns
- ✅ **React Query integration**: Uses standard mutation/query patterns
- ✅ **Cache management**: Proper invalidation strategies
- ✅ **Error handling**: Toast notifications built-in
- ✅ **Mock data reuse**: No duplicate fixtures created
- ✅ **Barrel exports**: Clean public surface