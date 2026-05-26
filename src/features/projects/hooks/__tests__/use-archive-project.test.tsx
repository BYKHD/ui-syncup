import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchiveProjectResponse } from '../../api/types'
import { archiveProject } from '../../api'
import { useArchiveProject } from '../use-archive-project'
import confetti from 'canvas-confetti'

const mocks = vi.hoisted(() => ({
  archiveProject: vi.fn(),
  confetti: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../../api', () => ({
  archiveProject: mocks.archiveProject,
}))

vi.mock('canvas-confetti', () => ({
  default: mocks.confetti,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

const archiveResponse: ArchiveProjectResponse = {
  project: {
    id: 'project-1',
    teamId: 'team-1',
    name: 'Launch Site',
    key: 'LS',
    slug: 'launch-site',
    description: null,
    icon: null,
    visibility: 'private',
    status: 'archived',
    createdAt: '2026-05-26T00:00:00.000Z',
    updatedAt: '2026-05-26T00:00:00.000Z',
  },
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

describe('useArchiveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.archiveProject.mockResolvedValue(archiveResponse)
  })

  it('delays the external success callback until confetti finishes', async () => {
    let finishConfetti: () => void = () => {}
    const confettiDone = new Promise<void>((resolve) => {
      finishConfetti = resolve
    })
    mocks.confetti.mockReturnValue(confettiDone)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useArchiveProject({ onSuccess }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({
        projectId: 'project-1',
        projectName: 'Launch Site',
      })
    })

    await waitFor(() => expect(confetti).toHaveBeenCalled())
    expect(archiveProject).toHaveBeenCalledWith('project-1')
    expect(onSuccess).not.toHaveBeenCalled()

    await act(async () => {
      finishConfetti()
      await confettiDone
    })

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(archiveResponse))
  })
})
