"use client";

import { useState } from "react";
import { MoreHorizontal, UserMinus, Shield, User, Eye, Plus, Mail, RefreshCw, X } from "lucide-react";
import {
  SettingsCard,
  SettingsSection,
  LoadingButton,
} from ".";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Textarea } from "@components/ui/textarea";
import { toast } from "sonner";
import {
  MOCK_TEAM_MEMBERS,
  MOCK_TEAM_INVITATIONS,
  type TeamMemberWithUser,
  type TeamInvitation,
  type TeamRole,
} from "@/mocks/team-member.fixtures";

const roleIcons: Record<TeamRole, typeof Shield> = {
  owner: Shield,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleBadgeVariants: Record<TeamRole, "default" | "secondary" | "outline"> = {
  owner: "default" as const,
  admin: "secondary" as const,
  member: "outline" as const,
  viewer: "outline" as const,
};

interface InviteMemberFormData {
  email: string;
  role: Exclude<TeamRole, "owner">;
  message: string;
}

export default function TeamMembersPage() {
  // Mock data state
  const [members, setMembers] = useState<TeamMemberWithUser[]>(MOCK_TEAM_MEMBERS);
  const [invitations, setInvitations] = useState<TeamInvitation[]>(MOCK_TEAM_INVITATIONS);

  // UI state
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberWithUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<TeamInvitation | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<InviteMemberFormData>({
    email: "",
    role: "member",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mock permissions (owner has all permissions)
  const permissions = {
    canManageMembers: true,
  };

  // Update member role with simulated delay
  const updateMemberRole = async (memberId: string, newRole: TeamRole) => {
    setIsUpdatingRole(memberId);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );

    setIsUpdatingRole(null);
    toast.success("Member role updated successfully!");
  };

  // Remove member from team with simulated delay
  const removeMember = async (member: TeamMemberWithUser) => {
    setIsRemoving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setIsRemoving(false);
    setMemberToRemove(null);
    toast.success(`${member.user.name} has been removed from the team.`);
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format join date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  // Check if member is the last admin
  const isLastAdmin = (member: TeamMemberWithUser) => {
    const adminCount = members.filter((m) => m.role === "admin").length;
    return member.role === "admin" && adminCount === 1;
  };

  // Check if current user can modify a member
  const canModifyMember = (member: TeamMemberWithUser) => {
    // Can't modify team owner
    if (member.role === "owner") return false;

    // Only team owners can manage members
    return permissions.canManageMembers;
  };

  // Validate invitation form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.role) {
      errors.role = "Role is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Send invitation with simulated delay
  const sendInvitation = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate temporary ID for new invitation
    const newInvitation: TeamInvitation = {
      id: `invite-${Date.now()}`,
      teamId: "team-123",
      email: formData.email,
      role: formData.role,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      invitedBy: "user-1",
    };

    setInvitations((prev) => [...prev, newInvitation]);
    setIsSubmitting(false);
    setIsInviteDialogOpen(false);
    setFormData({ email: "", role: "member", message: "" });
    setFormErrors({});
    toast.success("Invitation sent successfully!");
  };

  // Resend invitation with simulated delay
  const resendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Update the invitation's createdAt date
    setInvitations((prev) =>
      prev.map((inv) =>
        inv.id === invitationId
          ? {
              ...inv,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
          : inv
      )
    );

    setResendingId(null);
    toast.success("Invitation resent successfully!");
  };

  // Cancel invitation with simulated delay
  const cancelInvitation = async (invitation: TeamInvitation) => {
    setIsCanceling(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    setIsCanceling(false);
    setInvitationToCancel(null);
    toast.success("Invitation cancelled successfully!");
  };

  // Check if invitation is expired
  const isExpired = (invitation: TeamInvitation) => {
    return new Date(invitation.expiresAt) < new Date();
  };

  const pendingInvitationsCount = invitations.filter(
    (inv) => inv.status === "pending"
  ).length;

  return (
    <SettingsSection
      title="Team Members"
      description="Manage your team members and their roles"
    >
      <SettingsCard
        title="Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} and ${pendingInvitationsCount} pending invitation${pendingInvitationsCount !== 1 ? "s" : ""}`}
      >
        <div className="space-y-4">
          {permissions.canManageMembers && (
            <div className="flex justify-end">
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your team. They&apos;ll receive an email with instructions to accept.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        className={formErrors.email ? "border-destructive" : ""}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-destructive">{formErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, role: value as Exclude<TeamRole, "owner"> }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.role && (
                        <p className="text-sm text-destructive">{formErrors.role}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Personal Message (Optional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Add a personal message to the invitation..."
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <LoadingButton onClick={sendInvitation} isLoading={isSubmitting}>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </LoadingButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Active Members */}
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  const canModify = canModifyMember(member);

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user.image} alt={member.user.name} />
                            <AvatarFallback>
                              {getUserInitials(member.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canModify ? (
                          <Select
                            value={member.role}
                            onValueChange={(newRole: TeamRole) => {
                              updateMemberRole(member.id, newRole);
                            }}
                            disabled={isUpdatingRole === member.id}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  <RoleIcon className="h-4 w-4" />
                                  <Badge variant={roleBadgeVariants[member.role]}>
                                    {member.role}
                                  </Badge>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="member">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Member
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  Viewer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <Badge variant={roleBadgeVariants[member.role]}>
                              {member.role}
                              {isLastAdmin(member) && " (Last)"}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                      <TableCell>
                        {canModify && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToRemove(member)}
                                disabled={isLastAdmin(member)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                {isLastAdmin(member)
                                  ? "Cannot remove last admin"
                                  : "Remove from team"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Pending Invitations */}
                {invitations
                  .filter((invitation) => invitation.status === "pending")
                  .map((invitation) => {
                    const expired = isExpired(invitation);
                    const status = expired ? "expired" : invitation.status;
                    const RoleIcon = roleIcons[invitation.role];

                    return (
                      <TableRow key={`invitation-${invitation.id}`} className="bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <Mail className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-muted-foreground">
                                {invitation.email}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Invitation pending
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <Badge variant="outline">{invitation.role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === "expired" ? "destructive" : "secondary"}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {permissions.canManageMembers && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {invitation.status === "pending" && !expired && (
                                  <DropdownMenuItem
                                    onClick={() => resendInvitation(invitation.id)}
                                    disabled={resendingId === invitation.id}
                                  >
                                    <RefreshCw
                                      className={`mr-2 h-4 w-4 ${
                                        resendingId === invitation.id ? "animate-spin" : ""
                                      }`}
                                    />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setInvitationToCancel(invitation)}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      </SettingsCard>

      {/* Remove member confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.user.name}</strong> from the team? This
              action cannot be undone and they will lose access to all team
              resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMember(memberToRemove)}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel invitation confirmation dialog */}
      <AlertDialog
        open={!!invitationToCancel}
        onOpenChange={() => setInvitationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation for{" "}
              <strong>{invitationToCancel?.email}</strong>? This action cannot be
              undone and they will not be able to join the team using this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Keep Invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invitationToCancel && cancelInvitation(invitationToCancel)}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? "Canceling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
