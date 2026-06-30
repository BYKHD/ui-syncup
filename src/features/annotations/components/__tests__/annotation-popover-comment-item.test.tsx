/**
 * @vitest-environment jsdom
 */

/**
 * Tests for the popover's CommentItem — desktop-only comment edit/delete.
 * Locks the author gate (non-owners get no edit/delete affordance) and the
 * save-guard (trims, skips unchanged).
 *
 * @module features/annotations/components/__tests__/annotation-popover-comment-item.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentItem } from '../annotation-popover';
import type { AnnotationComment } from '../../types';

const COMMENT: AnnotationComment = {
  id: 'c1',
  annotationId: 'a1',
  author: { id: 'user_1', name: 'Alice' },
  message: 'original',
  createdAt: '2024-01-01T00:00:00Z',
};

function renderItem(overrides: Partial<React.ComponentProps<typeof CommentItem>> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <CommentItem
      comment={COMMENT}
      isOwn
      onEdit={onEdit}
      onDelete={onDelete}
      isUpdating={false}
      isDeleting={false}
      {...overrides}
    />
  );
  return { onEdit, onDelete };
}

describe('popover CommentItem', () => {
  it('shows no edit/delete affordance for non-owners', () => {
    renderItem({ isOwn: false });
    expect(screen.queryByRole('button', { name: /edit comment/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete comment/i })).toBeNull();
  });

  it('edits with a trimmed, changed value', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.click(screen.getByRole('button', { name: /edit comment/i }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '  updated  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('c1', 'updated');
  });

  it('does not call onEdit when the value is unchanged', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.click(screen.getByRole('button', { name: /edit comment/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('deletes via the delete affordance', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderItem();

    await user.click(screen.getByRole('button', { name: /delete comment/i }));

    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
