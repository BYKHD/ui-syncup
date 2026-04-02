"use client";

import { useState } from "react";
import { MoreHorizontal, UserMinus } from "lucide-react";
import { RiShieldUserLine, RiUserLine, RiEyeLine, RiAdminLine } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { useTeamMembers, useUpdateMemberRoles, useRemoveMember, useTeamPermissions } from "@/features/teams";
import type { TeamMember } from "@/features/teams/api";
import { SettingsCard } from "./settings-card";
import { TeamMembersLoadingSkeleton } from "./loading-states";

const operationalRoleIcons: Record<string, any> = {
  TEAM_EDITOR: RiUserLine,
  TEAM_MEMBER: RiUserLine,
  TEAM_VIEWER: RiEyeLine,
};

const operationalRoleLabels: Record<string, string> = {
  TEAM_EDITOR: "Editor",
  TEAM_MEMBER: "Member",
  TEAM_VIEWER: "Viewer",
};

interface TeamMembersListProps {
  teamId: string;
  currentUserId: string;
}

export function TeamMembersList({ teamId, currentUserId }: TeamMembersListProps) {
  const { data, isLoading, error, isError } = useTeamMembers(teamId);
  const { mutate: updateRole, isPending: isUpdating } = useUpdateMemberRoles();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();

  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const members = data?.members ?? [];

  if (isError) {
    console.error("Failed to load team members:", error);
  }

  const handleOperationalRoleChange = (memberId: string, newRole: string) => {
    updateRole(
      {
        teamId,
        userId: memberId,
        input: { operationalRole: newRole },
      },
      {
        onSuccess: () => {
          toast.success("Member role updated successfully");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update member role");
        },
      }
    );
  };

  const handleAdminToggle = (memberId: string, isAdmin: boolean) => {
    updateRole(
      {
        teamId,
        userId: memberId,
        input: { managementRole: isAdmin ? 'WORKSPACE_ADMIN' : null },
      },
      {
        onSuccess: () => {
          toast.success("Admin rights updated successfully");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update admin rights");
        },
      }
    );
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;

    removeMember(
      {
        teamId,
        userId: memberToRemove.userId,
      },
      {
        onSuccess: () => {
          toast.success("Member removed successfully");
          setMemberToRemove(null);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to remove member");
        },
      }
    );
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  // Use real permission checks
  const { canManageMembers } = useTeamPermissions(teamId); 

  if (isLoading) {
    return <TeamMembersLoadingSkeleton />;
  }

  if (isError) {
    return (
      <SettingsCard
        title="Members"
        description="Manage your team members and their roles"
      >
        <div className="rounded-md border border-destructive/50 p-4 text-destructive">
          <div className="font-medium">Failed to load members</div>
          <div className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </div>
        </div>
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard
        title="Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""}`}
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const RoleIcon = operationalRoleIcons[member.operationalRole] || RiUserLine;
                const isCurrentUser = member.userId === currentUserId;
                const isOwner = member.managementRole === 'WORKSPACE_OWNER';
                const isAdmin = member.managementRole === 'WORKSPACE_ADMIN';
                const canModify = canManageMembers && !isCurrentUser && !isOwner;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.image || undefined} alt={member.user.name} />
                          <AvatarFallback>
                            {getUserInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.user.name}</span>
                            {isOwner && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                Owner
                              </Badge>
                            )}
                            {isAdmin && !isOwner && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canModify ? (
                        <Select
                          value={member.operationalRole}
                          onValueChange={(newRole) => {
                            handleOperationalRoleChange(member.userId, newRole);
                          }}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <RoleIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{operationalRoleLabels[member.operationalRole]}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEAM_EDITOR">
                              <div className="flex items-center gap-2">
                                <RiUserLine className="h-4 w-4 text-muted-foreground" />
                                <span>Editor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="TEAM_MEMBER">
                              <div className="flex items-center gap-2">
                                <RiUserLine className="h-4 w-4 text-muted-foreground" />
                                <span>Member</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="TEAM_VIEWER">
                              <div className="flex items-center gap-2">
                                <RiEyeLine className="h-4 w-4 text-muted-foreground" />
                                <span>Viewer</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{operationalRoleLabels[member.operationalRole]}</span>
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
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleAdminToggle(member.userId, !isAdmin)}
                            >
                              {isAdmin ? "Remove Admin" : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Transfer Ownership
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMemberToRemove(member)}
                            >
                              Remove Member
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
      </SettingsCard>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.user.name} from the team?
              They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

