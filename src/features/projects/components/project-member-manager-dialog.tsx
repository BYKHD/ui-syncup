'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { RiTeamLine, RiMore2Line, RiUserLine, RiDeleteBinLine, RiAddLine, RiVipCrownLine, RiMailSendLine } from '@remixicon/react'

interface User {
  id: string
  name: string
  email: string
  image?: string | null
}

interface ProjectMember {
  id: string
  userId: string
  role: 'owner' | 'editor' | 'member' | 'viewer'
  invitedBy: string | null
  joinedAt: Date
  user: User
}

interface ProjectInvitation {
  id: string
  invitedUserId: string
  role: 'editor' | 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: Date
  expiresAt: Date
  invitedUser: User
  invitedByUser: User
}

interface ProjectMemberManagerDialogProps {
  projectId: string
  projectName: string
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null
  canManageMembers: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  members: ProjectMember[]
  pendingInvitations: ProjectInvitation[]
  isLoading?: boolean
  error?: string | null
  onRoleChange: (memberId: string, newRole: 'owner' | 'editor' | 'member' | 'viewer') => void
  onRemoveMember: (memberId: string) => void
  onRevokeInvitation: (invitationId: string) => void
  onResendInvitation: (invitationId: string) => void
  onInviteMember: () => void
  children?: React.ReactNode
}

/**
 * ProjectMemberManagerDialog
 * 
 * Ready-to-wire controlled dialog for managing project members and invitations.
 * All state and actions are managed by the parent component.
 */
export function ProjectMemberManagerDialog({ 
  projectId, 
  projectName,
  userRole, 
  canManageMembers,
  open,
  onOpenChange,
  members,
  pendingInvitations,
  isLoading = false,
  error = null,
  onRoleChange,
  onRemoveMember,
  onRevokeInvitation,
  onResendInvitation,
  onInviteMember,
  children 
}: ProjectMemberManagerDialogProps) {
  // Confirmation dialogs
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null)
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false)
  const [roleChangeData, setRoleChangeData] = useState<{ member: ProjectMember; newRole: 'owner' | 'editor' | 'member' | 'viewer' } | null>(null)

  const handleRoleChange = (member: ProjectMember, newRole: 'owner' | 'editor' | 'member' | 'viewer') => {
    if (newRole === 'owner') {
      // Show confirmation for ownership transfer
      setRoleChangeData({ member, newRole })
      setShowRoleChangeConfirm(true)
      return
    }

    onRoleChange(member.id, newRole)
  }

  const handleRemoveMember = (member: ProjectMember) => {
    setMemberToRemove(member)
    setShowRemoveConfirm(true)
  }

  const confirmRemoveMember = () => {
    if (!memberToRemove) return
    onRemoveMember(memberToRemove.id)
    setShowRemoveConfirm(false)
    setMemberToRemove(null)
  }

  const confirmRoleChange = () => {
    if (!roleChangeData) return
    onRoleChange(roleChangeData.member.id, roleChangeData.newRole)
    setShowRoleChangeConfirm(false)
    setRoleChangeData(null)
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      owner: 'Owner',
      editor: 'Editor', 
      member: 'Member',
      viewer: 'Viewer'
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default'
      case 'editor': return 'secondary'
      case 'member': return 'outline'
      case 'viewer': return 'outline'
      default: return 'outline'
    }
  }

  const canChangeRole = (member: ProjectMember) => {
    if (!canManageMembers) return false
    if (member.role === 'owner' && userRole !== 'owner') return false
    return true
  }

  const canRemoveMember = (member: ProjectMember) => {
    if (!canManageMembers) return false
    if (member.role === 'owner' && (members || []).filter(m => m.role === 'owner').length === 1) return false
    return true
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children && (
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Project Members</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading members...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Members */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Members ({(members || []).length})</h3>
                    {canManageMembers && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={onInviteMember}
                      >
                        <RiAddLine className="h-4 w-4" />
                        Invite
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {(members || []).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user.image || undefined} />
                            <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{member.user.name}</span>
                              {member.role === 'owner' && (
                                <RiVipCrownLine className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{member.user.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleDisplayName(member.role)}
                          </Badge>
                          
                          {canManageMembers && (canChangeRole(member) || canRemoveMember(member)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                >
                                  <RiMore2Line className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canChangeRole(member) && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleRoleChange(member, 'owner')}>
                                      <RiVipCrownLine className="h-4 w-4" />
                                      Make Owner
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(member, 'editor')}>
                                      <RiUserLine className="h-4 w-4" />
                                      Make Editor
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(member, 'member')}>
                                      <RiUserLine className="h-4 w-4" />
                                      Make Member
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(member, 'viewer')}>
                                      <RiUserLine className="h-4 w-4" />
                                      Make Viewer
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {canRemoveMember(member) && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRemoveMember(member)}
                                    variant="destructive"
                                  >
                                    <RiDeleteBinLine className="h-4 w-4" />
                                    Remove Member
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invitations */}
                {(pendingInvitations || []).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Pending Invitations ({(pendingInvitations || []).length})</h3>
                      <div className="space-y-2">
                        {(pendingInvitations || []).map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={invitation.invitedUser.image || undefined} />
                                <AvatarFallback>{getInitials(invitation.invitedUser.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{invitation.invitedUser.name}</div>
                                <div className="text-xs text-muted-foreground">{invitation.invitedUser.email}</div>
                                <div className="text-xs text-muted-foreground">
                                  Invited by {invitation.invitedByUser.name} • 
                                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {getRoleDisplayName(invitation.role)}
                              </Badge>
                              <Badge variant="secondary">Pending</Badge>
                              
                              {canManageMembers && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <RiMore2Line className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onResendInvitation(invitation.id)}>
                                      <RiMailSendLine className="h-4 w-4" />
                                      Resend Invitation
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => onRevokeInvitation(invitation.id)}
                                      variant="destructive"
                                    >
                                      <RiDeleteBinLine className="h-4 w-4" />
                                      Revoke Invitation
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.user.name}</strong> from this project? 
              They will lose access to all project content and will need to be re-invited to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={showRoleChangeConfirm} onOpenChange={setShowRoleChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Project Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make <strong>{roleChangeData?.member.user.name}</strong> the project owner? 
              You will become an Editor and lose owner privileges for this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleChangeData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  )
}