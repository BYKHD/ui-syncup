"use client";

import { useState } from "react";
import { IssuesCreateDialog } from "@features/issues/components/issues-create-dialog";
import { ProjectMemberManagerDialog } from "../components/project-member-manager-dialog";
import { ProjectSettingsDialog } from "../components/project-settings-dialog";
import { ProjectLeaveButton } from "../components/project-leave-button";
import { ProjectDetailHeader, ProjectIssues } from "../components";
import { ProjectOverview } from "../components/project-detail-overview";
import type { ProjectRole } from "../types";

interface ProjectDetailScreenProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    visibility: "private" | "public";
    progressPercent: number;
    tickets: number;
    ticketsDone: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  };
  userRole: ProjectRole | null;
  isLoading?: boolean;
}

type IssuePriority = "critical" | "high" | "medium" | "low" | null;
type IssueType = "bug" | "feature" | "improvement" | null;

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
}: ProjectDetailScreenProps) {
  const canManageMembers = userRole === "owner" || userRole === "editor";
  // Issue dialog state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    title: "",
    description: "",
    type: null as IssueType,
    priority: null as IssuePriority,
  });
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

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
  const [members, setMembers] = useState<any[]>([]); // TODO: type from mocks
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

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

    if (Object.keys(errors).length > 0) {
      setIssueErrors(errors);
      return;
    }

    setIsSubmittingIssue(true);
    // TODO: wire POST /api/projects/:id/issues
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    setIsSubmittingIssue(false);
    setIssueDialogOpen(false);
    setIssueFormData({
      title: "",
      description: "",
      type: null,
      priority: null,
    });
  };

  const handleIssueCancel = () => {
    setIssueDialogOpen(false);
    setIssueFormData({
      title: "",
      description: "",
      type: null,
      priority: null,
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
  const handleMemberDialogOpen = (open: boolean) => {
    setMemberDialogOpen(open);
    if (open && members.length === 0) {
      // Load mock data on first open
      setIsMembersLoading(true);
      // TODO: wire GET /api/projects/:id/members
      setTimeout(() => {
        // Using mock data for now
        const {
          MOCK_PROJECT_MEMBERS,
          MOCK_PROJECT_INVITATIONS,
        } = require("@/mocks");
        setMembers(
          MOCK_PROJECT_MEMBERS.filter((m: any) => m.projectId === project.id)
        );
        setPendingInvitations(
          MOCK_PROJECT_INVITATIONS.filter(
            (i: any) => i.projectId === project.id && i.status === "pending"
          )
        );
        setIsMembersLoading(false);
      }, 500);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    // TODO: wire PATCH /api/projects/:id/members/:memberId
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    // TODO: wire DELETE /api/projects/:id/members/:memberId
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    // TODO: wire DELETE /api/projects/:id/invitations/:invitationId
    await new Promise((resolve) => setTimeout(resolve, 500));
    setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  };

  const handleResendInvitation = async (invitationId: string) => {
    // TODO: wire POST /api/projects/:id/invitations/:invitationId/resend
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const handleInviteMember = () => {
    // TODO: open invitation dialog
    console.log("Open invitation dialog");
  };

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
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* Project Header */}
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
            onTitleChange={(value) =>
              setIssueFormData((prev) => ({ ...prev, title: value }))
            }
            onDescriptionChange={(value) =>
              setIssueFormData((prev) => ({ ...prev, description: value }))
            }
            onTypeChange={(value) =>
              setIssueFormData((prev) => ({ ...prev, type: value }))
            }
            onPriorityChange={(value) =>
              setIssueFormData((prev) => ({ ...prev, priority: value }))
            }
            onSubmit={handleIssueSubmit}
            onCancel={handleIssueCancel}
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
        renderLeaveButton={(trigger) => (
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

      <div className="space-y-8">
        {/* Project Issues */}
        <ProjectIssues projectId={project.id} />
      </div>
    </div>
  );
}
