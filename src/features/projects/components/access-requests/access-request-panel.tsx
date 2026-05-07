'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { AccessRequest } from '@/features/projects/api'
import { useCreateAccessRequest, useCancelAccessRequest, useMyAccessRequest } from '@/features/projects/hooks'

interface Props {
  projectId: string
  projectName: string
  teamName: string
  existingRequest: AccessRequest | null
}

function isCooldownActive(existingRequest: AccessRequest): boolean {
  if (existingRequest.status !== 'declined') return false
  if (!existingRequest.declineCooldownUntil) return false
  return new Date(existingRequest.declineCooldownUntil) > new Date()
}

function formatCooldownDate(declineCooldownUntil: string): string {
  return new Date(declineCooldownUntil).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function AccessRequestPanel({ projectId, projectName, teamName, existingRequest }: Props) {
  const [message, setMessage] = useState('')

  const { data: currentRequest } = useMyAccessRequest(projectId, existingRequest)
  const create = useCreateAccessRequest()
  const cancel = useCancelAccessRequest()

  if (currentRequest?.status === 'pending') {
    return (
      <Card className='max-w-xl mx-auto'>
        <CardHeader>
          <CardTitle>Request pending</CardTitle>
          <CardDescription>
            We&apos;ll email you when your request to join <strong>{projectName}</strong> has been reviewed.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant='ghost'
            size='sm'
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ projectId, requestId: currentRequest.id })}
          >
            {cancel.isPending ? 'Cancelling...' : 'Cancel request'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (currentRequest?.status === 'declined' && isCooldownActive(currentRequest)) {
    return (
      <Card className='max-w-xl mx-auto'>
        <CardHeader>
          <CardTitle>Request not approved</CardTitle>
          <CardDescription>
            You can request access to <strong>{projectName}</strong> again on{' '}
            {formatCooldownDate(currentRequest.declineCooldownUntil!)}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // form: no request, cancelled, superseded, or declined without active cooldown
  return (
    <Card className='max-w-xl mx-auto'>
      <CardHeader>
        <CardTitle>Request access to {projectName}</CardTitle>
        <CardDescription>
          Send a request to the <strong>{teamName}</strong> team to join this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder='Add a note (optional)'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </CardContent>
      <CardFooter>
        <Button
          disabled={create.isPending}
          onClick={() =>
            create.mutate({
              projectId,
              body: { message: message.trim() || undefined },
            })
          }
        >
          {create.isPending ? 'Sending...' : 'Request access'}
        </Button>
      </CardFooter>
    </Card>
  )
}
