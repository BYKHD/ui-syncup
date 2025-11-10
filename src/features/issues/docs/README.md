# Issue Details Feature - Ready-to-Wire Visual UI

This feature has been refactored following the project scaffolding guidelines in `AGENTS.md` to create a clean, maintainable, and ready-to-wire structure.

## 📁 Directory Structure

```
src/features/issues/
├── api/                                # API layer (currently mocked)
│   ├── get-issue-details.ts          # Fetch issue with relationships
│   ├── get-issue-activities.ts        # Fetch activity timeline
│   ├── update-issue.ts                # Update issue fields
│   ├── delete-issue.ts                # Delete issue
│   └── index.ts                       # Barrel exports
│
├── hooks/                              # React hooks (SWR/data fetching)
│   ├── use-issue-details.ts          # Fetch & cache issue details
│   ├── use-issue-activities.ts        # Fetch & cache activities
│   ├── use-issue-update.ts           # Mutation hook for updates
│   ├── use-issue-delete.ts           # Mutation hook for deletion
│   ├── use-issue-filters.ts          # Filter state management
│   └── index.ts                       # Barrel exports
│
├── components/                         # Presentational components
│   ├── issue-attachments-view.tsx    # Attachment canvas view
│   ├── issue-details-panel.tsx       # Details sidebar panel
│   ├── responsive-issue-layout.tsx   # Responsive layout wrapper
│   ├── metadata-section.tsx          # Issue metadata fields
│   ├── activity-timeline.tsx         # Activity feed
│   ├── panel-header.tsx              # Panel header with actions
│   ├── centered-canvas-view.tsx      # Image canvas viewer
│   ├── image-selector.tsx            # Image thumbnail selector
│   └── ... (other components)
│
├── screens/                            # Screen components (thin)
│   ├── issue-details-screen-new.tsx  # **NEW** Ready-to-wire screen
│   ├── issue-details-screen.tsx      # Original (can be removed)
│   └── issue-details-skeletons.tsx   # Loading skeletons
│
├── types/                              # Domain types
│   └── index.ts                       # Re-exports from @/src/types/issue
│
└── index.ts                           # Feature barrel exports
```

## 🎯 What Changed

### Before (Old Structure)
- ❌ **issue-details-screen.tsx**: 630+ lines, mixed concerns
  - Data fetching logic
  - Business logic
  - State management
  - Error handling
  - Keyboard shortcuts
  - Performance monitoring
  - UI rendering

- ❌ No clear API layer
- ❌ Types scattered or missing
- ❌ No reusable hooks
- ❌ Hard to test or modify

### After (New Structure)
- ✅ **issue-details-screen-new.tsx**: ~160 lines, pure composition
  - Only composes hooks and components
  - No business logic
  - Clean, readable, maintainable

- ✅ **API Layer** (`api/`)
  - Separate fetchers for each operation
  - Mock implementations for visual mockup
  - Easy to replace with real backend calls

- ✅ **React Hooks** (`hooks/`)
  - `useIssueDetails`: Fetch & cache issue data
  - `useIssueActivities`: Paginated activities
  - `useIssueUpdate`: Optimistic updates
  - `useIssueDelete`: Delete with callbacks

- ✅ **Comprehensive Types** (`src/types/issue.ts`)
  - All domain types in one place
  - Properly structured and documented

- ✅ **Rich Mock Data** (`src/mocks/`)
  - `attachment.fixtures.ts`: Mock attachments
  - `activity.fixtures.ts`: Mock activity timeline
  - `issue.fixtures.ts`: Enhanced with detailed issues

## 🚀 Usage

### Basic Usage (Screen Component)

```tsx
import { IssueDetailsScreen } from '@/features/issues';

// In your page component
export default function IssuePage({ params }: { params: { issueId: string } }) {
  return <IssueDetailsScreen issueId={params.issueId} userId="current_user_id" />;
}
```

### Advanced Usage (Custom Composition)

```tsx
import {
  useIssueDetails,
  useIssueActivities,
  useIssueUpdate,
  ResponsiveIssueLayout,
} from '@/features/issues';

function CustomIssueView({ issueId }: { issueId: string }) {
  const { issue, isLoading } = useIssueDetails({ issueId });
  const { activities } = useIssueActivities({ issueId });
  const { updateField } = useIssueUpdate();

  if (isLoading) return <div>Loading...</div>;
  if (!issue) return <div>Not found</div>;

  return (
    <ResponsiveIssueLayout
      issueId={issueId}
      issueData={issue}
      attachments={issue.attachments || []}
      activities={activities}
      onUpdate={updateField}
      // ... other props
    />
  );
}
```

## 🔄 Migrating to Real Backend

When you're ready to implement the real feature, follow these steps:

### 1. Replace API Layer

Update `/src/features/issues/api/*.ts` files to call real backend:

```ts
// Before (Mock)
export async function getIssueDetails(params: GetIssueDetailsParams) {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
  const issueDetail = getDetailedIssueById(params.issueId);
  return { issue: issueDetail };
}

// After (Real API)
export async function getIssueDetails(params: GetIssueDetailsParams) {
  const response = await fetch(`/api/issues/${params.issueId}`);
  if (!response.ok) throw new Error('Failed to fetch issue');
  return response.json();
}
```

### 2. Add Zod Validation

Add proper DTO validation in API layer:

```ts
import { z } from 'zod';

const IssueDetailResponseSchema = z.object({
  issue: z.object({
    id: z.string(),
    issueKey: z.string(),
    title: z.string(),
    // ... other fields
  }),
});

export async function getIssueDetails(params: GetIssueDetailsParams) {
  const response = await fetch(`/api/issues/${params.issueId}`);
  const data = await response.json();
  return IssueDetailResponseSchema.parse(data); // Validate response
}
```

### 3. Implement Real Permissions

Replace mock permissions with real RBAC:

```ts
// In issue-details-screen-new.tsx
import { useSession } from '@/src/hooks/use-session';
import { useIssuePermissions } from '@/src/hooks/use-issue-permissions';

export default function IssueDetailsScreen({ issueId }: Props) {
  const { user } = useSession();
  const { issue } = useIssueDetails({ issueId });
  const permissions = useIssuePermissions(issue, user); // Real permissions

  // ... rest of component
}
```

### 4. Update Screens to Use New Version

```tsx
// In app/(protected)/issues/[issueId]/page.tsx
import { IssueDetailsScreen } from '@/features/issues';

export default function IssuePage({ params }: { params: { issueId: string } }) {
  return <IssueDetailsScreen issueId={params.issueId} />;
}
```

## 📊 Mock Data

All mock data is centralized in `/src/mocks/`:

- **Issues**: 6 detailed issues with markdown descriptions
- **Attachments**: 5 sample attachments (images + PDF)
- **Activities**: 20 activity entries across all issues
- **Users**: 4 mock users with avatars

### Accessing Mock Data

```ts
import {
  MOCK_DETAILED_ISSUES,
  getDetailedIssueById,
  MOCK_ATTACHMENTS,
  getAttachmentsByIssueId,
  MOCK_ACTIVITIES,
  getActivitiesByIssueId,
} from '@/src/mocks';

// Get specific issue with all relationships
const issue = getDetailedIssueById('issue_1');

// Get attachments for an issue
const attachments = getAttachmentsByIssueId('issue_1');

// Get activities for an issue
const activities = getActivitiesByIssueId('issue_1');
```

## 🧪 Testing

The refactored structure makes testing much easier:

```tsx
// Test API layer
import { getIssueDetails } from '@/features/issues/api';

test('fetches issue details', async () => {
  const result = await getIssueDetails({ issueId: 'issue_1' });
  expect(result.issue).toBeDefined();
  expect(result.issue.issueKey).toBe('MKT-101');
});

// Test hooks
import { renderHook } from '@testing-library/react';
import { useIssueDetails } from '@/features/issues/hooks';

test('useIssueDetails fetches and caches data', async () => {
  const { result } = renderHook(() => useIssueDetails({ issueId: 'issue_1' }));
  await waitFor(() => expect(result.current.issue).toBeDefined());
});

// Test components
import { render } from '@testing-library/react';
import { IssueDetailsScreen } from '@/features/issues';

test('renders issue details screen', () => {
  render(<IssueDetailsScreen issueId="issue_1" />);
  // ... assertions
});
```

## 📝 File Summary

### Key Files to Review

1. **`screens/issue-details-screen-new.tsx`** - The new thin screen component
2. **`api/get-issue-details.ts`** - Mock API implementation
3. **`hooks/use-issue-details.ts`** - Data fetching hook
4. **`src/types/issue.ts`** - Complete type definitions
5. **`src/mocks/issue.fixtures.ts`** - Rich mock data

### Files to Remove (After Migration)

- `screens/issue-details-screen.tsx` (old version with mixed concerns)

## ✅ Benefits

1. **Separation of Concerns**: Clear boundaries between data, logic, and UI
2. **Reusability**: Hooks and components can be used in other screens
3. **Testability**: Each layer can be tested independently
4. **Maintainability**: Easy to locate and update specific functionality
5. **Type Safety**: Comprehensive TypeScript types throughout
6. **Mock-Ready**: Visual UI works with realistic mock data
7. **Backend-Ready**: API layer can be swapped with real backend calls
8. **Performance**: Optimized with SWR caching and deduplication

## 🎨 Visual UI Status

- ✅ Fully functional with mock data
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Loading states and skeletons
- ✅ Error states with retry
- ✅ Empty states
- ✅ Image attachments with canvas viewer
- ✅ Activity timeline
- ✅ Inline editing
- ✅ Optimistic updates
- ✅ Delete confirmation

## 📦 Dependencies

The feature uses:
- `swr` - Data fetching and caching
- `sonner` - Toast notifications
- `framer-motion` - Animations
- `@radix-ui/*` - UI primitives (via shadcn/ui)

All dependencies are already in the project.

## 🔗 Related Files

- **`AGENTS.md`** - Project scaffolding guidelines
- **`src/types/issue.ts`** - Global issue types
- **`src/mocks/`** - All mock fixtures
- **`src/hooks/`** - Global hooks (session, permissions, etc.)

---

**Ready-to-Wire**: This feature is now a visual mockup ready for backend implementation. All data flows are mocked but follow the real architecture. Simply replace the API layer with real backend calls when ready! 🚀
