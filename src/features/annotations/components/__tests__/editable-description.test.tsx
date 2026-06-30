/**
 * @vitest-environment jsdom
 */

/**
 * Tests for EditableDescription — the click-to-edit description shared by the
 * annotation thread panel and the on-canvas popover. Locks the save-guard:
 * save only fires for a non-empty, changed value.
 *
 * @module features/annotations/components/__tests__/editable-description.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableDescription, type EditableDescriptionProps } from '../editable-description';

function renderWith(props: Partial<EditableDescriptionProps> = {}) {
  const onSave = vi.fn();
  render(
    <EditableDescription
      description="original"
      canEdit
      onSave={onSave}
      isSaving={false}
      {...props}
    />
  );
  return { onSave };
}

describe('EditableDescription', () => {
  it('stays read-only (no edit affordance) when canEdit is false', () => {
    renderWith({ canEdit: false });
    expect(screen.getByText('original')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit description/i })).toBeNull();
  });

  it('saves a trimmed, changed value', async () => {
    const user = userEvent.setup();
    const { onSave } = renderWith();

    await user.click(screen.getByRole('button', { name: /edit description/i }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '  updated text  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('updated text');
  });

  it('does not save when the value is unchanged', async () => {
    const user = userEvent.setup();
    const { onSave } = renderWith();

    await user.click(screen.getByRole('button', { name: /edit description/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
  });
});
