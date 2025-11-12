# Issue Details Route

## Route Structure

```
/issue/[issueKey]
```

Example URLs:
- `/issue/MKT-101` - Marketing Site issue #101
- `/issue/MKT-102` - Marketing Site issue #102
- `/issue/PRJ-123` - Project issue #123

## Files

### `page.tsx`
Main page component that:
- Accepts `issueKey` as a route parameter (e.g., "MKT-101")
- Looks up the issue from mock fixtures by key
- Converts issueKey → issueId for the detail screen
- Renders `IssueDetailsScreen` component
- Handles not found cases

### `loading.tsx`
Loading state that displays:
- `EnhancedResponsiveIssueLayoutSkeleton` while page loads
- Automatic skeleton UI during route transitions

### `error.tsx`
Error boundary that:
- Catches any errors during page load
- Displays user-friendly error message
- Provides "Try Again" and "Back to Issues" actions
- Logs errors for debugging

### `not-found.tsx`
Not found page that displays when:
- Issue key doesn't exist in fixtures
- User navigates to invalid issue key
- Issue has been deleted (in production)

## Usage

### Navigation
```tsx
// From other components
import Link from 'next/link';

<Link href="/issue/MKT-101">View Issue</Link>

// Programmatic navigation
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/issue/MKT-101');
```

### Current Implementation (Mock)
```tsx
// page.tsx
import { getDetailedIssueByKey } from '@/src/mocks/issue.fixtures';

const issue = getDetailedIssueByKey('MKT-101');
// Returns full issue object with all relationships

<IssueDetailsScreen issueId={issue.id} userId="user_1" />
```

### Future Implementation (Real Backend)
```tsx
// page.tsx (when backend is ready)
import { getIssueByKey } from '@/src/server/issues';

const issue = await getIssueByKey(issueKey);
// Fetches from database

<IssueDetailsScreen issueId={issue.id} userId={session.user.id} />
```

## Available Mock Issues

Test the page with these issue keys:
- `MKT-101` - Button alignment bug (has attachments)
- `MKT-102` - Dark mode feature (in progress)
- `MKT-103` - Performance optimization (in review)
- `MKT-104` - Footer links bug (resolved)
- `MKT-105` - Email validation bug (critical)
- `MKT-106` - Analytics feature (low priority)

## Data Flow

```
URL: /issue/MKT-101
    │
    ▼
page.tsx receives { params: { issueKey: 'MKT-101' } }
    │
    ▼
getDetailedIssueByKey('MKT-101')
    │
    ├─> [MOCK] Returns issue from fixtures
    └─> [REAL] Query database by issue key
    │
    ▼
<IssueDetailsScreen issueId={issue.id} />
    │
    └─> Renders full issue details with:
        - Attachments canvas viewer
        - Metadata sidebar
        - Activity timeline
        - Inline editing
```

## Features

✅ Server-side rendering (SSR) for SEO
✅ Automatic metadata generation
✅ Loading states with skeleton UI
✅ Error boundaries
✅ Not found handling
✅ Full issue details view
✅ Responsive design (mobile/tablet/desktop)
✅ Attachment viewer with zoom/pan
✅ Activity timeline with pagination
✅ Inline editing for all fields
✅ Delete confirmation
✅ Optimistic updates
✅ Keyboard shortcuts

## Production Checklist

When implementing real backend:

- [ ] Replace `getDetailedIssueByKey` with database query
- [ ] Add proper authentication check (verify user session)
- [ ] Implement permission checks (can user view this issue?)
- [ ] Add rate limiting for issue endpoints
- [ ] Implement issue key validation
- [ ] Add analytics tracking (page views)
- [ ] Set up error reporting (Sentry, etc.)
- [ ] Add SEO meta tags based on issue content
- [ ] Implement breadcrumbs navigation
- [ ] Add share functionality
- [ ] Implement watch/unwatch feature
- [ ] Add keyboard shortcut help modal

## Testing

### Manual Testing
1. Navigate to `/issue/MKT-101`
2. Verify issue details load correctly
3. Check attachments display properly
4. Test activity timeline
5. Try editing fields (title, description, etc.)
6. Test delete functionality
7. Verify responsive design on mobile
8. Test keyboard shortcuts (E, D, ?, etc.)
9. Navigate to `/issue/INVALID-KEY` (should show not found)
10. Refresh page (should maintain state)

### E2E Testing (when ready)
```typescript
test('displays issue details correctly', async ({ page }) => {
  await page.goto('/issue/MKT-101');

  // Verify issue key is displayed
  await expect(page.locator('text=MKT-101')).toBeVisible();

  // Verify title is displayed
  await expect(page.locator('text=Button alignment issue')).toBeVisible();

  // Verify attachments are loaded
  await expect(page.locator('[data-testid="attachment-canvas"]')).toBeVisible();

  // Verify activity timeline
  await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
});
```

## Related Files

- [IssueDetailsScreen](../../../../../features/issues/screens/issue-details-screen-new.tsx) - Main screen component
- [Issue Types](../../../../../types/issue.ts) - Type definitions
- [Issue Fixtures](../../../../../mocks/issue.fixtures.ts) - Mock data
- [Issue API](../../../../../features/issues/api/) - API layer
- [Issue Hooks](../../../../../features/issues/hooks/) - React hooks

---

**Status**: ✅ Ready-to-use with mock data

The route is fully functional and displays the complete issue details UI with mock data!
