"use client";

import { useState } from "react";
import { MoreHorizontal, UserMinus, Shield, User, Eye } from "lucide-react";
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

import { useTeamMembers, useUpdateMemberRoles, useRemoveMember } from "@/features/teams";
import type { TeamMember } from "@/features/teams/api";
import { SettingsCard } from "./settings-card";

const roleIcons: Record<string, typeof Shield> = {
  owner: Shield,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

interface TeamMembersListProps {
  teamId: string;
  currentUserId: string;
}

export function TeamMembersList({ teamId, currentUserId }: TeamMembersListProps) {
  const { data, isLoading } = useTeamMembers(teamId);
  const { mutate: updateRole, isPending: isUpdating } = useUpdateMemberRoles();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();

  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const members = data?.members ?? [];

  const handleUpdateRole = (memberId: string, newRole: string) => {
    updateRole(
      {
        teamId,
        userId: memberId, // Note: The API might expect userId or memberId. Checking useUpdateMemberRoles signature.
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

  // TODO: Implement proper permission checks based on current user's role
  const canManageMembers = true; 

  if (isLoading) {
    return <div>Loading members...</div>;
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
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const RoleIcon = roleIcons[member.operationalRole] || User;
                const isCurrentUser = member.userId === currentUserId;
                const canModify = canManageMembers && !isCurrentUser && member.operationalRole !== "owner";

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {/* Avatar image would come from user profile, but TeamMember might not have it directly populated if not joined. 
                              The API response schema has name/email. Image might be missing. */}
                          <AvatarFallback>
                            {getUserInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canModify ? (
                        <Select
                          value={member.operationalRole}
                          onValueChange={(newRole) => {
                            handleUpdateRole(member.userId, newRole);
                          }}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <RoleIcon className="h-4 w-4" />
                                <Badge variant={roleBadgeVariants[member.operationalRole] || "outline"}>
                                  {member.operationalRole}
                                </Badge>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4" />
                          <Badge variant={roleBadgeVariants[member.operationalRole] || "outline"}>
                            {member.operationalRole}
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
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from team
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
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.name}</strong> from the team? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
