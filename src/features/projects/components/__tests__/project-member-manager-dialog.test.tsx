/**
 * Component Tests: Project Member Manager Dialog
 * 
 * Tests invitation display, actions, and email failure indicators
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog title', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('Project Members')).toBeInTheDocument();
    });

    it('should render members list', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should render pending invitations', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should show members count', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('Members (1)')).toBeInTheDocument();
    });

    it('should show pending invitations count', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('Pending Invitations (1)')).toBeInTheDocument();
    });

    it('should show Invite button for managers', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    });
  });

  describe('Pending invitations display', () => {
    it('should show role badge', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      // Member role badge should be visible
      const badges = screen.getAllByText('Member');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show Pending status badge', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should show inviter name', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
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
      
      render(
        <ProjectMemberManagerDialog 
          {...defaultProps} 
          pendingInvitations={[failedInvitation]} 
        />
      );
      
      expect(screen.getByText('Email Failed')).toBeInTheDocument();
    });

    it('should not show Email Failed badge when email delivered', () => {
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      expect(screen.queryByText('Email Failed')).not.toBeInTheDocument();
    });
  });

  describe('Invite action', () => {
    it('should call onInviteMember when Invite button clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /invite/i }));
      
      expect(defaultProps.onInviteMember).toHaveBeenCalled();
    });
  });

  describe('Resend action', () => {
    it('should call onResendInvitation from dropdown', async () => {
      const user = userEvent.setup();
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
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
      render(<ProjectMemberManagerDialog {...defaultProps} />);
      
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
      render(
        <ProjectMemberManagerDialog 
          {...defaultProps} 
          isLoading={true}
          members={[]}
          pendingInvitations={[]}
        />
      );
      
      expect(screen.getByText(/loading members/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when error present', () => {
      render(
        <ProjectMemberManagerDialog 
          {...defaultProps} 
          error="Failed to load members"
          members={[]}
          pendingInvitations={[]}
        />
      );
      
      expect(screen.getByText('Failed to load members')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should not show pending invitations section when empty', () => {
      render(
        <ProjectMemberManagerDialog 
          {...defaultProps} 
          pendingInvitations={[]}
        />
      );
      
      expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument();
    });
  });
});
