'use client'

import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { AccessRequestWithRequester } from '@/features/projects/api'
import { useApproveAccessRequest, useDeclineAccessRequest } from '@/features/projects/hooks'

export function AccessRequestRow({
  projectId,
  request,
}: {
  projectId: string
  request: AccessRequestWithRequester
}) {
  const approve = useApproveAccessRequest()
  const decline = useDeclineAccessRequest()

  const isPending = approve.isPending || decline.isPending
  const requested = formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })

  return (
    <div className='flex items-start gap-3 py-3 border-b last:border-b-0'>
      <Avatar>
        <AvatarImage src={request.requester.image ?? undefined} alt={request.requester.name} />
        <AvatarFallback>{request.requester.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='font-medium truncate'>{request.requester.name}</span>
          <span className='text-muted-foreground text-sm truncate'>{request.requester.email}</span>
        </div>
        <div className='text-xs text-muted-foreground'>Requested {requested}</div>
        {request.message ? <p className='text-sm mt-1 italic'>&quot;{request.message}&quot;</p> : null}
      </div>
      {request.status === 'pending' ? (
        <div className='flex items-center gap-2 shrink-0'>
          <Button
            variant='outline'
            size='sm'
            disabled={isPending}
            onClick={() => decline.mutate({ projectId, requestId: request.id })}
          >
            Decline
          </Button>
          <Button
            size='sm'
            disabled={isPending}
            onClick={() => approve.mutate({ projectId, requestId: request.id })}
          >
            Approve
          </Button>
        </div>
      ) : (
        <span className='text-sm text-muted-foreground capitalize shrink-0'>{request.status}</span>
      )}
    </div>
  )
}
