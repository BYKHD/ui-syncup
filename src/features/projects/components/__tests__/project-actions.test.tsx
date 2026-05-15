/**
 * Component Tests: ProjectActions
 *
 * Tests permission gating on the Add Issue button for different user roles.
 * Only owner/editor can create issues per RBAC (issue:create permission).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectActions } from '../project-actions';
import userEvent from '@testing-library/user-event';

const mockJoinProject = vi.fn();

vi.mock('../../hooks/use-join-project', () => ({
  useJoinProject: () => ({
    mutate: mockJoinProject,
    isPending: false,
  }),
}));

const baseProps = {
  projectId: 'proj-1',
  projectName: 'Test Project',
  canViewMembers: false,
  canManageMembers: false,
  canEditSettings: false,
  canLeaveProject: false,
  canDeleteProject: false,
  renderIssueDialog: (trigger: React.ReactNode) => trigger,
};

describe('ProjectActions — Add Issue button', () => {
  it.each(['owner', 'editor'] as const)(
    'renders a functional Add Issue button for %s role',
    (role) => {
      render(<ProjectActions {...baseProps} userRole={role} />);
      const btn = screen.getByRole('button', { name: /add issue/i });
      expect(btn).not.toBeDisabled();
      expect(btn).not.toHaveAttribute('data-slot', 'tooltip-trigger');
    }
  );

  it.each(['member', 'viewer', null] as const)(
    'renders a disabled Add Issue button for %s role',
    (role) => {
      render(<ProjectActions {...baseProps} userRole={role} />);
      const btn = screen.getByRole('button', { name: /add issue/i });
      expect(btn).toBeDisabled();
    }
  );

  it.each(['member', 'viewer', null] as const)(
    'wraps the disabled button in a tooltip trigger for %s role',
    (role) => {
      render(<ProjectActions {...baseProps} userRole={role} />);
      const btn = screen.getByRole('button', { name: /add issue/i });
      expect(btn).toHaveAttribute('data-slot', 'tooltip-trigger');
    }
  );

  it.each(['member', 'viewer', null] as const)(
    'does not call renderIssueDialog for %s role',
    (role) => {
      const mockRender = vi.fn((t: React.ReactNode) => t);
      render(
        <ProjectActions {...baseProps} userRole={role} renderIssueDialog={mockRender} />
      );
      expect(mockRender).not.toHaveBeenCalled();
    }
  );
});

describe('ProjectActions — Join Project button', () => {
  it('renders Join Project for a public project non-member', () => {
    render(<ProjectActions {...baseProps} userRole={null} canJoinProject />);

    expect(screen.getByRole('button', { name: /join project/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add issue/i })).not.toBeInTheDocument();
  });

  it('joins the project when a public project non-member clicks Join Project', async () => {
    render(<ProjectActions {...baseProps} userRole={null} canJoinProject />);

    await userEvent.click(screen.getByRole('button', { name: /join project/i }));

    expect(mockJoinProject).toHaveBeenCalledWith('proj-1');
  });

  it('does not render Join Project when joining is not allowed', () => {
    render(<ProjectActions {...baseProps} userRole={null} canJoinProject={false} />);

    expect(screen.queryByRole('button', { name: /join project/i })).not.toBeInTheDocument();
  });
});

describe('ProjectActions — controlled member dialog', () => {
  it('calls renderMemberDialog with open=true when memberDialogOpen prop is true', () => {
    const renderMember = vi.fn(({ trigger }: { trigger: React.ReactNode; open: boolean; onOpenChange: (v: boolean) => void }) => trigger);

    render(
      <ProjectActions
        {...baseProps}
        userRole="owner"
        canViewMembers
        memberDialogOpen={true}
        onMemberDialogOpenChange={vi.fn()}
        renderMemberDialog={renderMember}
      />
    );

    expect(renderMember).toHaveBeenCalledWith(
      expect.objectContaining({ open: true })
    );
  });

  it('calls onMemberDialogOpenChange when member dialog is closed', async () => {
    const onOpenChange = vi.fn();
    // Render dialog open and confirm onOpenChange is wired
    const renderMember = vi.fn(({ onOpenChange: change }: { trigger: React.ReactNode; open: boolean; onOpenChange: (v: boolean) => void }) => {
      return <button onClick={() => change(false)}>close</button>;
    });

    render(
      <ProjectActions
        {...baseProps}
        userRole="owner"
        canViewMembers
        memberDialogOpen={true}
        onMemberDialogOpenChange={onOpenChange}
        renderMemberDialog={renderMember}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
