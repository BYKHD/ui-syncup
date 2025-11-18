/**
 * USE JOIN PROJECT HOOK
 * Mock implementation for joining a project (visual mockup only)
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { joinProject } from '../api'

// ============================================================================
// MUTATION HOOK (MOCKUP VERSION - NO REACT QUERY)
// ============================================================================

interface UseJoinProjectOptions {
  onSuccess?: () => void
}

export function useJoinProject(options?: UseJoinProjectOptions) {
  const [isPending, setIsPending] = useState(false)

  const mutate = async (projectId: string) => {
    setIsPending(true)

    try {
      const data = await joinProject(projectId)

      // Show success message
      toast.success(data.message)

      // Call optional success callback
      options?.onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join project'
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  return {
    mutate,
    isPending,
  }
}
