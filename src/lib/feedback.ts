import { toast } from 'sonner'

type RetryHandler = () => Promise<void> | void

function formatStatusLabel(label?: string) {
  if (!label) {
    return 'Status updated'
  }

  return `Status set to ${label}`
}

export const issueFeedback = {
  statusChangeSuccess(label?: string) {
    toast.success(formatStatusLabel(label))
  },

  updateError(field: string, error: Error, retry?: RetryHandler) {
    const message = error.message || `Unable to update ${field}`
    toast.error(message, {
      action: retry
        ? {
            label: 'Retry',
            onClick: () => retry(),
          }
        : undefined,
    })
  },
}
