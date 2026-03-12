export function formatLastActivity(updatedAt: string): string {
  const date = new Date(updatedAt)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Updated just now'
  if (diffInHours < 24) return `Updated ${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `Updated ${diffInDays}d ago`

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `Updated ${diffInWeeks}w ago`

  return `Updated ${date.toLocaleDateString()}`
}
