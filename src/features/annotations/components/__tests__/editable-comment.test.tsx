/**
 * @vitest-environment jsdom
 */

/**
 * Tests for EditableComment — the comment row shared by the thread panel and
 * the popover. Locks the author gate (non-owners get no edit/delete and no
 * click-to-edit), the save-guard (trim + skip unchanged), and delete.
 *
 * @module features/annotations/components/__tests__/editable-comment.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableComment, type EditableCommentProps } from '../editable-comment';
import type { AnnotationComment } from '../../types';

const COMMENT: AnnotationComment = {
  id: 'c1',
  annotationId: 'a1',
  author: { id: 'user_1', name: 'Alice' },
  message: 'original',
  createdAt: '2024-01-01T00:00:00Z',
};

function renderItem(overrides: Partial<EditableCommentProps> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <EditableComment
      comment={COMMENT}
      canModify
      onEdit={onEdit}
      onDelete={onDelete}
      isUpdating={false}
      isDeleting={false}
      {...overrides}
    />
  );
  return { onEdit, onDelete };
}

describe('EditableComment', () => {
  it('shows no edit/delete affordance and is not click-to-edit for non-owners', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem({ canModify: false });
    expect(screen.queryByRole('button', { name: /edit comment/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete comment/i })).toBeNull();

    await user.click(screen.getByText('original'));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('enters edit mode by clicking the message', async () => {
    const user = userEvent.setup();
    renderItem();
    await user.click(screen.getByText('original'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('saves a trimmed, changed value', async () => {
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
