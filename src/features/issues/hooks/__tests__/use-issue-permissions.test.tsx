/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ============================================================================
// MOCK getIssueDetails so useIssueDetails returns controlled data
// ============================================================================

const mockGetIssueDetails = vi.fn();

vi.mock('@/features/issues/api/get-issue-details', () => ({
  getIssueDetails: (...args: unknown[]) => mockGetIssueDetails(...args),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

// Import after mocks
import { useIssuePermissions } from '../use-issue-permissions';

// ============================================================================
// HELPERS
// ============================================================================

const ISSUE_ID = 'issue-test-1';

const BASE_ISSUE = {
  id: ISSUE_ID,
  issueKey: 'PRJ-1',
  title: 'Test Issue',
  description: '',
  type: 'bug' as const,
  priority: 'medium' as const,
  status: 'open' as const,
  projectId: 'proj-1',
  teamId: 'team-1',
  reporter: { id: 'u1', name: 'Alice', email: 'alice@example.com', image: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('useIssuePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all-false when permissions array is empty (PROJECT_VIEWER)', async () => {
    mockGetIssueDetails.mockResolvedValue({ issue: BASE_ISSUE, permissions: ['issue:view', 'project:view'] });

    const { result } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    // During loading, permissions default to false
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.canAssign).toBe(false);
    expect(result.current.canChangeStatus).toBe(false);
  });

  it('maps full owner permissions to all-true flags', async () => {
    mockGetIssueDetails.mockResolvedValue({
      issue: BASE_ISSUE,
      permissions: [
        'issue:view',
        'issue:create',
        'issue:update',
        'issue:delete',
        'issue:assign',
        'issue:comment',
        'project:view',
      ],
    });

    const { result, rerender } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    // Wait for query to settle
    await vi.waitFor(() => {
      rerender();
      expect(result.current.canEdit).toBe(true);
    });

    expect(result.current.canDelete).toBe(true);
    expect(result.current.canComment).toBe(true);
    expect(result.current.canAssign).toBe(true);
    expect(result.current.canChangeStatus).toBe(true);
  });

  it('PROJECT_VIEWER: canEdit/canDelete/canAssign/canChangeStatus all false, canComment false', async () => {
    mockGetIssueDetails.mockResolvedValue({
      issue: BASE_ISSUE,
      permissions: ['issue:view', 'project:view'],
    });

    const { result, rerender } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    await vi.waitFor(() => {
      rerender();
      // The hook has settled: permissions loaded, no issue:update
      expect(result.current.canEdit).toBe(false);
    });

    expect(result.current.canDelete).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.canAssign).toBe(false);
    expect(result.current.canChangeStatus).toBe(false);
  });

  it('PROJECT_MEMBER: canEdit and canComment true, canDelete and canAssign false', async () => {
    // PROJECT_MEMBER has issue:update and issue:comment but not issue:delete or issue:assign
    mockGetIssueDetails.mockResolvedValue({
      issue: BASE_ISSUE,
      permissions: ['issue:view', 'issue:update', 'issue:comment', 'project:view'],
    });

    const { result, rerender } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    await vi.waitFor(() => {
      rerender();
      expect(result.current.canEdit).toBe(true);
    });

    expect(result.current.canComment).toBe(true);
    expect(result.current.canChangeStatus).toBe(true);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canAssign).toBe(false);
  });

  it('archived project: server strips write perms so hook returns all-false for writes', async () => {
    // Server has already stripped issue:update, issue:delete, etc. for archived projects
    mockGetIssueDetails.mockResolvedValue({
      issue: { ...BASE_ISSUE, projectStatus: 'archived' as const },
      permissions: ['issue:view', 'project:view', 'project:update', 'project:archive'],
    });

    const { result, rerender } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    await vi.waitFor(() => {
      rerender();
      expect(result.current.canEdit).toBe(false);
    });

    expect(result.current.canDelete).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.canAssign).toBe(false);
    expect(result.current.canChangeStatus).toBe(false);
  });

  it('returns all-false while the query is still loading (undefined permissions)', () => {
    // Never resolves — simulates loading state
    mockGetIssueDetails.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useIssuePermissions({ issueId: ISSUE_ID }),
      { wrapper: makeWrapper() }
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.canAssign).toBe(false);
    expect(result.current.canChangeStatus).toBe(false);
  });
});
