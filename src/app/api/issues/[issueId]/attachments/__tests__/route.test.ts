import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetAttachmentsByIssue = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/attachment-service', () => ({
  getAttachmentsByIssue: mockGetAttachmentsByIssue,
  createAttachment: vi.fn(),
}));
// Only canViewIssue is called by GET. This file tests GET only.
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

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1/attachments', { method: 'GET' });
}

const mockIssue = { id: 'issue-1', projectId: 'proj-1' };

describe('GET /api/issues/[issueId]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetAttachmentsByIssue.mockResolvedValue([]);
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
