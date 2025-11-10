'use client';

import { type ReactNode } from 'react';
import { ProjectTitleSection } from './project-title-section';
import { ProjectStats } from './project-stats';
import { ProjectActions } from './project-actions';

interface Project {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'public';
  memberCount: number;
  tickets: number;
  ticketsDone: number;
  progressPercent: number;
}

interface ProjectDetailHeaderRefactoredProps {
  project: Project;
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null;
  onMembershipChanged?: () => void;
  onProjectUpdated?: () => void;
  onLeftProject?: () => void;
  // Render props for dialogs (allows parent to control state)
  renderIssueDialog: (trigger: ReactNode) => ReactNode;
  renderMemberDialog?: (trigger: ReactNode) => ReactNode;
  renderSettingsDialog?: (trigger: ReactNode) => ReactNode;
  renderLeaveButton?: (trigger: ReactNode) => ReactNode;
}

/**
 * ProjectDetailHeaderRefactored
 * Refactored version demonstrating composition of smaller components
 *
 * Key improvements:
 * - Separated concerns: title/metadata, stats, and actions are distinct components
 * - Render props pattern for dialog wrappers (keeps state management in parent)
 * - Pure presentational logic - all business logic via props
 * - Responsive design with proper mobile/desktop layouts
 */
export function ProjectDetailHeader({
  project,
  userRole,
  onMembershipChanged,
  onProjectUpdated,
  onLeftProject,
  renderIssueDialog,
  renderMemberDialog,
  renderSettingsDialog,
  renderLeaveButton,
}: ProjectDetailHeaderRefactoredProps) {
  // Permission calculations
  const canManageMembers = userRole === 'owner' || userRole === 'editor';
  const canEditSettings = userRole === 'owner' || userRole === 'editor';
  const canLeaveProject = userRole !== null && userRole !== 'owner';

  return (
    <div className="border-b p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left section: Title, visibility, role, description, stats */}
        <div className="space-y-3 flex-1">
          <ProjectTitleSection
            name={project.name}
            description={project.description}
            visibility={project.visibility}
            userRole={userRole}
          />

          <ProjectStats
            memberCount={project.memberCount}
            tickets={project.tickets}
            ticketsDone={project.ticketsDone}
            progressPercent={project.progressPercent}
          />
        </div>

        {/* Right section: Action buttons */}
        <ProjectActions
          projectId={project.id}
          projectName={project.name}
          userRole={userRole}
          canManageMembers={canManageMembers}
          canEditSettings={canEditSettings}
          canLeaveProject={canLeaveProject}
          onMembershipChanged={onMembershipChanged}
          onProjectUpdated={onProjectUpdated}
          onLeftProject={onLeftProject}
          renderIssueDialog={renderIssueDialog}
          renderMemberDialog={renderMemberDialog}
          renderSettingsDialog={renderSettingsDialog}
          renderLeaveButton={renderLeaveButton}
        />
      </div>
    </div>
  );
}
