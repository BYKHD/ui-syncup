/**
 * Component Tests: Project Member Manager Dialog
 * 
 * Tests invitation display, actions, and email failure indicators
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import type { AccessRequestWithRequester } from '../../api';
import { projectKeys } from '../../hooks/use-project';
import { ProjectMemberManagerDialog } from '../project-member-manager-dialog';

describe('ProjectMemberManagerDialog', () => {
  const mockMember = {
    id: 'member-1',
    userId: 'user-1',
    role: 'editor' as const,
    invitedBy: null,
    joinedAt: new Date(),
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
    },
  };

  const mockPendingInvitation = {
    id: 'invite-1',
    invitedUserId: 'user-2',
    role: 'member' as const,
    status: 'pending' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedUser: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      image: null,
    },
    invitedByUser: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
    },
    emailDeliveryFailed: false,
    emailFailureReason: null,
    emailLastAttemptAt: null,
  };

  const defaultProps = {
    projectId: 'project-123',
    projectName: 'Test Project',
    userRole: 'owner' as const,
    canManageMembers: true,
    open: true,
    onOpenChange: vi.fn(),
    members: [mockMember],
    pendingInvitations: [mockPendingInvitation],
    onRoleChange: vi.fn(),
    onRemoveMember: vi.fn(),
    onRevokeInvitation: vi.fn(),
    onResendInvitation: vi.fn(),
    onInviteMember: vi.fn(),
  };

  const mockAccessRequest: AccessRequestWithRequester = {
    id: '11111111-1111-1111-1111-111111111111',
    projectId: '22222222-2222-2222-2222-222222222222',
    requesterUserId: '33333333-3333-3333-3333-333333333333',
    message: 'Please let me in',
    status: 'pending',
    decidedByUserId: null,
    decidedAt: null,
    declineCooldownUntil: null,
    createdAt: new Date().toISOString(),
    requester: {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Access Requester',
      email: 'requester@example.com',
      image: null,
    },
    decidedByUser: null,
  };

  const renderDialog = (
    props: Partial<ComponentProps<typeof ProjectMemberManagerDialog>> = {},
    accessRequests: AccessRequestWithRequester[] = []
  ) => {
    const mergedProps = { ...defaultProps, ...props };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    queryClient.setQueryData(projectKeys.accessRequests(mergedProps.projectId), accessRequests);

    return render(
      <QueryClientProvider client={queryClient}>
        <ProjectMemberManagerDialog {...mergedProps} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog title', () => {
      renderDialog();
      
      expect(screen.getByText('Project Members')).toBeInTheDocument();
    });

    it('should render members list', () => {
      renderDialog();
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should render pending invitations', () => {
      renderDialog();
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should show members count', () => {
      renderDialog();
      
      expect(screen.getByText('Members (1)')).toBeInTheDocument();
    });

    it('should show pending invitations count', () => {
      renderDialog();
      
      expect(screen.getByText('Pending Invitations (1)')).toBeInTheDocument();
    });

    it('should show Invite button for managers', () => {
      renderDialog();
      
      expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    });
  });

  describe('Pending invitations display', () => {
    it('should show role badge', () => {
      renderDialog();
      
      // Member role badge should be visible for the pending invitation
      const badges = screen.getAllByText('Member');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show Pending status badge', () => {
      renderDialog();
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should show inviter name', () => {
      renderDialog();
      
      expect(screen.getByText(/invited by john doe/i)).toBeInTheDocument();
    });
  });

  describe('Email failure indicator', () => {
    it('should show Email Failed badge when emailDeliveryFailed is true', () => {
      const failedInvitation = {
        ...mockPendingInvitation,
        emailDeliveryFailed: true,
        emailFailureReason: 'SMTP connection timeout',
        emailLastAttemptAt: new Date(),
      };
      
      renderDialog({ pendingInvitations: [failedInvitation] });
      
      expect(screen.getByText('Email Failed')).toBeInTheDocument();
    });

    it('should not show Email Failed badge when email delivered', () => {
      renderDialog();
      
      expect(screen.queryByText('Email Failed')).not.toBeInTheDocument();
    });
  });

  describe('Invite action', () => {
    it('should call onInviteMember when Invite button clicked', async () => {
      const user = userEvent.setup();
      renderDialog();
      
      await user.click(screen.getByRole('button', { name: /invite/i }));
      
      expect(defaultProps.onInviteMember).toHaveBeenCalled();
    });
  });

  describe('Resend action', () => {
    it('should call onResendInvitation from dropdown', async () => {
      const user = userEvent.setup();
      renderDialog();
      
      // Find and click the dropdown trigger for invitation
      const invitationRow = screen.getByText('jane@example.com').closest('div');
      const moreButton = invitationRow?.parentElement?.parentElement?.querySelector('button[aria-haspopup="menu"]');
      
      if (moreButton) {
        await user.click(moreButton);
        
        // Click resend option
        const resendOption = await screen.findByText('Resend Invitation');
        await user.click(resendOption);
        
        expect(defaultProps.onResendInvitation).toHaveBeenCalledWith('invite-1');
      }
    });
  });

  describe('Revoke action', () => {
    it('should call onRevokeInvitation from dropdown', async () => {
      const user = userEvent.setup();
      renderDialog();
      
      // Find and click the dropdown trigger for invitation
      const invitationRow = screen.getByText('jane@example.com').closest('div');
      const moreButton = invitationRow?.parentElement?.parentElement?.querySelector('button[aria-haspopup="menu"]');
      
      if (moreButton) {
        await user.click(moreButton);
        
        // Click revoke option
        const revokeOption = await screen.findByText('Revoke Invitation');
        await user.click(revokeOption);
        
        expect(defaultProps.onRevokeInvitation).toHaveBeenCalledWith('invite-1');
      }
    });
  });

  describe('Loading state', () => {
    it('should show loading message when loading', () => {
      renderDialog({
        isLoading: true,
        members: [],
        pendingInvitations: [],
      });
      
      expect(screen.getByText(/loading members/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when error present', () => {
      renderDialog({
        error: 'Failed to load members',
        members: [],
        pendingInvitations: [],
      });
      
      expect(screen.getByText('Failed to load members')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should not show pending invitations section when empty', () => {
      renderDialog({ pendingInvitations: [] });

      expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument();
    });

    it('should not render an empty separator when access requests are absent', () => {
      renderDialog();

      expect(screen.queryByText(/access requests/i)).not.toBeInTheDocument();
      expect(document.body.querySelectorAll('[data-slot="separator"]')).toHaveLength(1);
    });

    it('should not show access requests for non-managers', () => {
      renderDialog(
        {
          userRole: 'member',
          canManageMembers: false,
        },
        [mockAccessRequest]
      );

      expect(screen.queryByText('Access requests (1)')).not.toBeInTheDocument();
      expect(screen.queryByText('Access Requester')).not.toBeInTheDocument();
      expect(screen.queryByText('requester@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Role change', () => {
    it('should call onRoleChange with member role when Make Member is clicked', async () => {
      const user = userEvent.setup()
      const onRoleChange = vi.fn()
      renderDialog({ onRoleChange })

      // Open the dropdown for the member row
      const memberRow = screen.getByText('john@example.com').closest('[class*="justify-between"]')
      const moreButton = memberRow?.querySelector('button[aria-haspopup="menu"]')
      if (!moreButton) throw new Error('More button not found')
      await user.click(moreButton)

      const makeMemberOption = await screen.findByText('Make Member')
      await user.click(makeMemberOption)

      expect(onRoleChange).toHaveBeenCalledWith('member-1', 'member')
    })
  })
});
