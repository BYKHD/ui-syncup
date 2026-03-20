import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
const mockIsSetupComplete = vi.fn();

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/server/setup', () => ({ isSetupComplete: mockIsSetupComplete }));
vi.mock('@/features/setup/screens/setup-screen', () => ({
  SetupScreen: () => null,
}));

// Import after mocks
const { default: SetupPage } = await import('../page');

describe('SetupPage (server component)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /sign-in when setup is already complete', async () => {
    mockIsSetupComplete.mockResolvedValueOnce(true);
    await SetupPage();
    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });

  it('renders SetupScreen when setup is not complete', async () => {
    mockIsSetupComplete.mockResolvedValueOnce(false);
    const result = await SetupPage();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});
