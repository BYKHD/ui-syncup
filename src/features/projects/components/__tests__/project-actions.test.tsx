/**
 * Component Tests: ProjectActions
 *
 * Tests permission gating on the Add Issue button for different user roles.
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
  it('renders a functional Add Issue button for editor role', () => {
    render(<ProjectActions {...baseProps} userRole="editor" />);
    const btn = screen.getByRole('button', { name: /add issue/i });
    expect(btn).not.toBeDisabled();
  });

  it('renders a disabled Add Issue button for viewer role', () => {
    render(<ProjectActions {...baseProps} userRole="viewer" />);
    const btn = screen.getByRole('button', { name: /add issue/i });
    expect(btn).toBeDisabled();
  });

  it('wraps the disabled viewer button in a tooltip trigger', () => {
    render(<ProjectActions {...baseProps} userRole="viewer" />);
    const btn = screen.getByRole('button', { name: /add issue/i });
    // PermissionTooltip wraps the trigger with data-slot="tooltip-trigger"
    expect(btn).toHaveAttribute('data-slot', 'tooltip-trigger');
  });

  it('does not call renderIssueDialog for viewer role', () => {
    const mockRender = vi.fn((t: React.ReactNode) => t);
    render(
      <ProjectActions {...baseProps} userRole="viewer" renderIssueDialog={mockRender} />
    );
    expect(mockRender).not.toHaveBeenCalled();
  });
});
