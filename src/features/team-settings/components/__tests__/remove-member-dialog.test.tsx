import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveMemberDialog } from '../remove-member-dialog';

// Radix UI Select requires pointer capture APIs not available in JSDOM
beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

vi.mock('@/features/teams/hooks', () => ({
  useOwnedProjects: vi.fn(),
  useRemoveMember: vi.fn(),
}));

import { useOwnedProjects, useRemoveMember } from '@/features/teams/hooks';

const mockMember = {
  id: 'member-1',
  userId: 'user-1',
  managementRole: null,
  operationalRole: 'TEAM_EDITOR' as const,
  joinedAt: new Date().toISOString(),
  invitedBy: null,
  teamId: 'team-1',
  user: { id: 'user-1', name: 'Alex Smith', email: 'alex@example.com', image: null },
};

const mockRemoveMutate = vi.fn();

beforeEach(() => {
  vi.mocked(useRemoveMember).mockReturnValue({
    mutate: mockRemoveMutate,
    isPending: false,
  } as any);
});

describe('RemoveMemberDialog — no owned projects', () => {
  beforeEach(() => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: { ownedProjects: [], eligibleOwners: [] },
      isLoading: false,
    } as any);
  });

  it('shows simple confirmation dialog', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/remove team member/i)).toBeInTheDocument();
    expect(screen.getByText(/alex smith/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeEnabled();
  });

  it('calls removeMember without transfers on confirm', async () => {
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(mockRemoveMutate).toHaveBeenCalledWith(
      { teamId: 'team-1', userId: 'user-1', ownershipTransfers: [] },
      expect.any(Object)
    );
  });
});

describe('RemoveMemberDialog — has owned projects', () => {
  const ownedProjects = [{ id: 'proj-1', name: 'Dashboard', key: 'DASH' }];
  const eligibleOwners = [{ userId: 'user-2', name: 'Bob Jones', email: 'bob@example.com', image: null }];

  beforeEach(() => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: { ownedProjects, eligibleOwners },
      isLoading: false,
    } as any);
  });

  it('shows ownership transfer UI listing owned projects', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/owns 1 project/i)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('disables Remove Member button until all projects have a new owner', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /remove member/i })).toBeDisabled();
  });

  it('enables Remove Member after all projects assigned and calls mutate with transfers', async () => {
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Bob Jones'));

    const removeBtn = screen.getByRole('button', { name: /remove member/i });
    expect(removeBtn).toBeEnabled();

    await user.click(removeBtn);
    expect(mockRemoveMutate).toHaveBeenCalledWith(
      {
        teamId: 'team-1',
        userId: 'user-1',
        ownershipTransfers: [{ projectId: 'proj-1', newOwnerId: 'user-2' }],
      },
      expect.any(Object)
    );
  });

  it('shows loading skeleton while fetching projects', () => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/checking project ownership/i)).toBeInTheDocument();
  });
});
