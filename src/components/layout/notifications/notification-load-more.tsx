'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// ============================================================================
// NOTIFICATION LOAD MORE COMPONENT (MOCKUP UI)
// ============================================================================

interface NotificationLoadMoreProps {
  hasMore: boolean
  isLoading?: boolean
  onLoadMore: () => void
  className?: string
  disabled?: boolean
}

/**
 * NotificationLoadMore - Load more button for notification pagination
 *
 * Already mockup-ready - just a presentational component.
 */
export function NotificationLoadMore({
  hasMore,
  isLoading = false,
  onLoadMore,
  className,
  disabled = false,
}: NotificationLoadMoreProps) {
  if (!hasMore) {
    return null
  }

  return (
    <div className={cn('border-t p-3 flex justify-center bg-background', className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading || disabled}
        onClick={onLoadMore}
        className="gap-2 min-h-[44px] px-4"
        aria-disabled={isLoading || disabled}
      >
        {isLoading && <Spinner />}
        {isLoading ? 'Loading more' : 'Load more'}
      </Button>
    </div>
  )
}
