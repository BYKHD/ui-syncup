"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiAddLine,
  RiTeamLine,
  RiSettingsLine,
  RiLogoutBoxLine,
  RiDeleteBinLine,
  RiMore2Line,
  RiLoader4Line,
  RiUserAddLine,
  RiArchiveLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { PermissionTooltip } from "@/components/shared/permission-guard/permission-tooltip";
import { useJoinProject } from "../hooks/use-join-project";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  userRole: "owner" | "editor" | "member" | "viewer" | null;
  isArchived?: boolean;
  canJoinProject?: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canLeaveProject: boolean;
  canDeleteProject: boolean;
  canArchiveProject?: boolean;
  canUnarchiveProject?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onMembershipChanged?: () => void;
  onProjectUpdated?: () => void;
  onLeftProject?: () => void;
  onProjectDeleted?: () => void;
  // Render props for dialogs that need external state
  renderIssueDialog: (trigger: React.ReactNode) => React.ReactNode;
  renderMemberDialog?: (props: {
    trigger: React.ReactNode | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => React.ReactNode;
  renderSettingsDialog?: (props: {
    trigger: React.ReactNode | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => React.ReactNode;
  renderLeaveDialog?: (props: {
    trigger: React.ReactNode | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => React.ReactNode;
  // Optional controlled open state for member dialog (used when opened from notification URL)
  memberDialogOpen?: boolean;
  onMemberDialogOpenChange?: (open: boolean) => void;
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
  userRole,
  isArchived = false,
  canJoinProject = false,
  canViewMembers,
  canManageMembers: _canManageMembers,
  canEditSettings,
  canLeaveProject,
  canDeleteProject,
  canArchiveProject = false,
  canUnarchiveProject = false,
  onArchive,
  onUnarchive,
  onMembershipChanged,
  onProjectDeleted,
  renderIssueDialog,
  renderMemberDialog,
  renderSettingsDialog,
  renderLeaveDialog,
  memberDialogOpen: controlledMemberOpen,
  onMemberDialogOpenChange,
}: ProjectActionsProps) {
  // Dialog states
  const [internalMemberDialogOpen, setInternalMemberDialogOpen] =
    useState(false);
  const isControlled = controlledMemberOpen !== undefined;
  const showMemberDialog = isControlled
    ? controlledMemberOpen
    : internalMemberDialogOpen;
  const setShowMemberDialog = (open: boolean) => {
    if (isControlled) {
      onMemberDialogOpenChange?.(open);
    } else {
      setInternalMemberDialogOpen(open);
    }
  };
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutate: joinProject, isPending: isJoining } = useJoinProject({
    onSuccess: onMembershipChanged,
  });

  const hasSecondaryActions =
    canViewMembers ||
    canEditSettings ||
    canArchiveProject ||
    canUnarchiveProject ||
    canLeaveProject ||
    canDeleteProject;

  const canCreateIssue =
    !isArchived && (userRole === "owner" || userRole === "editor");

  const handleJoinProject = () => {
    joinProject(projectId);
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== projectName) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete project");
      }

      toast.success("Project deleted", {
        description: `"${projectName}" has been permanently deleted.`,
      });

      setShowDeleteDialog(false);
      setDeleteConfirmName("");
      onProjectDeleted?.();
    } catch (error) {
      toast.error("Failed to delete project", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!isDeleting) {
      setShowDeleteDialog(open);
      if (!open) {
        setDeleteConfirmName("");
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Primary Action — public project non-members can join from details */}
        {canJoinProject ? (
          <Button
            variant={"secondary"}
            onClick={handleJoinProject}
            disabled={isJoining}
          >
            {isJoining ? (
              <RiLoader4Line className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiUserAddLine className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isJoining ? "Joining..." : "Join Project"}
          </Button>
        ) : canCreateIssue ? (
          renderIssueDialog(
            <Button>
              <RiAddLine className="mr-1.5 h-3.5 w-3.5" />
              Add Issue
            </Button>,
          )
        ) : !isArchived ? (
          <PermissionTooltip
            tooltipContent="You don't have permission to create issues"
            asChild
          >
            <Button disabled className="opacity-60 cursor-not-allowed">
              <RiAddLine className="mr-1.5 h-3.5 w-3.5" />
              Add Issue
            </Button>
          </PermissionTooltip>
        ) : null}

        {/* Secondary Actions Menu */}
        {hasSecondaryActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <RiMore2Line className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canViewMembers && (
                <DropdownMenuItem onClick={() => setShowMemberDialog(true)}>
                  <RiTeamLine className="h-4 w-4" />
                  Members
                </DropdownMenuItem>
              )}

              {canEditSettings && !isArchived && (
                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                  <RiSettingsLine className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}

              {canArchiveProject && (
                <DropdownMenuItem onClick={onArchive}>
                  <RiArchiveLine className="h-4 w-4" />
                  Archive Project
                </DropdownMenuItem>
              )}

              {(canViewMembers || (canEditSettings && !isArchived) || canArchiveProject) &&
                (canUnarchiveProject || (canLeaveProject && !isArchived) || canDeleteProject) && (
                  <DropdownMenuSeparator />
                )}

              {canLeaveProject && !isArchived && (
                <DropdownMenuItem onClick={() => setShowLeaveDialog(true)}>
                  <RiLogoutBoxLine className="h-4 w-4" />
                  Leave Project
                </DropdownMenuItem>
              )}

              {canUnarchiveProject && (
                <DropdownMenuItem onClick={onUnarchive}>
                  <RiInboxUnarchiveLine className="h-4 w-4" />
                  Unarchive Project
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
      {renderMemberDialog &&
        renderMemberDialog({
          trigger: null,
          open: showMemberDialog,
          onOpenChange: setShowMemberDialog,
        })}

      {/* Settings Dialog - controlled by internal state */}
      {renderSettingsDialog &&
        renderSettingsDialog({
          trigger: null,
          open: showSettingsDialog,
          onOpenChange: setShowSettingsDialog,
        })}

      {/* Leave Dialog - controlled by internal state */}
      {renderLeaveDialog &&
        renderLeaveDialog({
          trigger: null,
          open: showLeaveDialog,
          onOpenChange: setShowLeaveDialog,
        })}

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogChange}
      >
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
                This action cannot be undone. This will permanently delete{" "}
                <strong>{projectName}</strong> and all its issues, comments, and
                attachments.
              </p>
              <div className="space-y-2 pt-2">
                <Label
                  htmlFor="confirm-project-name"
                  className="text-foreground"
                >
                  Type{" "}
                  <span className="font-mono font-semibold">{projectName}</span>{" "}
                  to confirm
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
              variant="destructive"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete Project"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
