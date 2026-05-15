import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetAttachmentsByIssue = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({
  getIssueById: mockGetIssueById,
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
}));
vi.mock('@/server/issues/attachment-service', () => ({
  getAttachmentsByIssue: mockGetAttachmentsByIssue,
}));
// Only canViewIssue is called by GET. This file tests GET only — extend mock if adding PATCH/DELETE tests.
vi.mock('@/server/projects', () => ({ canViewIssue: mockCanViewIssue }));
vi.mock('@/lib/storage', () => ({
  generateDownloadUrl: vi.fn(async () => 'https://example.com/download'),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/server/auth/rbac', () => ({
  hasPermission: vi.fn(),
}));
vi.mock('@/config/roles', () => ({
  PERMISSIONS: {
    ISSUE_VIEW: 'ISSUE_VIEW',
    ISSUE_UPDATE: 'ISSUE_UPDATE',
    ISSUE_DELETE: 'ISSUE_DELETE',
  },
}));

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1', { method: 'GET' });
}

const mockIssue = {
  id: 'issue-1',
  projectId: 'proj-1',
  teamId: 'team-1',
  title: 'T',
  description: 'D',
  issueKey: 'P-1',
  reporterId: 'u',
  assigneeId: null,
  status: 'open',
  priority: 'medium',
  type: 'bug',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('GET /api/issues/[issueId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetAttachmentsByIssue.mockResolvedValue([]);
  });

  it('returns 200 when canViewIssue is true (same-team non-project-member, public project)', async () => {
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

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when issue not found', async () => {
    mockGetIssueById.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(404);
  });
});
