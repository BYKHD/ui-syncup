'use client';

import { type ReactNode } from 'react';
import { ProjectTitleSection } from './project-title-section';
import { ProjectStats } from './project-stats';
import { ProjectActions } from './project-actions';

interface ProjectStats {
  memberCount: number;
  totalTickets: number;
  completedTickets: number;
  progressPercent: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'public';
  stats: ProjectStats;
}

interface ProjectDetailHeaderRefactoredProps {
  project: Project;
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null;
  onMembershipChanged?: () => void;
  onProjectUpdated?: () => void;
  onLeftProject?: () => void;
  onProjectDeleted?: () => void;
  // Render props for dialogs (allows parent to control state)
  renderIssueDialog: (trigger: ReactNode) => ReactNode;
  renderMemberDialog?: (props: { trigger: ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
  renderSettingsDialog?: (props: { trigger: ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
  renderLeaveDialog?: (props: { trigger: ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
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
  onProjectDeleted,
  renderIssueDialog,
  renderMemberDialog,
  renderSettingsDialog,
  renderLeaveDialog,
}: ProjectDetailHeaderRefactoredProps) {
  // Permission calculations
  const canManageMembers = userRole === 'owner' || userRole === 'editor';
  const canEditSettings = userRole === 'owner' || userRole === 'editor';
  const canLeaveProject = userRole !== null && userRole !== 'owner';
  const canDeleteProject = userRole === 'owner';

  return (
    <div className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left section: Title, visibility, role, description, stats */}
          <div className="space-y-4 flex-1">
            <ProjectTitleSection
              name={project.name}
              description={project.description}
              visibility={project.visibility}
              userRole={userRole}
            />

            <ProjectStats stats={project.stats} />
          </div>

          {/* Right section: Action buttons */}
          <ProjectActions
            projectId={project.id}
            projectName={project.name}
            userRole={userRole}
            canManageMembers={canManageMembers}
            canEditSettings={canEditSettings}
            canLeaveProject={canLeaveProject}
            canDeleteProject={canDeleteProject}
            onMembershipChanged={onMembershipChanged}
            onProjectUpdated={onProjectUpdated}
            onLeftProject={onLeftProject}
            onProjectDeleted={onProjectDeleted}
            renderIssueDialog={renderIssueDialog}
            renderMemberDialog={renderMemberDialog}
            renderSettingsDialog={renderSettingsDialog}
            renderLeaveDialog={renderLeaveDialog}
          />
        </div>
      </div>
    </div>
  );
}
