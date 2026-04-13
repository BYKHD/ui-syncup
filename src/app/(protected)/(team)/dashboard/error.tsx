'use client'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-24 text-center lg:px-10">
      <p className="text-sm font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        {error.message ?? 'Failed to load your dashboard.'}
      </p>
      <Button size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
