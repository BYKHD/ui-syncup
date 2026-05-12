import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockHasPermission = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetActivitiesByIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/auth/rbac', () => ({ hasPermission: mockHasPermission }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/activity-service', () => ({ getActivitiesByIssue: mockGetActivitiesByIssue }));

const { GET } = await import('../route');

const BASE_URL = 'http://localhost/api/issues/issue-1/activities';

function makeRequest(search?: string) {
  const url = search ? `${BASE_URL}?${search}` : BASE_URL;
  return new NextRequest(url);
}

const mockIssue = { id: 'issue-1', projectId: 'proj-1' };

const mockActivitiesResult = {
  items: [
    {
      id: 'act-1',
      issueId: 'issue-1',
      type: 'status_changed',
      actor: { id: 'user-1', name: 'Alice' },
      changes: [{ field: 'status', from: 'open', to: 'in_progress' }],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const PARAMS = { params: Promise.resolve({ issueId: 'issue-1' }) };

describe('GET /api/issues/[issueId]/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    mockHasPermission.mockResolvedValue(true);
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetActivitiesByIssue.mockResolvedValue(mockActivitiesResult);
  });

  it('401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('404 when issue not found', async () => {
    mockGetIssueById.mockResolvedValue(null);
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('403 when user lacks ISSUE_VIEW permission', async () => {
    mockHasPermission.mockResolvedValue(false);
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('200 with defaults when no query params provided', async () => {
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(20);
    expect(mockGetActivitiesByIssue).toHaveBeenCalledWith({
      issueId: 'issue-1',
      type: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('200 with explicit page and limit', async () => {
    const res = await GET(makeRequest('page=2&limit=10'), PARAMS);
    expect(res.status).toBe(200);
    expect(mockGetActivitiesByIssue).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 })
    );
  });

  it('200 with type filter', async () => {
    const res = await GET(makeRequest('type=status_changed'), PARAMS);
    expect(res.status).toBe(200);
    expect(mockGetActivitiesByIssue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'status_changed' })
    );
  });

  it('400 when page is below minimum', async () => {
    const res = await GET(makeRequest('page=0'), PARAMS);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('400 when limit exceeds maximum', async () => {
    const res = await GET(makeRequest('limit=101'), PARAMS);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('400 when type is not a valid enum value', async () => {
    const res = await GET(makeRequest('type=invalid_type'), PARAMS);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('200 serializes createdAt to ISO string', async () => {
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.activities[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('500 on unexpected service error', async () => {
    mockGetActivitiesByIssue.mockRejectedValue(new Error('DB_ERROR'));
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
