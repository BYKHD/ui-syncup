/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';
import { usePathname } from 'next/navigation';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock Sidebar components to avoid complex rendering
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-provider">{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-inset">{children}</div>,
}));

vi.mock('@/components/shared/sidebar/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar">Sidebar</div>,
}));

vi.mock('@/components/shared/headers', () => ({
  AppHeader: () => <div data-testid="app-header">Header</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePathname as Mock).mockReturnValue('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders children directly when variant is "blank"', () => {
    render(
      <AppShell variant="blank">
        <div data-testid="child">Child Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-provider')).not.toBeInTheDocument();
  });

  it('renders SidebarLayout when variant is "sidebar"', () => {
    render(
      <AppShell variant="sidebar">
        <div data-testid="child">Child Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('forces "blank" variant when pathname starts with /onboarding', () => {
    (usePathname as Mock).mockReturnValue('/onboarding');

    render(
      <AppShell variant="sidebar">
        <div data-testid="child">Child Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-provider')).not.toBeInTheDocument();
  });

  it('forces "blank" variant when pathname is sub-route of /onboarding', () => {
    (usePathname as Mock).mockReturnValue('/onboarding/step-2');

    render(
      <AppShell variant="sidebar">
        <div data-testid="child">Child Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-provider')).not.toBeInTheDocument();
  });
});
