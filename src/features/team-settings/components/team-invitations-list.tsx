"use client";

import { useState } from "react";
import { MoreHorizontal, Mail, RefreshCw, X, Plus, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useCancelInvitation,
} from "@/features/teams";
import type { Invitation } from "@/features/teams/api";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/config/roles";
import { SettingsCard } from "./settings-card";
import { LoadingButton } from "./loading-states";

const roleIcons: Record<string, typeof Mail> = {
  owner: Mail,
  admin: Mail,
  member: Mail,
  viewer: Mail,
};

interface TeamInvitationsListProps {
  teamId: string;
}

interface InviteMemberFormData {
  email: string;
  role: string;
  message: string;
}

export function TeamInvitationsList({ teamId }: TeamInvitationsListProps) {
  const { data, isLoading } = useInvitations(teamId);
  const { mutate: createInvitation, isPending: isCreating } = useCreateInvitation();
  const { mutate: resendInvitation, isPending: isResending } = useResendInvitation();
  const { mutate: cancelInvitation, isPending: isCanceling } = useCancelInvitation();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const [formData, setFormData] = useState<InviteMemberFormData>({
    email: "",
    role: "TEAM_MEMBER",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const invitations = data?.invitations ?? [];
  const pendingInvitationsCount = invitations.filter(
    (inv) => inv.status === "pending"
  ).length;

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

  const handleSendInvitation = () => {
    if (!validateForm()) return;

    createInvitation(
      {
        teamId,
        input: {
          email: formData.email,
          operationalRole: formData.role,
          // message: formData.message, // API might not support message yet, checking types
        },
      },
      {
        onSuccess: () => {
          toast.success("Invitation sent successfully");
          setIsInviteDialogOpen(false);
          setFormData({ email: "", role: "TEAM_MEMBER", message: "" });
          setFormErrors({});
        },
        onError: (error) => {
          toast.error(error.message || "Failed to send invitation");
        },
      }
    );
  };

  const handleCopyInvitationLink = () => {
    if (!validateForm()) return;

    setIsCopyingLink(true);
    createInvitation(
      {
        teamId,
        input: {
          email: formData.email,
          operationalRole: formData.role,
        },
      },
      {
        onSuccess: (data) => {
          // Copy the invitation URL to clipboard
          navigator.clipboard.writeText(data.invitationUrl).then(
            () => {
              toast.success("Invitation link copied to clipboard!");
              setIsInviteDialogOpen(false);
              setFormData({ email: "", role: "TEAM_MEMBER", message: "" });
              setFormErrors({});
            },
            () => {
              toast.error("Failed to copy link to clipboard");
            }
          );
          setIsCopyingLink(false);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create invitation");
          setIsCopyingLink(false);
        },
      }
    );
  };

  const handleResendInvitation = (invitationId: string) => {
    setResendingId(invitationId);
    resendInvitation(
      {
        teamId,
        invitationId,
      },
      {
        onSuccess: () => {
          toast.success("Invitation resent successfully");
          setResendingId(null);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to resend invitation");
          setResendingId(null);
        },
      }
    );
  };

  const handleCancelInvitation = () => {
    if (!invitationToCancel) return;

    cancelInvitation(
      {
        teamId,
        invitationId: invitationToCancel.id,
      },
      {
        onSuccess: () => {
          toast.success("Invitation cancelled successfully");
          setInvitationToCancel(null);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to cancel invitation");
        },
      }
    );
  };

  const isExpired = (invitation: Invitation) => {
    return new Date(invitation.expiresAt) < new Date();
  };

  if (isLoading) {
    return <div>Loading invitations...</div>;
  }

  return (
    <>
      <SettingsCard
        title="Pending Invitations"
        description={`${pendingInvitationsCount} pending invitation${pendingInvitationsCount !== 1 ? "s" : ""}`}
      >
        <div className="space-y-4">
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
                    Send an invitation email or copy the link to share directly.
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
                        setFormData((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEAM_EDITOR">Editor</SelectItem>
                        <SelectItem value="TEAM_MEMBER">Member</SelectItem>
                        <SelectItem value="TEAM_VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.role && (
                      <p className="text-sm text-destructive">{formErrors.role}</p>
                    )}
                    {formData.role && !formErrors.role && (
                      <p className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[formData.role as keyof typeof ROLE_DESCRIPTIONS]}
                      </p>
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
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                    disabled={isCreating || isCopyingLink}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    variant="outline"
                    onClick={handleCopyInvitationLink}
                    isLoading={isCopyingLink}
                    disabled={isCreating}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </LoadingButton>
                  <LoadingButton
                    onClick={handleSendInvitation}
                    isLoading={isCreating}
                    disabled={isCopyingLink}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </LoadingButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((invitation) => {
                    const expired = isExpired(invitation);
                    const status = expired ? "expired" : invitation.status || "pending";
                    const RoleIcon = roleIcons[invitation.operationalRole] || Mail;

                    return (
                      <TableRow key={invitation.id} className="bg-muted/30">
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
                                Invitation {status}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <Badge variant="outline">{ROLE_LABELS[invitation.operationalRole as keyof typeof ROLE_LABELS] ?? invitation.operationalRole}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === "expired" ? "destructive" : "secondary"}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                              {status === "pending" && !expired && (
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  disabled={resendingId === invitation.id || isResending}
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
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SettingsCard>

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
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Keep Invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? "Canceling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
