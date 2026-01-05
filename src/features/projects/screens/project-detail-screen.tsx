"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { IssuesCreateDialog, type ImageData } from "@/features/issues/components/issues-create-dialog";
import { useCreateIssue, uploadAttachment } from "@/features/issues";
import { ProjectMemberManagerDialog } from "../components/project-member-manager-dialog";
import { ProjectInvitationDialog } from "../components/project-invitation-dialog";
import { ProjectSettingsDialog } from "../components/project-settings-dialog";
import { ProjectLeaveButton } from "../components/project-leave-button";
import { ProjectDetailHeader, ProjectIssues } from "../components";
import type { ProjectRole } from "../types";
import type { IssuePriority, IssueType, IssueSummary } from "@/features/issues/types";
import { useRecentProjects, useProjectMembers, useUpdateMemberRole, useRemoveMember, useProjectInvitations, useRevokeInvitation, useResendInvitation } from "../hooks";

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
  const { addRecentProject } = useRecentProjects();
  
  useEffect(() => {
    if (project) {
      addRecentProject({
        id: project.id,
        name: project.name,
        url: pathname,
        icon: project.icon,
      });
    }
  }, [project, addRecentProject, pathname]);

  const canManageMembers = userRole === "owner" || userRole === "editor";
  const { mutateAsync: createIssueMutation } = useCreateIssue();
  // Issue dialog state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    title: "",
    page: "",
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

  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
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

  // Leave button state
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Member dialog state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  
  // Real data hooks for members
  const { 
    data: membersData, 
    isLoading: isMembersLoading, 
    error: membersQueryError,
    refetch: refetchMembers 
  } = useProjectMembers({ projectId: project.id, enabled: memberDialogOpen });
  
  const { mutateAsync: updateRoleMutation } = useUpdateMemberRole();
  const { mutateAsync: removeMemberMutation } = useRemoveMember();
  
  // Real data hooks for invitations
  const { 
    pendingInvitations: invitationsData,
    refetch: refetchInvitations 
  } = useProjectInvitations({ projectId: project.id, enabled: memberDialogOpen });
  
  const { mutateAsync: revokeInvitationMutation } = useRevokeInvitation();
  const { mutateAsync: resendInvitationMutation } = useResendInvitation();
  
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
      invitedUserId: inv.invitedUserId || '',
      role: inv.role as 'editor' | 'member' | 'viewer',
      status: inv.status,
      createdAt: new Date(inv.createdAt),
      expiresAt: new Date(inv.expiresAt),
      invitedUser: inv.invitedUser,
      invitedByUser: inv.invitedByUser,
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
          setIsSubmittingIssue(false);
          setAsIsUploadProgress(0);
          setToBeUploadProgress(0);
          // Don't close dialog, don't clear form data - preserve user's work
          // Error toast will be shown by the upload failure
          return; // Exit early, blocking issue creation
        }
      }

      setIsSubmittingIssue(false);
      setAsIsUploadProgress(0);
      setToBeUploadProgress(0);
      setIssueDialogOpen(false);
      setIssueFormData({
        title: "",
        page: "",
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
      return;
    }

    setIsSubmittingSettings(true);
    // TODO: wire PATCH /api/projects/:id
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    setIsSubmittingSettings(false);
    setSettingsDialogOpen(false);
  };

  const handleSettingsCancel = () => {
    setSettingsDialogOpen(false);
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

  // Leave button handler
  const handleLeave = async () => {
    setIsLeaving(true);
    setLeaveError(null);
    // TODO: wire DELETE /api/projects/:id/members/me
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    setIsLeaving(false);
    // TODO: redirect to projects list
  };

  // Member dialog handlers
  const handleMemberDialogOpen = useCallback((open: boolean) => {
    setMemberDialogOpen(open);
    if (open) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Project Header - Full Width */}
      <ProjectDetailHeader
        project={project}
        userRole={userRole}
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
        renderMemberDialog={(trigger) => (
          <ProjectMemberManagerDialog
            projectId={project.id}
            projectName={project.name}
            userRole={userRole}
            canManageMembers={userRole === "owner" || userRole === "editor"}
            open={memberDialogOpen}
            onOpenChange={handleMemberDialogOpen}
            members={members}
            pendingInvitations={pendingInvitations}
            isLoading={isMembersLoading}
            error={membersError}
            onRoleChange={handleRoleChange}
            onRemoveMember={handleRemoveMember}
            onRevokeInvitation={handleRevokeInvitation}
            onResendInvitation={handleResendInvitation}
            onInviteMember={handleInviteMember}
          >
            {trigger}
          </ProjectMemberManagerDialog>
        )}
        renderSettingsDialog={(trigger) => (
          <ProjectSettingsDialog
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              visibility: project.visibility,
              status: "active",
            }}
            userRole={userRole}
            open={settingsDialogOpen}
            onOpenChange={setSettingsDialogOpen}
            formData={settingsFormData}
            errors={settingsErrors}
            isSubmitting={isSubmittingSettings}
            showVisibilityConfirm={showVisibilityConfirm}
            pendingVisibility={pendingVisibility}
            onInputChange={handleSettingsInputChange}
            onVisibilityChange={handleVisibilityChange}
            onConfirmVisibilityChange={handleConfirmVisibilityChange}
            onCancelVisibilityChange={handleCancelVisibilityChange}
            onSubmit={handleSettingsSubmit}
            onCancel={handleSettingsCancel}
            hasChanges={hasSettingsChanges}
          >
            {trigger}
          </ProjectSettingsDialog>
        )}
        renderLeaveDialog={(trigger: React.ReactNode) => (
          <ProjectLeaveButton
            projectName={project.name}
            userRole={
              (userRole || "member") as "owner" | "editor" | "member" | "viewer"
            }
            isLeaving={isLeaving}
            error={leaveError}
            onLeave={handleLeave}
          >
            {trigger}
          </ProjectLeaveButton>
        )}
      />

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 space-y-8">
        {/* Project Issues */}
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
