import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  RiAddLine,
  RiTeamLine,
  RiSettingsLine,
  RiLogoutBoxLine,
} from '@remixicon/react';

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canLeaveProject: boolean;
  onMembershipChanged?: () => void;
  onProjectUpdated?: () => void;
  onLeftProject?: () => void;
  // Render prop pattern for dialog wrappers
  renderIssueDialog: (trigger: ReactNode) => ReactNode;
  renderMemberDialog?: (trigger: ReactNode) => ReactNode;
  renderSettingsDialog?: (trigger: ReactNode) => ReactNode;
  renderLeaveButton?: (trigger: ReactNode) => ReactNode;
}

/**
 * ProjectActions
 * Renders action buttons for project management (Add Issue, Members, Settings, Leave)
 * Uses render props to allow parent to wrap with dialog/modal logic
 */
export function ProjectActions({
  canManageMembers,
  canEditSettings,
  canLeaveProject,
  renderIssueDialog,
  renderMemberDialog,
  renderSettingsDialog,
  renderLeaveButton,
}: ProjectActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Add Issue Button */}
      {renderIssueDialog(
        <Button size="sm" className="flex-shrink-0">
          <RiAddLine className="h-4 w-4" />
          Add Issue
        </Button>
      )}

      {/* Members Button */}
      {canManageMembers && renderMemberDialog && renderMemberDialog(
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <RiTeamLine className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
        </Button>
      )}

      {/* Settings Button */}
      {canEditSettings && renderSettingsDialog && renderSettingsDialog(
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <RiSettingsLine className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      )}

      {/* Leave Button */}
      {canLeaveProject && renderLeaveButton && renderLeaveButton(
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <RiLogoutBoxLine className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      )}
    </div>
  );
}
