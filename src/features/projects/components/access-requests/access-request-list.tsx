'use client'

import { useProjectAccessRequests } from '@/features/projects/hooks'
import { AccessRequestRow } from './access-request-row'

export function AccessRequestList({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectAccessRequests(projectId)

  const pending = data.filter((r) => r.status === 'pending')

  if (isLoading || pending.length === 0) return null

  return (
    <section className='space-y-2'>
      <h3 className='text-sm font-semibold'>Access requests ({pending.length})</h3>
      <div className='rounded-md border bg-card px-3'>
        {pending.map((r) => (
          <AccessRequestRow key={r.id} projectId={projectId} request={r} />
        ))}
      </div>
    </section>
  )
}
