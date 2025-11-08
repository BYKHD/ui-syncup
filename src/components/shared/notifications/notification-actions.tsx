'use client'

import { useEffect, useMemo, useState } from 'react'

import { Loader2 } from 'lucide-react'

import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@components/ui/tooltip'
import type { Notification } from './mock-data'
import { formatTimestamp } from './utils'
import { cn } from '@lib/utils'

// ============================================================================
// NOTIFICATION ACTIONS COMPONENT (MOCKUP UI)
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
 * Derive invitation state from notification metadata
 */
function deriveInvitationState(notification: Notification): InvitationState {
  const metadata = (notification.metadata ??
    {}) as Record<string, unknown>

  const explicitStatus = metadata.invitationStatus as
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | undefined

  let status: InvitationState['status'] = explicitStatus ?? 'pending'

  if (metadata.projectDeleted === true) {
    status = 'cancelled'
  }
  if (metadata.invitationCancelled === true) {
    status = 'cancelled'
  }
  if (metadata.invitationExpired === true) {
    status = 'expired'
  }

  const acceptedAt = metadata.acceptedAt as string | undefined
  const declinedAt = metadata.declinedAt as string | undefined
  const respondedAt = metadata.respondedAt as string | undefined

  let message: string | undefined

  if (status === 'accepted') {
    message = 'You accepted this invitation'
  } else if (status === 'declined') {
    message = 'You declined this invitation'
  } else if (status === 'expired') {
    message = 'This invitation has expired'
  } else if (status === 'cancelled') {
    message = 'This invitation is no longer available'
  }

  const disabledReason =
    status === 'expired'
      ? 'Invitation expired'
      : status === 'cancelled'
        ? 'Invitation cancelled or project removed'
        : undefined

  return {
    status,
    respondedAt:
      status === 'accepted'
        ? acceptedAt ?? respondedAt
        : status === 'declined'
          ? declinedAt ?? respondedAt
          : respondedAt,
    message,
    disabledReason,
  }
}

/**
 * NotificationActions - Accept/Decline buttons for invitation notifications
 *
 * Mockup version with console.log instead of API calls.
 */
export function NotificationActions({
  notification,
  teamId,
}: NotificationActionsProps) {
  const memberRole = 'member' // Mockup: always member role
  const [pendingAction, setPendingAction] = useState<InvitationAction | null>(
    null
  )
  const [optimisticStatus, setOptimisticStatus] = useState<
    InvitationState | undefined
  >(undefined)

  const invitationState = useMemo(() => {
    if (optimisticStatus) {
      return optimisticStatus
    }
    return deriveInvitationState(notification)
  }, [notification, optimisticStatus])

  useEffect(() => {
    setOptimisticStatus(undefined)
  }, [notification.metadata, notification.readAt])

  const viewerRestricted = memberRole === 'viewer' && invitationState.status === 'pending'

  const disabled =
    invitationState.status === 'accepted' ||
    invitationState.status === 'declined' ||
    invitationState.status === 'expired' ||
    invitationState.status === 'cancelled' ||
    pendingAction !== null ||
    !teamId ||
    viewerRestricted

  const disabledReason = viewerRestricted
    ? 'Viewers cannot respond to invitations'
    : invitationState.disabledReason

  const shouldShowMessage =
    invitationState.status === 'accepted' ||
    invitationState.status === 'declined' ||
    invitationState.status === 'expired' ||
    invitationState.status === 'cancelled'

  const respondedTimestamp = invitationState.respondedAt
    ? formatTimestamp(invitationState.respondedAt)
    : null

  const handleRespond = async (action: InvitationAction) => {
    if (!teamId || pendingAction) {
      return
    }
    try {
      setPendingAction(action)
      console.log(`Respond to invitation (mockup): ${action}`, notification.id)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      setOptimisticStatus({
        status: action === 'accept' ? 'accepted' : 'declined',
        respondedAt: new Date().toISOString(),
        message:
          action === 'accept'
            ? 'You accepted this invitation'
            : 'You declined this invitation',
      })
    } catch (error) {
      console.error('Failed to respond to invitation', error)
    } finally {
      setPendingAction(null)
    }
  }

  if (shouldShowMessage) {
    return (
      <div className="mt-2 flex flex-col gap-1">
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

  const buttons = (
    <div className="mt-2 flex w-full flex-wrap gap-2">
      <Button
        variant="default"
        size="sm"
        className="gap-2"
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
          'gap-2',
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

  if (!disabledReason || (disabledReason && !disabled)) {
    return buttons
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{buttons}</TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">
            {disabledReason}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
