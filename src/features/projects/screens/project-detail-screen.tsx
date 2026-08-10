"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { RiArchiveLine } from "@remixicon/react";
import { IssuesCreateDialog, type ImageData } from "@/features/issues/components/issues-create-dialog";
import { useCreateIssue, uploadAttachment, deleteIssue } from "@/features/issues";
import { toast } from "sonner";
import { ProjectMemberManagerDialog } from "../components/project-member-manager-dialog";
import { ProjectInvitationDialog } from "../components/project-invitation-dialog";
import { ProjectSettingsDialog } from "../components/project-settings-dialog";
import { ProjectLeaveButton } from "../components/project-leave-button";
import { ProjectDetailHeader, ProjectIssues } from "../components";
import type { ProjectRole } from "../types";
import type { IssuePriority, IssueType, IssueSummary } from "@/features/issues/types";
import { useRecentProjects, useProjectMembers, useUpdateMemberRole, useRemoveMember, useProjectInvitations, useRevokeInvitation, useResendInvitation, useUpdateProject, useLeaveProject } from "../hooks";

interface ProjectStats {
  memberCount: number;
  totalTickets: number;
  completedTickets: number;
  progressPercent: number;
}

interface ProjectDetailScreenProps {
  project: {
    id: string;
    teamId: string;
    name: string;
    description: string | null;
    visibility: "private" | "public";
    status: "active" | "archived";
    stats: ProjectStats;
    createdAt: string;
    updatedAt: string;
    slug: string;
    icon: string | null;
  };
  userRole: ProjectRole | null;
  isLoading?: boolean;
  /** Server-prefetched issues for instant display */
  initialIssues?: IssueSummary[];
}

type IssuePriorityValue = IssuePriority | null;
type IssueTypeValue = IssueType | null;

/**
 * ProjectDetailScreen
 *
 * Client screen component that manages dialog states and renders the project detail view.
 * Follows ready-to-wire pattern with TODO comments for API integration.
 */
export default function ProjectDetailScreen({
  project,
  userRole,
  isLoading = false,
  initialIssues,
}: ProjectDetailScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addRecentProject } = useRecentProjects();

  // Controlled open state for the member dialog — driven by ?open=members URL param
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  useEffect(() => {
    if (project) {
      addRecentProject({
        id: project.id,
        name: project.name,
        url: pathname,
        icon: project.icon,
      });

      // Update local form state when project data changes (e.g. after refresh)
      setSettingsFormData({
        name: project.name,
        description: project.description || "",
        visibility: project.visibility,
      });
    }
  }, [project, addRecentProject, pathname]);

  const _canManageMembers = userRole === "owner" || userRole === "editor";
  const { mutateAsync: createIssueMutation } = useCreateIssue();
  const { mutateAsync: updateProjectMutation } = useUpdateProject();
  // Issue dialog state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    title: "",
    page: "",
    figmaLink: "",
    description: "",
    type: null as IssueTypeValue,
    priority: null as IssuePriorityValue,
    asIsImage: null as ImageData | null,
    toBeImage: null as ImageData | null,
  });
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [asIsUploadProgress, setAsIsUploadProgress] = useState(0);
  const [toBeUploadProgress, setToBeUploadProgress] = useState(0);

  // Settings dialog state - note: dialog open/close is managed by project-actions.tsx
  // We only manage form state here
  const [settingsFormData, setSettingsFormData] = useState({
    name: project.name,
    description: project.description || "",
    visibility: project.visibility,
  });
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>(
    {}
  );
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<
    "private" | "public" | null
  >(null);

  const { mutate: leaveProjectMutation, isPending: isLeaving } = useLeaveProject({
    onSuccess: () => {
      router.push('/projects');
    },
  });

  // Member dialog state - dialog open/close is managed by project-actions.tsx
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);

  // Track if member dialog has been opened (for enabling hooks)
  const [memberDialogOpened, setMemberDialogOpened] = useState(false);

  // Real data hooks for members - enabled once dialog has been opened
  const {
    data: membersData,
    isLoading: isMembersLoading,
    error: membersQueryError,
    refetch: refetchMembers
  } = useProjectMembers({ projectId: project.id, enabled: memberDialogOpened });

  const { mutateAsync: updateRoleMutation } = useUpdateMemberRole();
  const { mutateAsync: removeMemberMutation } = useRemoveMember();

  // Real data hooks for invitations
  const {
    pendingInvitations: invitationsData,
    refetch: refetchInvitations
  } = useProjectInvitations({ projectId: project.id, enabled: memberDialogOpened });

  const { mutateAsync: revokeInvitationMutation } = useRevokeInvitation();
  const { mutateAsync: resendInvitationMutation } = useResendInvitation();

  // Auto-open member dialog and enable data hooks when ?open=members is in the URL
  useEffect(() => {
    if (searchParams.get('open') === 'members') {
      setMemberDialogOpen(true);
      setMemberDialogOpened(true);
      refetchMembers();
      refetchInvitations();
      const params = new URLSearchParams(searchParams.toString());
      params.delete('open');
      const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router, refetchMembers, refetchInvitations]);

  // Transform API members to dialog format
  const members = useMemo(() => {
    if (!membersData?.members) return [];
    return membersData.members.map((m) => ({
      id: m.userId, // Use userId as id for member operations
      userId: m.userId,
      role: m.role as 'owner' | 'editor' | 'member' | 'viewer',
      invitedBy: null,
      joinedAt: new Date(m.joinedAt),
      user: {
        id: m.userId,
        name: m.userName,
        email: m.userEmail,
        image: m.userAvatar,
      },
    }));
  }, [membersData]);

  const membersError = membersQueryError?.message || null;

  // Transform API invitations to dialog format
  const pendingInvitations = useMemo(() => {
    if (!invitationsData) return [];
    return invitationsData.map((inv) => ({
      id: inv.id,
      invitedUserId: inv.invitedUser?.id || '', // Get from invitedUser object if exists
      role: inv.role as 'editor' | 'member' | 'viewer',
      status: inv.status,
      createdAt: new Date(inv.createdAt),
      expiresAt: new Date(inv.expiresAt),
      // For external invites, invitedUser is null - create fallback from email
      invitedUser: inv.invitedUser || {
        id: '',
        name: inv.email.split('@')[0], // Use email username as fallback name
        email: inv.email,
        image: null,
      },
      invitedByUser: inv.invitedByUser || {
        id: '',
        name: 'Deleted User',
        email: '',
        image: null,
      },
      // Email delivery tracking fields
      emailDeliveryFailed: inv.emailDeliveryFailed ?? false,
      emailFailureReason: inv.emailFailureReason ?? null,
      emailLastAttemptAt: inv.emailLastAttemptAt ? new Date(inv.emailLastAttemptAt) : null,
    }));
  }, [invitationsData]);

  // Helper to clear specific field error
  const clearFieldError = (field: string) => {
    if (issueErrors[field]) {
      setIssueErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Issue dialog handlers
  const handleIssueSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIssueErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!issueFormData.title.trim()) {
      errors.title = "Title is required";
    }
    if (!issueFormData.type) {
      errors.type = "Type is required";
    }
    if (!issueFormData.priority) {
      errors.priority = "Priority is required";
    }
    if (!issueFormData.asIsImage && !issueFormData.toBeImage) {
      // At least one image? Or specific requirement? Keeping original checks:
      if (!issueFormData.asIsImage) errors.asIsImage = "As-is image is required";
      if (!issueFormData.toBeImage) errors.toBeImage = "To-be image is required";
    }
    if (issueFormData.figmaLink) {
      try {
        const url = new URL(issueFormData.figmaLink);
        if (!url.hostname.endsWith("figma.com")) {
          errors.figmaLink = "Must be a valid figma.com URL";
        }
      } catch {
        errors.figmaLink = "Must be a valid figma.com URL";
      }
    }

    if (Object.keys(errors).length > 0) {
      setIssueErrors(errors);
      return;
    }

    try {
      setIsSubmittingIssue(true);

      // 1. Create issue
      const { issue } = await createIssueMutation({
        projectId: project.id,
        title: issueFormData.title,
        page: issueFormData.page,
        figmaLink: issueFormData.figmaLink || undefined,
        description: issueFormData.description,
        type: issueFormData.type!,
        priority: issueFormData.priority!,
      });

      // 2. Upload attachments (non-blocking - don't let upload failures block redirect)
      const uploadPromises = [];

      if (issueFormData.asIsImage) {
        uploadPromises.push(
          uploadAttachment({
            issueId: issue.id,
            file: issueFormData.asIsImage.file,
            reviewVariant: 'as_is',
            width: issueFormData.asIsImage.width,
            height: issueFormData.asIsImage.height,
            annotations: issueFormData.asIsImage.annotations,
            onProgress: (progress) => setAsIsUploadProgress(progress),
          })
        );
      }

      if (issueFormData.toBeImage) {
        uploadPromises.push(
          uploadAttachment({
            issueId: issue.id,
            file: issueFormData.toBeImage.file,
            reviewVariant: 'to_be',
            width: issueFormData.toBeImage.width,
            height: issueFormData.toBeImage.height,
            onProgress: (progress) => setToBeUploadProgress(progress),
          })
        );
      }

      if (uploadPromises.length > 0) {
        try {
          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error("Failed to upload attachments:", uploadError);

          // The issue already exists by this point. Returning early would leave an
          // attachment-less orphan behind, and every retry would create another one.
          // So roll it back and let the retry be a clean create. Safe to do: every role
          // holding ISSUE_CREATE also holds ISSUE_DELETE (src/config/roles.ts), and the
          // DELETE cascades to whichever attachment did land before the failure — which
          // is also why the retry re-uploads both rather than tracking them per variant.
          let rolledBack = true;
          try {
            await deleteIssue({ issueId: issue.id });
          } catch (rollbackError) {
            rolledBack = false;
            console.error("Failed to roll back issue after upload failure:", rollbackError);
          }

          setIsSubmittingIssue(false);
          setAsIsUploadProgress(0);
          setToBeUploadProgress(0);

          // uploadAttachment is a plain async fn, not a mutation hook — nothing else
          // surfaces this failure, so without this the dialog just goes quiet.
          toast.error("Failed to upload images", {
            description: rolledBack
              ? "The issue was not created. Your work is still here — try again."
              : `Issue ${issue.issueKey} was created without its images. Please delete it and try again.`,
          });

          // Dialog stays open and formData is untouched so the user can retry.
          return;
        }
      }

      setIsSubmittingIssue(false);
      setAsIsUploadProgress(0);
      setToBeUploadProgress(0);
      setIssueDialogOpen(false);
      setIssueFormData({
        title: "",
        page: "",
        figmaLink: "",
        description: "",
        type: null,
        priority: null,
        asIsImage: null,
        toBeImage: null,
      });
    } catch (error) {
      console.error("Failed to create issue:", error);
      setIsSubmittingIssue(false);
      // Hook handles toast error
    }
  };

  const handleIssueCancel = () => {
    setIssueDialogOpen(false);
    setIssueFormData({
      title: "",
      page: "",
      figmaLink: "",
      description: "",
      type: null,
      priority: null,
      asIsImage: null,
      toBeImage: null,
    });
    setIssueErrors({});
  };

  // Settings dialog handlers
  const handleSettingsInputChange = (field: string, value: string) => {
    setSettingsFormData((prev) => ({ ...prev, [field]: value }));
    if (settingsErrors[field]) {
      setSettingsErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleVisibilityChange = (visibility: "private" | "public") => {
    if (visibility !== settingsFormData.visibility) {
      setPendingVisibility(visibility);
      setShowVisibilityConfirm(true);
    }
  };

  const handleConfirmVisibilityChange = () => {
    if (pendingVisibility) {
      setSettingsFormData((prev) => ({
        ...prev,
        visibility: pendingVisibility,
      }));
    }
    setShowVisibilityConfirm(false);
    setPendingVisibility(null);
  };

  const handleCancelVisibilityChange = () => {
    setShowVisibilityConfirm(false);
    setPendingVisibility(null);
  };

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSettingsErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!settingsFormData.name.trim()) {
      errors.name = "Project name is required";
    }

    if (Object.keys(errors).length > 0) {
      setSettingsErrors(errors);
      return false;
    }

    setIsSubmittingSettings(true);

    try {
      await updateProjectMutation({
        projectId: project.id,
        data: {
          name: settingsFormData.name,
          description: settingsFormData.description,
          visibility: settingsFormData.visibility,
        },
      });
      router.refresh();
      return true;
      // Success toast is handled by the hook
    } catch (error) {
      console.error("Failed to update project:", error);
      return false;
      // Error toast is handled by the hook
    } finally {
      setIsSubmittingSettings(false);
      // Note: Dialog close is handled by project-actions.tsx via onOpenChange
    }
  };

  const handleSettingsCancel = () => {
    // Note: Dialog close is handled by project-actions.tsx via onOpenChange
    // We just reset the form state here
    setSettingsFormData({
      name: project.name,
      description: project.description || "",
      visibility: project.visibility,
    });
    setSettingsErrors({});
  };

  const hasSettingsChanges =
    settingsFormData.name !== project.name ||
    settingsFormData.description !== (project.description || "") ||
    settingsFormData.visibility !== project.visibility;

  const handleLeave = () => {
    leaveProjectMutation(project.id);
  };

  const handleMembershipChanged = useCallback(() => {
    router.refresh();
  }, [router]);

  // Member dialog handlers
  const handleMemberDialogOpen = useCallback((open: boolean) => {
    if (open) {
      setMemberDialogOpened(true); // Enable hooks
      refetchMembers();
      refetchInvitations();
    }
  }, [refetchMembers, refetchInvitations]);

  const handleRoleChange = useCallback(async (memberId: string, newRole: string) => {
    try {
      await updateRoleMutation({
        projectId: project.id,
        memberId,
        data: { role: newRole as 'owner' | 'editor' | 'member' | 'viewer' },
      });
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to update role:', error);
    }
  }, [project.id, updateRoleMutation]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    try {
      await removeMemberMutation({
        projectId: project.id,
        memberId,
      });
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to remove member:', error);
    }
  }, [project.id, removeMemberMutation]);

  const handleRevokeInvitation = useCallback(async (invitationId: string) => {
    try {
      await revokeInvitationMutation({
        projectId: project.id,
        invitationId,
      });
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to revoke invitation:', error);
    }
  }, [project.id, revokeInvitationMutation]);

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    try {
      await resendInvitationMutation({
        projectId: project.id,
        invitationId,
      });
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Failed to resend invitation:', error);
    }
  }, [project.id, resendInvitationMutation]);

  const handleInviteMember = useCallback(() => {
    setInvitationDialogOpen(true);
  }, []);

  const handleInvitationSent = useCallback(() => {
    refetchMembers();
    refetchInvitations();
  }, [refetchMembers, refetchInvitations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Project not found</div>
      </div>
    );
  }

  const isArchived = project.status === "archived";

  return (
    <div className="min-h-screen bg-background">
      {isArchived && (
        <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-6 py-3 text-sm lg:px-8">
            <RiArchiveLine className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">This project is archived</p>
              <p className="text-amber-800">
                The project view is read-only. Only the project owner can unarchive it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Header - Full Width */}
      <ProjectDetailHeader
        project={project}
        userRole={userRole}
        onMembershipChanged={handleMembershipChanged}
        onProjectUpdated={() => router.refresh()}
        renderIssueDialog={(trigger) => (
          <IssuesCreateDialog
            open={issueDialogOpen}
            onOpenChange={setIssueDialogOpen}
            formData={issueFormData}
            errors={issueErrors}
            isSubmitting={isSubmittingIssue}
            onTitleChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, title: value }));
              if (value.trim()) clearFieldError("title");
            }}
            onPageChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, page: value }));
              if (value.trim()) clearFieldError("page");
            }}
            onFigmaLinkChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, figmaLink: value }));
              clearFieldError("figmaLink");
            }}
            onDescriptionChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, description: value }));
              if (value.trim()) clearFieldError("description");
            }}
            onTypeChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, type: value }));
              if (value) clearFieldError("type");
            }}
            onPriorityChange={(value) => {
              setIssueFormData((prev) => ({ ...prev, priority: value }));
              if (value) clearFieldError("priority");
            }}
            onAsIsImageChange={(image) => {
              setIssueFormData((prev) => ({ ...prev, asIsImage: image }));
              if (image) clearFieldError("asIsImage");
            }}
            onToBeImageChange={(image) => {
              setIssueFormData((prev) => ({ ...prev, toBeImage: image }));
              if (image) clearFieldError("toBeImage");
            }}
            onSubmit={handleIssueSubmit}
            onCancel={handleIssueCancel}
            asIsUploadProgress={asIsUploadProgress}
            toBeUploadProgress={toBeUploadProgress}
          >
            {trigger}
          </IssuesCreateDialog>
        )}
        renderMemberDialog={({ trigger, open, onOpenChange }) => {
          // Wrap onOpenChange to trigger data fetching
          const handleOpenChange = (isOpen: boolean) => {
            onOpenChange(isOpen);
            handleMemberDialogOpen(isOpen);
          };
          return (
            <ProjectMemberManagerDialog
              projectId={project.id}
              projectName={project.name}
              userRole={userRole}
              canManageMembers={!isArchived && (userRole === "owner" || userRole === "editor")}
              open={open}
              onOpenChange={handleOpenChange}
              members={members}
              pendingInvitations={pendingInvitations}
              isLoading={isMembersLoading}
              error={membersError}
              onRoleChange={handleRoleChange}
              onRemoveMember={handleRemoveMember}
              onRevokeInvitation={handleRevokeInvitation}
              onResendInvitation={handleResendInvitation}
              onInviteMember={handleInviteMember}
              onOpen={() => handleMemberDialogOpen(true)}
            >
              {trigger}
            </ProjectMemberManagerDialog>
          );
        }}
        renderSettingsDialog={({ trigger, open, onOpenChange }) => (
          <ProjectSettingsDialog
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              visibility: project.visibility,
              status: project.status,
            }}
            userRole={userRole}
            open={open}
            onOpenChange={onOpenChange}
            formData={settingsFormData}
            errors={settingsErrors}
            isSubmitting={isSubmittingSettings}
            showVisibilityConfirm={showVisibilityConfirm}
            pendingVisibility={pendingVisibility}
            onInputChange={handleSettingsInputChange}
            onVisibilityChange={handleVisibilityChange}
            onConfirmVisibilityChange={handleConfirmVisibilityChange}
            onCancelVisibilityChange={handleCancelVisibilityChange}
            onSubmit={async (e) => {
              const success = await handleSettingsSubmit(e);
              if (success) {
                onOpenChange(false);
              }
            }}
            onCancel={handleSettingsCancel}
            hasChanges={hasSettingsChanges}
          >
            {trigger}
          </ProjectSettingsDialog>
        )}
        renderLeaveDialog={({ trigger, open, onOpenChange }) => (
          <ProjectLeaveButton
            projectName={project.name}
            userRole={
              (userRole || "member") as "owner" | "editor" | "member" | "viewer"
            }
            isLeaving={isLeaving}
            error={null}
            onLeave={handleLeave}
            open={open}
            onOpenChange={onOpenChange}
          >
            {trigger}
          </ProjectLeaveButton>
        )}
        memberDialogOpen={memberDialogOpen}
        onMemberDialogOpenChange={(open) => {
          setMemberDialogOpen(open);
          handleMemberDialogOpen(open);
        }}
      />

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Project Issues — Recent Activity now lives in a header-triggered drawer */}
        <ProjectIssues projectId={project.id} initialIssues={initialIssues} />
      </div>

      {/* Project Invitation Dialog */}
      <ProjectInvitationDialog
        open={invitationDialogOpen}
        onOpenChange={setInvitationDialogOpen}
        projectId={project.id}
        teamId={project.teamId}
        projectName={project.name}
        onInvitationSent={handleInvitationSent}
      />
    </div>
  );
}
