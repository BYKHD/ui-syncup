import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetActivities = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/activity-service', () => ({ getActivitiesByIssue: mockGetActivities }));
// Only canViewIssue is called by GET. This file tests GET only.
vi.mock('@/server/projects', () => ({ canViewIssue: mockCanViewIssue }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1/activities?page=1&limit=20', { method: 'GET' });
}

const mockIssue = { id: 'issue-1', projectId: 'proj-1' };

describe('GET /api/issues/[issueId]/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetActivities.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('returns 200 when canViewIssue is true', async () => {
    mockCanViewIssue.mockResolvedValue(true);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(200);
    expect(mockCanViewIssue).toHaveBeenCalledWith('user-1', { projectId: 'proj-1' });
  });

  it('returns 403 when canViewIssue is false', async () => {
    mockCanViewIssue.mockResolvedValue(false);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(403);
  });
});
