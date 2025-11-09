'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar'
import { Badge } from '@components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Separator } from '@components/ui/separator'
import { RiMailLine, RiAddLine, RiRefreshLine } from '@remixicon/react'
import { ProjectInvitationDialog } from './project-invitation-dialog'
import { ProjectInvitationStatus } from './project-invitation-status'

interface User {
  id: string
  name: string
  email: string
  image?: string | null
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

interface ProjectInvitationManagerProps {
  projectId: string
  projectName: string
  canManageInvitations: boolean
  children?: React.ReactNode
}

export function ProjectInvitationManager({ 
  projectId, 
  projectName,
  canManageInvitations,
  children 
}: ProjectInvitationManagerProps) {
  const [open, setOpen] = useState(false)
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')

  const fetchInvitations = async () => {
    if (!open) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch project invitations')
      }
      
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setError(error instanceof Error ? error.message : 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [open, projectId])

  const handleInvitationSent = () => {
    setShowInviteDialog(false)
    fetchInvitations() // Refresh to show new invitation
  }

  const handleRevokeInvitation = async (invitation: ProjectInvitation) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/${invitation.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to revoke invitation')
      }

      // Update invitation status locally
      setInvitations(prev => prev.map(inv => 
        inv.id === invitation.id 
          ? { ...inv, status: 'declined' as const }
          : inv
      ))
    } catch (error) {
      console.error('Error revoking invitation:', error)
      setError(error instanceof Error ? error.message : 'Failed to revoke invitation')
    }
  }

  const handleResendInvitation = async (invitation: ProjectInvitation) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/${invitation.id}/resend`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to resend invitation')
      }

      // Refresh invitations to show updated data
      fetchInvitations()
    } catch (error) {
      console.error('Error resending invitation:', error)
      setError(error instanceof Error ? error.message : 'Failed to resend invitation')
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      editor: 'Editor', 
      member: 'Member',
      viewer: 'Viewer'
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'editor': return 'secondary'
      case 'member': return 'outline'
      case 'viewer': return 'outline'
      default: return 'outline'
    }
  }

  const filterInvitations = (status: string) => {
    if (status === 'all') return invitations
    return invitations.filter(inv => inv.status === status)
  }

  const getTabCounts = () => {
    return {
      pending: invitations.filter(inv => inv.status === 'pending').length,
      accepted: invitations.filter(inv => inv.status === 'accepted').length,
      declined: invitations.filter(inv => inv.status === 'declined').length,
      expired: invitations.filter(inv => inv.status === 'expired').length,
      all: invitations.length
    }
  }

  const tabCounts = getTabCounts()

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm">
              <RiMailLine className="h-4 w-4" />
              Invitations
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Project Invitations</DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={fetchInvitations}
                  disabled={loading}
                >
                  <RiRefreshLine className="h-4 w-4" />
                </Button>
                {canManageInvitations && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <RiAddLine className="h-4 w-4" />
                    Invite
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading invitations...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="pending" className="text-xs">
                    Pending {tabCounts.pending > 0 && `(${tabCounts.pending})`}
                  </TabsTrigger>
                  <TabsTrigger value="accepted" className="text-xs">
                    Accepted {tabCounts.accepted > 0 && `(${tabCounts.accepted})`}
                  </TabsTrigger>
                  <TabsTrigger value="declined" className="text-xs">
                    Declined {tabCounts.declined > 0 && `(${tabCounts.declined})`}
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs">
                    Expired {tabCounts.expired > 0 && `(${tabCounts.expired})`}
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">
                    All {tabCounts.all > 0 && `(${tabCounts.all})`}
                  </TabsTrigger>
                </TabsList>
                
                {(['pending', 'accepted', 'declined', 'expired', 'all'] as const).map((status) => (
                  <TabsContent key={status} value={status} className="mt-4">
                    <div className="space-y-2">
                      {filterInvitations(status).length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No {status === 'all' ? '' : status} invitations found
                        </div>
                      ) : (
                        filterInvitations(status).map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg border">
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
                                  {new Date(invitation.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant={getRoleBadgeVariant(invitation.role)}>
                                {getRoleDisplayName(invitation.role)}
                              </Badge>
                              
                              <ProjectInvitationStatus
                                invitation={invitation}
                                canManage={canManageInvitations}
                                onResend={handleResendInvitation}
                                onRevoke={handleRevokeInvitation}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Dialog */}
      <ProjectInvitationDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        projectId={projectId}
        projectName={projectName}
        onInvitationSent={handleInvitationSent}
      />
    </>
  )
}