/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AnnotationBox stacking. The hit area of a box is its whole
 * interior, so overlapping boxes rely on z-index (smaller area → higher z)
 * to keep a small box clickable under a bigger one. Locks that ordering and
 * the active-box-on-top override.
 *
 * @module features/annotations/components/__tests__/annotation-box.test
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { AnnotationBox, type BoxAnnotation } from '../annotation-box';

// useIsMobile and motion's useReducedMotion need matchMedia, absent in jsdom.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
});

const BIG: BoxAnnotation = {
  id: 'big',
  label: '1',
  start: { x: 0, y: 0 },
  end: { x: 0.8, y: 0.8 },
};

const SMALL: BoxAnnotation = {
  id: 'small',
  label: '2',
  start: { x: 0.1, y: 0.1 },
  end: { x: 0.2, y: 0.2 },
};

function renderBoxes(props: { activeAnnotationId?: string } = {}) {
  const overlayRef = createRef<HTMLDivElement>();
  const { container } = render(
    <div ref={overlayRef}>
      <AnnotationBox
        annotation={SMALL}
        overlayRef={overlayRef}
        isActive={props.activeAnnotationId === SMALL.id}
      />
      <AnnotationBox
        annotation={BIG}
        overlayRef={overlayRef}
        isActive={props.activeAnnotationId === BIG.id}
      />
    </div>,
  );
  const zIndexOf = (id: string) =>
    Number(
      (container.querySelector(`[data-annotation-id="${id}"]`) as HTMLElement)
        .style.zIndex,
    );
  return { zIndexOf };
}

describe('AnnotationBox stacking', () => {
  it('stacks a smaller box above a bigger one even when the big box renders later', () => {
    const { zIndexOf } = renderBoxes();
    expect(zIndexOf('small')).toBeGreaterThan(zIndexOf('big'));
  });

  it('stacks the active box above everything', () => {
    const { zIndexOf } = renderBoxes({ activeAnnotationId: 'big' });
    expect(zIndexOf('big')).toBe(2000);
    expect(zIndexOf('big')).toBeGreaterThan(zIndexOf('small'));
  });
});
