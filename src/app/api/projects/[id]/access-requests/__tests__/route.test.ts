import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockCreateAccessRequest = vi.fn();
const mockListAccessRequests = vi.fn();
const mockApproveAccessRequest = vi.fn();
const mockDeclineAccessRequest = vi.fn();
const mockCancelAccessRequest = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/projects/access-request-service', () => ({
  createAccessRequest: mockCreateAccessRequest,
  listAccessRequests: mockListAccessRequests,
  approveAccessRequest: mockApproveAccessRequest,
  declineAccessRequest: mockDeclineAccessRequest,
  cancelAccessRequest: mockCancelAccessRequest,
}));

const { POST, GET } = await import('../route');
const { POST: approvePost } = await import('../[requestId]/approve/route');
const { POST: declinePost } = await import('../[requestId]/decline/route');
const { DELETE: cancelDelete } = await import('../[requestId]/route');

const BASE_URL = 'http://localhost/api/projects/proj-1/access-requests';

function makeRequest(method: string, body?: object) {
  return new NextRequest(BASE_URL, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockRequest = {
  id: 'req-1',
  projectId: 'proj-1',
  requesterUserId: 'user-1',
  message: null,
  status: 'pending',
  decidedByUserId: null,
  decidedAt: null,
  declineCooldownUntil: null,
  createdAt: new Date('2026-01-01'),
};

describe('POST /api/projects/[id]/access-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    mockCreateAccessRequest.mockResolvedValue(mockRequest);
  });

  it('401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('201 creates request, returns request payload', async () => {
    const req = makeRequest('POST', { message: 'Please let me in' });
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.request).toBeDefined();
    expect(data.request.id).toBe('req-1');
    expect(data.request.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(mockCreateAccessRequest).toHaveBeenCalledWith({
      projectId: 'proj-1',
      userId: 'user-1',
      message: 'Please let me in',
    });
  });

  it('409 when already a member', async () => {
    mockCreateAccessRequest.mockRejectedValue(new Error('ALREADY_MEMBER'));
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('ALREADY_MEMBER');
  });

  it('409 when request already pending', async () => {
    mockCreateAccessRequest.mockRejectedValue(new Error('REQUEST_PENDING'));
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('REQUEST_PENDING');
  });

  it('409 when cooldown active', async () => {
    mockCreateAccessRequest.mockRejectedValue(new Error('COOLDOWN_ACTIVE'));
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('COOLDOWN_ACTIVE');
  });

  it('404 when project does not exist', async () => {
    mockCreateAccessRequest.mockRejectedValue(new Error('PROJECT_NOT_FOUND'));
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('400 when message exceeds 500 chars', async () => {
    const req = makeRequest('POST', { message: 'a'.repeat(501) });
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_BODY');
  });

  it('500 on unrecognized error', async () => {
    mockCreateAccessRequest.mockRejectedValue(new Error('UNEXPECTED_DB_ERROR'));
    const req = makeRequest('POST', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('GET /api/projects/[id]/access-requests', () => {
  const mockListResult = [
    {
      ...mockRequest,
      requester: {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        image: null,
      },
      decidedByUser: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockListAccessRequests.mockResolvedValue(mockListResult);
  });

  it('401 no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = makeRequest('GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('403 not approver', async () => {
    mockListAccessRequests.mockRejectedValue(new Error('FORBIDDEN'));
    const req = makeRequest('GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('200 returns pending + recent decided list with requester data', async () => {
    const req = makeRequest('GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'proj-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].id).toBe('req-1');
    expect(data.requests[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(data.requests[0].requester).toBeDefined();
    expect(data.requests[0].requester.id).toBe('user-1');
    expect(data.requests[0].decidedByUser).toBeNull();
    expect(mockListAccessRequests).toHaveBeenCalledWith('proj-1', 'admin-1');
  });
});

const REQUEST_ID_URL = 'http://localhost/api/projects/proj-1/access-requests/req-1';

function makeRequestIdRequest(method: string) {
  return new NextRequest(REQUEST_ID_URL, { method });
}

const mockApprovedRequest = {
  ...mockRequest,
  status: 'approved',
  decidedByUserId: 'admin-1',
  decidedAt: new Date('2026-01-02'),
};

const mockDeclinedRequest = {
  ...mockRequest,
  status: 'declined',
  decidedByUserId: 'admin-1',
  decidedAt: new Date('2026-01-02'),
  declineCooldownUntil: new Date('2026-01-09'),
};

const mockCancelledRequest = {
  ...mockRequest,
  status: 'cancelled',
  decidedAt: new Date('2026-01-02'),
};

describe('POST /api/projects/[id]/access-requests/[requestId]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockApproveAccessRequest.mockResolvedValue(mockApprovedRequest);
  });

  it('401 no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('403 non-approver', async () => {
    mockApproveAccessRequest.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('200 marks approved', async () => {
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.request).toBeDefined();
    expect(data.request.id).toBe('req-1');
    expect(data.request.status).toBe('approved');
    expect(data.request.decidedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(mockApproveAccessRequest).toHaveBeenCalledWith('req-1', 'admin-1');
  });

  it('404 unknown requestId', async () => {
    mockApproveAccessRequest.mockRejectedValue(new Error('REQUEST_NOT_FOUND'));
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('409 invalid state', async () => {
    mockApproveAccessRequest.mockRejectedValue(new Error('INVALID_STATE'));
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_STATE');
  });

  it('500 on unexpected error', async () => {
    mockApproveAccessRequest.mockRejectedValue(new Error('UNEXPECTED_DB_ERROR'));
    const res = await approvePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('POST /api/projects/[id]/access-requests/[requestId]/decline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockDeclineAccessRequest.mockResolvedValue(mockDeclinedRequest);
  });

  it('401 no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('403 non-approver', async () => {
    mockDeclineAccessRequest.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('200 marks declined', async () => {
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.request).toBeDefined();
    expect(data.request.id).toBe('req-1');
    expect(data.request.status).toBe('declined');
    expect(data.request.declineCooldownUntil).toBe('2026-01-09T00:00:00.000Z');
    expect(mockDeclineAccessRequest).toHaveBeenCalledWith('req-1', 'admin-1');
  });

  it('404 unknown requestId', async () => {
    mockDeclineAccessRequest.mockRejectedValue(new Error('REQUEST_NOT_FOUND'));
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('409 invalid state', async () => {
    mockDeclineAccessRequest.mockRejectedValue(new Error('INVALID_STATE'));
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_STATE');
  });

  it('500 on unexpected error', async () => {
    mockDeclineAccessRequest.mockRejectedValue(new Error('UNEXPECTED_DB_ERROR'));
    const res = await declinePost(makeRequestIdRequest('POST'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('DELETE /api/projects/[id]/access-requests/[requestId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    mockCancelAccessRequest.mockResolvedValue(mockCancelledRequest);
  });

  it('401 no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('403 non-requester', async () => {
    mockCancelAccessRequest.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('200 requester self-cancels', async () => {
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.request).toBeDefined();
    expect(data.request.id).toBe('req-1');
    expect(data.request.status).toBe('cancelled');
    expect(mockCancelAccessRequest).toHaveBeenCalledWith('req-1', 'user-1');
  });

  it('404 unknown requestId', async () => {
    mockCancelAccessRequest.mockRejectedValue(new Error('REQUEST_NOT_FOUND'));
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('409 invalid state', async () => {
    mockCancelAccessRequest.mockRejectedValue(new Error('INVALID_STATE'));
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_STATE');
  });

  it('500 on unexpected error', async () => {
    mockCancelAccessRequest.mockRejectedValue(new Error('UNEXPECTED_DB_ERROR'));
    const res = await cancelDelete(makeRequestIdRequest('DELETE'), {
      params: Promise.resolve({ id: 'proj-1', requestId: 'req-1' }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
