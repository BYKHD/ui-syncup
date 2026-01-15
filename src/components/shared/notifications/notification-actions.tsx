'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatTimestamp } from './utils'
import { useMarkAsRead, notificationKeys } from '@/features/notifications/hooks'
import type { Notification } from '@/features/notifications/api'

// ============================================================================
// NOTIFICATION ACTIONS COMPONENT
// ============================================================================

type InvitationAction = 'accept' | 'decline'

interface NotificationActionsProps {
  notification: Notification
  teamId: string | null
}

interface InvitationState {
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  respondedAt?: string
  message?: string
  disabledReason?: string
}

/**
 * NotificationActions - Accept/Decline buttons for invitation notifications
 *
 * Handles both project and team invitations with proper API calls.
 * Shows status badges for already-responded invitations.
 */
export function NotificationActions({
  notification,
  teamId,
}: NotificationActionsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { mutate: markAsReadMutation } = useMarkAsRead()
  const [pendingAction, setPendingAction] = useState<InvitationAction | null>(null)
  const [localStatus, setLocalStatus] = useState<InvitationState | null>(null)

  // Derive invitation state from metadata or local state
  const invitationState = localStatus ?? deriveInvitationState(notification)
  const invitationId = notification.metadata.invitation_id

  const disabled =
    invitationState.status !== 'pending' ||
    pendingAction !== null ||
    !teamId ||
    !invitationId

  const disabledReason = invitationState.disabledReason

  const shouldShowMessage =
    invitationState.status === 'accepted' ||
    invitationState.status === 'declined' ||
    invitationState.status === 'expired' ||
    invitationState.status === 'cancelled'

  const respondedTimestamp = invitationState.respondedAt
    ? formatTimestamp(invitationState.respondedAt)
    : null

  const handleRespond = async (action: InvitationAction) => {
    if (!teamId || !invitationId || pendingAction) {
      return
    }

    try {
      setPendingAction(action)

      // Determine the API endpoint based on notification type
      const isProjectInvitation = notification.type === 'project_invitation'
      const endpoint = isProjectInvitation
        ? `/api/invite/project/${invitationId}`
        : `/api/teams/invitations/by-id/${invitationId}/${action}`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to ${action} invitation`)
      }

      // Parse response for redirect info
      const responseData = await response.json().catch(() => ({}))

      // Update local state
      setLocalStatus({
        status: action === 'accept' ? 'accepted' : 'declined',
        respondedAt: new Date().toISOString(),
        message:
          action === 'accept'
            ? 'You accepted this invitation'
            : 'You declined this invitation',
      })

      // Show success toast
      toast.success(
        action === 'accept'
          ? 'Invitation accepted!'
          : 'Invitation declined'
      )

      // Mark notification as read and invalidate cache
      markAsReadMutation(notification.id)
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })

      // Navigate to the project/team if accepted
      if (action === 'accept') {
        // For team invitations, switch team context first then redirect to projects
        if (!isProjectInvitation && responseData.teamId) {
          await fetch(`/api/teams/${responseData.teamId}/switch`, {
            method: 'POST',
            credentials: 'include',
          })
          router.push('/projects')
        } else if (notification.metadata.target_url) {
          router.push(notification.metadata.target_url)
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} invitation:`, error)
      
      // Check if this is a "no longer active" type error
      const errorMessage = error instanceof Error ? error.message : ''
      const isInactiveError = 
        errorMessage.includes('cancelled') || 
        errorMessage.includes('expired') ||
        errorMessage.includes('already been used') ||
        errorMessage.includes('no longer active')

      if (isInactiveError) {
        // Mark notification as no longer actionable
        setLocalStatus({
          status: 'expired',
          message: 'This invitation is no longer active. Check for a newer invitation.',
        })
        toast.error('This invitation is no longer active')
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to ${action} invitation`
        )
      }
    } finally {
      setPendingAction(null)
    }
  }

  // Show status badge for responded invitations
  if (shouldShowMessage) {
    return (
      <div className="mt-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <Badge
          variant={
            invitationState.status === 'accepted'
              ? 'default'
              : invitationState.status === 'declined'
                ? 'destructive'
                : 'secondary'
          }
          className="w-fit"
        >
          {invitationState.message}
        </Badge>
        {respondedTimestamp && (
          <span className="text-xs text-muted-foreground">
            {respondedTimestamp}
          </span>
        )}
      </div>
    )
  }

  // Render action buttons
  const buttons = (
    <div 
      className="mt-2 flex w-full flex-wrap gap-2" 
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="default"
        size="sm"
        className="gap-2 min-h-[44px] min-w-[80px]"
        disabled={disabled}
        onClick={() => handleRespond('accept')}
      >
        {pendingAction === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />}
        Accept
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'gap-2 min-h-[44px] min-w-[80px]',
          pendingAction === 'decline' && 'border-destructive text-destructive'
        )}
        disabled={disabled}
        onClick={() => handleRespond('decline')}
      >
        {pendingAction === 'decline' && <Loader2 className="h-4 w-4 animate-spin" />}
        Decline
      </Button>
    </div>
  )

  // Wrap with tooltip if there's a disabled reason
  if (disabledReason && disabled) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{buttons}</TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">{disabledReason}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttons
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive invitation state from notification metadata
 */
function deriveInvitationState(notification: Notification): InvitationState {
  // If notification has been read, treat as already responded
  // (invitation notifications are only marked read after accept/decline)
  if (notification.readAt) {
    return {
      status: 'accepted', // Generic "responded" status
      message: 'You responded to this invitation',
      disabledReason: undefined,
    }
  }

  // Otherwise, invitation is still pending
  return {
    status: 'pending',
    message: undefined,
    disabledReason: undefined,
  }
}
