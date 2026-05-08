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
import { useMarkAsRead, useDeleteNotification, notificationKeys } from '@/features/notifications/hooks'
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

const isAccessRequestType = (notification: Notification) =>
  notification.type === 'project_access_request_created'

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
  const { mutate: deleteNotificationMutation } = useDeleteNotification()
  const [pendingAction, setPendingAction] = useState<InvitationAction | null>(null)
  const [localStatus, setLocalStatus] = useState<InvitationState | null>(null)

  const isAccessRequest = isAccessRequestType(notification)

  // Derive invitation state from metadata or local state
  const invitationState = localStatus ?? deriveInvitationState(notification)
  const invitationId = notification.metadata.invitation_id
  const requestId = notification.metadata.request_id
  const projectId = notification.entityId

  const hasRequiredIds = isAccessRequest
    ? Boolean(projectId && requestId)
    : Boolean(teamId && invitationId)

  const disabled =
    invitationState.status !== 'pending' ||
    pendingAction !== null ||
    !hasRequiredIds

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
    if (!hasRequiredIds || pendingAction) {
      return
    }

    const noun = isAccessRequest ? 'request' : 'invitation'

    try {
      setPendingAction(action)

      // Determine the API endpoint based on notification type
      let endpoint: string
      if (isAccessRequest) {
        // Access request: action 'accept' maps to 'approve' on the server.
        const serverAction = action === 'accept' ? 'approve' : 'decline'
        endpoint = `/api/projects/${projectId}/access-requests/${requestId}/${serverAction}`
      } else if (notification.type === 'project_invitation') {
        endpoint = `/api/invite/project/by-id/${invitationId}/${action}`
      } else {
        endpoint = `/api/teams/invitations/by-id/${invitationId}/${action}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(
          errorData.error?.message || errorData.error || `Failed to ${action} ${noun}`
        ) as Error & { code?: string }
        error.code = errorData.error?.code
        throw error
      }

      // Parse response for redirect info
      const responseData = await response.json().catch(() => ({}))

      // Show success toast
      if (isAccessRequest) {
        toast.success(action === 'accept' ? 'Request approved!' : 'Request declined')
      } else {
        toast.success(action === 'accept' ? 'Invitation accepted!' : 'Invitation declined')
      }

      if (action === 'accept') {
        // Delete the notification so it clears from the inbox immediately.
        // useDeleteNotification handles optimistic removal + rollback on error.
        deleteNotificationMutation(notification.id, { wasUnread: !notification.readAt })
      } else {
        // Decline: keep the notification with a "declined" badge.
        setLocalStatus({
          status: 'declined',
          respondedAt: new Date().toISOString(),
          message: isAccessRequest
            ? 'You declined this request'
            : 'You declined this invitation',
        })
        markAsReadMutation(notification.id)
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      }

      // Navigate after accepting an invitation. Approvers acting on access
      // requests stay in their inbox (no navigation).
      if (action === 'accept' && !isAccessRequest) {
        const isProjectInvitation = notification.type === 'project_invitation'
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
      const errorMessage = error instanceof Error ? error.message : ''
      const errorCode = (error as { code?: string } | null)?.code

      if (isAccessRequest) {
        console.error(`Failed to ${action} access request:`, error)

        // Server-mapped error codes from /access-requests routes:
        // - INVALID_STATE (409): request is no longer pending
        // - NOT_FOUND (404): request_id doesn't resolve
        // - FORBIDDEN (403): caller lacks permission
        if (errorCode === 'INVALID_STATE') {
          setLocalStatus({
            status: 'expired',
            message: 'This request is no longer pending.',
          })
          toast.error('This request is no longer pending')
        } else if (errorCode === 'NOT_FOUND') {
          setLocalStatus({
            status: 'expired',
            message: 'This request no longer exists.',
          })
          toast.error('This request no longer exists')
        } else {
          toast.error(errorMessage || `Failed to ${action} request`)
        }
        return
      }

      // Handle "Already used" — invitation was already accepted (e.g. via join-team link).
      // The server's acceptInvitationById already deleted the notification from DB.
      // Optimistically remove it here so the UI clears instantly without waiting
      // for the cache invalidation round-trip.
      if (errorMessage.includes('already been used') || errorMessage.includes('already used')) {
        toast.info('You have already joined this team')
        deleteNotificationMutation(notification.id, { wasUnread: !notification.readAt })
        return
      }

      console.error(`Failed to ${action} invitation:`, error)

      // Check if this is a "no longer active" type error
      const isInactiveError =
        errorMessage.includes('cancelled') ||
        errorMessage.includes('expired') ||
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
        {isAccessRequest ? 'Approve' : 'Accept'}
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
 * Derive invitation state from notification metadata.
 * invitation_status is written by the server when the user accepts/declines,
 * so it survives refetches and page reloads.
 */
function deriveInvitationState(notification: Notification): InvitationState {
  const status = notification.metadata.invitation_status;
  if (status === 'accepted') {
    return { status: 'accepted', message: 'You accepted this invitation' };
  }
  if (status === 'declined') {
    return { status: 'declined', message: 'You declined this invitation' };
  }
  return { status: 'pending', message: undefined, disabledReason: undefined };
}
