import Link from 'next/link'
import { RiCheckboxCircleFill } from '@remixicon/react'
import { Button } from '@/components/ui/button'

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <RiCheckboxCircleFill className="size-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">You&apos;re all caught up</p>
        <p className="text-sm text-muted-foreground">
          No issues are currently assigned to you.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/projects">Browse projects</Link>
      </Button>
    </div>
  )
}
