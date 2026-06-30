/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useAnnotationComments.updateDescription — the optimistic
 * annotation-description edit used by the thread panel header.
 *
 * @module features/annotations/hooks/__tests__/use-annotation-comments.update-description.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { AttachmentAnnotation } from '../../types';
import { annotationKeys } from '../use-annotation-integration';
import { useAnnotationComments } from '../use-annotation-comments';
import * as annotationsApi from '../../api/annotations-api';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../api/annotations-api', () => ({ updateAnnotation: vi.fn() }));

type UpdateResp = Awaited<ReturnType<typeof annotationsApi.updateAnnotation>>;

const ISSUE_ID = 'issue_1';
const ATTACHMENT_ID = 'attach_1';
const ANNOTATION_ID = 'ann_1';

function seedAnnotation(description: string): AttachmentAnnotation {
  return {
    id: ANNOTATION_ID,
    attachmentId: ATTACHMENT_ID,
    label: '1',
    description,
    x: 0,
    y: 0,
    author: { id: 'user_1', name: 'Alice' },
    createdAt: '2024-01-01T00:00:00Z',
    comments: [],
  };
}

function setup(initialDescription: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const queryKey = annotationKeys.list(ISSUE_ID, ATTACHMENT_ID);
  queryClient.setQueryData(queryKey, [seedAnnotation(initialDescription)]);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () =>
      useAnnotationComments({
        issueId: ISSUE_ID,
        attachmentId: ATTACHMENT_ID,
        annotationId: ANNOTATION_ID,
      }),
    { wrapper }
  );

  const readDescription = () =>
    queryClient.getQueryData<AttachmentAnnotation[]>(queryKey)?.[0]?.description;

  return { result, readDescription };
}

describe('useAnnotationComments — updateDescription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('optimistically patches the cached description and calls the API', async () => {
    vi.mocked(annotationsApi.updateAnnotation).mockResolvedValue(
      { annotation: {} } as unknown as UpdateResp
    );
    const { result, readDescription } = setup('original');

    await act(async () => {
      await result.current.updateDescription('updated');
    });

    expect(annotationsApi.updateAnnotation).toHaveBeenCalledWith(
      ISSUE_ID,
      ATTACHMENT_ID,
      ANNOTATION_ID,
      { description: 'updated' }
    );
    expect(readDescription()).toBe('updated');
  });

  it('rolls back the cached description when the API rejects', async () => {
    vi.mocked(annotationsApi.updateAnnotation).mockRejectedValue(new Error('boom'));
    const { result, readDescription } = setup('original');

    await act(async () => {
      await result.current.updateDescription('updated').catch(() => {});
    });

    await waitFor(() => expect(readDescription()).toBe('original'));
  });
});
