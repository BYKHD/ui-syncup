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
    <div className="flex items-center gap-3">
      {/* Primary Action */}
      {renderIssueDialog(
        <Button size="sm" className="h-8 shadow-sm">
          <RiAddLine className="mr-1.5 h-3.5 w-3.5" />
          Add Issue
        </Button>
      )}

      {/* Secondary Actions Group */}
      <div className="flex items-center -space-x-px shadow-sm isolate">
        {canManageMembers && renderMemberDialog && renderMemberDialog(
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-r-none focus:z-10"
          >
            <RiTeamLine className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Members</span>
          </Button>
        )}

        {canEditSettings && renderSettingsDialog && renderSettingsDialog(
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-8 focus:z-10 ${
              canManageMembers ? 'rounded-l-none' : ''
            } ${canLeaveProject ? 'rounded-r-none' : ''}`}
          >
            <RiSettingsLine className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}

        {canLeaveProject && renderLeaveButton && renderLeaveButton(
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-8 focus:z-10 ${
              canManageMembers || canEditSettings ? 'rounded-l-none' : ''
            } hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30`}
          >
            <RiLogoutBoxLine className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        )}
      </div>
    </div>
  );
}
