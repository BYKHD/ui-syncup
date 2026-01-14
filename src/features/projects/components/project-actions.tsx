'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RiAddLine,
  RiTeamLine,
  RiSettingsLine,
  RiLogoutBoxLine,
  RiDeleteBinLine,
  RiMore2Line,
  RiLoader4Line,
} from '@remixicon/react';
import { toast } from 'sonner';

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canLeaveProject: boolean;
  canDeleteProject: boolean;
  onMembershipChanged?: () => void;
  onProjectUpdated?: () => void;
  onLeftProject?: () => void;
  onProjectDeleted?: () => void;
  // Render props for dialogs that need external state
  renderIssueDialog: (trigger: React.ReactNode) => React.ReactNode;
  renderMemberDialog?: (props: { trigger: React.ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode;
  renderSettingsDialog?: (props: { trigger: React.ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode;
  renderLeaveDialog?: (props: { trigger: React.ReactNode | null; open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode;
}

/**
 * ProjectActions
 * Renders action buttons for project management with a simplified dropdown menu pattern
 * 
 * Features:
 * - Primary "Add Issue" button
 * - Secondary actions in a dropdown menu (Members, Settings, Leave, Delete)
 * - Delete confirmation with project name input for safety
 */
export function ProjectActions({
  projectId,
  projectName,
  canManageMembers,
  canEditSettings,
  canLeaveProject,
  canDeleteProject,
  onProjectDeleted,
  renderIssueDialog,
  renderMemberDialog,
  renderSettingsDialog,
  renderLeaveDialog,
}: ProjectActionsProps) {
  // Dialog states
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const hasSecondaryActions = canManageMembers || canEditSettings || canLeaveProject || canDeleteProject;

  const handleDelete = async () => {
    if (deleteConfirmName !== projectName) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete project');
      }

      toast.success('Project deleted', {
        description: `"${projectName}" has been permanently deleted.`,
      });

      setShowDeleteDialog(false);
      setDeleteConfirmName('');
      onProjectDeleted?.();
    } catch (error) {
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!isDeleting) {
      setShowDeleteDialog(open);
      if (!open) {
        setDeleteConfirmName('');
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Primary Action */}
        {renderIssueDialog(
          <Button size="sm" className="h-8 shadow-sm">
            <RiAddLine className="mr-1.5 h-3.5 w-3.5" />
            Add Issue
          </Button>
        )}

        {/* Secondary Actions Menu */}
        {hasSecondaryActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <RiMore2Line className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canManageMembers && (
                <DropdownMenuItem onClick={() => setShowMemberDialog(true)}>
                  <RiTeamLine className="h-4 w-4" />
                  Members
                </DropdownMenuItem>
              )}

              {canEditSettings && (
                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                  <RiSettingsLine className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}

              {(canManageMembers || canEditSettings) && (canLeaveProject || canDeleteProject) && (
                <DropdownMenuSeparator />
              )}

              {canLeaveProject && (
                <DropdownMenuItem onClick={() => setShowLeaveDialog(true)}>
                  <RiLogoutBoxLine className="h-4 w-4" />
                  Leave Project
                </DropdownMenuItem>
              )}

              {canDeleteProject && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Member Dialog - controlled by internal state */}
      {renderMemberDialog && renderMemberDialog({ trigger: null, open: showMemberDialog, onOpenChange: setShowMemberDialog })}

      {/* Settings Dialog - controlled by internal state */}
      {renderSettingsDialog && renderSettingsDialog({ trigger: null, open: showSettingsDialog, onOpenChange: setShowSettingsDialog })}

      {/* Leave Dialog - controlled by internal state */}
      {renderLeaveDialog && renderLeaveDialog({ trigger: null, open: showLeaveDialog, onOpenChange: setShowLeaveDialog })}

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-destructive/10 p-1.5">
                <RiDeleteBinLine className="h-4 w-4 text-destructive" />
              </div>
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete{' '}
                <strong>{projectName}</strong> and all its issues, comments, and attachments.
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-project-name" className="text-foreground">
                  Type <span className="font-mono font-semibold">{projectName}</span> to confirm
                </Label>
                <Input
                  id="confirm-project-name"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={projectName}
                  disabled={isDeleting}
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteConfirmName !== projectName || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
