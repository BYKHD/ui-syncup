/**
 * Component Tests: ProjectActions
 *
 * Tests permission gating on the Add Issue button for different user roles.
 * Only owner/editor can create issues per RBAC (issue:create permission).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectActions } from '../project-actions';

const baseProps = {
  projectId: 'proj-1',
  projectName: 'Test Project',
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
