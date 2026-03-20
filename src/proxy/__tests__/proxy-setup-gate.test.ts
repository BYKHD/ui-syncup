import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSetupStatus = vi.fn();
vi.mock('@/lib/setup-status', () => ({ getSetupStatus: mockGetSetupStatus }));

// Import after mocks
const { proxy } = await import('../../proxy');

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(`http://localhost${pathname}`);
  Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}

describe('proxy() — setup gate (R1–R4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('R1: skips status API when setup-complete cookie is present', async () => {
    const res = await proxy(makeRequest('/dashboard', { 'setup-complete': '1' }));
    expect(mockGetSetupStatus).not.toHaveBeenCalled();
    expect(res.status).not.toBe(302);
  });

  it('R2: redirects to /setup when cookie absent and setup not complete', async () => {
    mockGetSetupStatus.mockResolvedValueOnce({ isSetupComplete: false });
    const res = await proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/setup');
  });

  it('R3: stamps setup-complete cookie when cold-path confirms setup done', async () => {
    mockGetSetupStatus.mockResolvedValueOnce({ isSetupComplete: true });
    const res = await proxy(makeRequest('/dashboard'));
    expect(res.headers.get('set-cookie')).toContain('setup-complete=1');
  });

  it('R4: redirects /setup to /sign-in when setup-complete cookie present', async () => {
    const res = await proxy(makeRequest('/setup', { 'setup-complete': '1' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/sign-in');
  });
});
