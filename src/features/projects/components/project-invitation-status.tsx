'use client'

import React from 'react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@components/ui/dropdown-menu'
import { RiMore2Line, RiMailSendLine, RiDeleteBinLine, RiTimeLine, RiCheckLine, RiCloseLine } from '@remixicon/react'

type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

interface ProjectInvitation {
  id: string
  invitedUserId: string
  role: 'editor' | 'member' | 'viewer'
  status: InvitationStatus
  createdAt: Date
  expiresAt: Date
  invitedUser: {
    id: string
    name: string
    email: string
    image?: string | null
  }
  invitedByUser: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

interface ProjectInvitationStatusProps {
  invitation: ProjectInvitation
  canManage: boolean
  onResend?: (invitation: ProjectInvitation) => void
  onRevoke?: (invitation: ProjectInvitation) => void
}

function getStatusBadge(status: InvitationStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RiTimeLine className="h-3 w-3" />
          Pending
        </Badge>
      )
    case 'accepted':
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100">
          <RiCheckLine className="h-3 w-3" />
          Accepted
        </Badge>
      )
    case 'declined':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <RiCloseLine className="h-3 w-3" />
          Declined
        </Badge>
      )
    case 'expired':
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-200">
          <RiTimeLine className="h-3 w-3" />
          Expired
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getStatusDescription(invitation: ProjectInvitation) {
  const now = new Date()
  const expiresAt = new Date(invitation.expiresAt)
  const isExpired = now > expiresAt

  switch (invitation.status) {
    case 'pending':
      if (isExpired) {
        return 'Invitation has expired'
      }
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
    case 'accepted':
      return `Accepted on ${new Date(invitation.createdAt).toLocaleDateString()}`
    case 'declined':
      return `Declined on ${new Date(invitation.createdAt).toLocaleDateString()}`
    case 'expired':
      return `Expired on ${expiresAt.toLocaleDateString()}`
    default:
      return ''
  }
}

export function ProjectInvitationStatus({
  invitation,
  canManage,
  onResend,
  onRevoke
}: ProjectInvitationStatusProps) {
  const canResend = invitation.status === 'declined' || invitation.status === 'expired'
  const canRevokeInvitation = invitation.status === 'pending'

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge(invitation.status)}

      {canManage && (canResend || canRevokeInvitation) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <RiMore2Line className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canResend && onResend && (
              <DropdownMenuItem onClick={() => onResend(invitation)}>
                <RiMailSendLine className="h-4 w-4" />
                Resend Invitation
              </DropdownMenuItem>
            )}
            {canRevokeInvitation && onRevoke && (
              <>
                {canResend && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => onRevoke(invitation)}
                  variant="destructive"
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                  Revoke Invitation
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="text-xs text-muted-foreground">
        {getStatusDescription(invitation)}
      </div>
    </div>
  )
}
