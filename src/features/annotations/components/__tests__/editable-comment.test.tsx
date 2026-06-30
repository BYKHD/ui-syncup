/**
 * @vitest-environment jsdom
 */

/**
 * Tests for EditableComment — the comment row shared by the thread panel and
 * the popover. Edit/delete are driven from the ⋯ actions menu. Locks the
 * author gate (non-owners get no actions menu), the save-guard (trim + skip
 * unchanged), and delete.
 *
 * @module features/annotations/components/__tests__/editable-comment.test
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableComment, type EditableCommentProps } from '../editable-comment';
import type { AnnotationComment } from '../../types';

// Radix DropdownMenu relies on these in jsdom.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

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

// Open the ⋯ actions menu and click the named item.
async function openMenuAndClick(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name: /comment actions/i }));
  await user.click(await screen.findByRole('menuitem', { name }));
}

describe('EditableComment', () => {
  it('shows no actions menu for non-owners', () => {
    renderItem({ canModify: false });
    expect(screen.queryByRole('button', { name: /comment actions/i })).toBeNull();
  });

  it('enters edit mode from the actions menu', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderItem();
    await openMenuAndClick(user, /edit/i);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('saves a trimmed, changed value', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onEdit } = renderItem();

    await openMenuAndClick(user, /edit/i);
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '  updated  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('c1', 'updated');
  });

  it('does not call onEdit when the value is unchanged', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onEdit } = renderItem();

    await openMenuAndClick(user, /edit/i);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('deletes via the actions menu', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onDelete } = renderItem();

    await openMenuAndClick(user, /delete/i);

    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
