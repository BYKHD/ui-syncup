import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockIsSetupComplete = vi.fn();
const mockGetInstanceStatus = vi.fn();
const mockCreateSampleProject = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/setup', () => ({
  isSetupComplete: mockIsSetupComplete,
  getInstanceStatus: mockGetInstanceStatus,
}));
vi.mock('@/server/setup/sample-data-service', () => ({
  createSampleProject: mockCreateSampleProject,
}));
vi.mock('@/lib/db', () => ({
  db: {
    query: { instanceSettings: { findFirst: vi.fn(() => ({ id: 'settings-1' })) } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));
vi.mock('@/server/db/schema', () => ({ instanceSettings: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

const { POST } = await import('../route');

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/setup/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/setup/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsSetupComplete.mockResolvedValue(false);
    mockGetInstanceStatus.mockResolvedValue({ adminEmail: 'admin@test.com' });
  });

  it('returns redirectUrl: /projects in response body', async () => {
    const res = await POST(makeRequest({ workspaceId: '00000000-0000-0000-0000-000000000001', createSampleData: false }));
    const data = await res.json();
    expect(data.redirectUrl).toBe('/projects');
  });

  it('sets setup-complete cookie on the response', async () => {
    const res = await POST(makeRequest({ workspaceId: '00000000-0000-0000-0000-000000000001', createSampleData: false }));
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('setup-complete=1');
  });

  it('returns 200 on success', async () => {
    const res = await POST(makeRequest({ workspaceId: '00000000-0000-0000-0000-000000000001', createSampleData: false }));
    expect(res.status).toBe(200);
  });
});
