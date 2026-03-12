import type { AttachmentAnnotation, AnnotationShape } from '@/features/annotations/types';

export const COMMENT_INPUT_WIDTH = 320; // 80 * 4 = 320px (w-80)
export const COMMENT_INPUT_HEIGHT = 200; // Approximate height
export const PADDING = 16; // Padding from edges

interface ContainerDimensions {
  width: number;
  height: number;
}

// Accept any object that has a shape property
interface AnnotationLike {
  shape?: AnnotationShape;
}

/**
 * Calculates the optimal position for the comment input popover based on annotation location
 * and available space in the viewport. Prioritizes placement: Right > Left > Bottom > Top
 *
 * @param annotation - The annotation to position the comment input near (must have a shape property)
 * @param container - The container dimensions (viewport or overlay bounds)
 * @returns Optimal { x, y } pixel coordinates for absolute positioning
 */
export function calculateCommentInputPosition(
  annotation: AnnotationLike,
  container: ContainerDimensions,
): { x: number; y: number } {
  if (!annotation.shape) {
    // Fallback for annotations without shape data
    return {
      x: Math.max(PADDING, (container.width - COMMENT_INPUT_WIDTH) / 2),
      y: Math.max(PADDING, (container.height - COMMENT_INPUT_HEIGHT) / 2),
    };
  }

  if (annotation.shape.type === 'box') {
    const { start, end } = annotation.shape;

    // Calculate box bounds in pixels
    const x1 = Math.min(start.x, end.x) * container.width;
    const y1 = Math.min(start.y, end.y) * container.height;
    const x2 = Math.max(start.x, end.x) * container.width;
    const y2 = Math.max(start.y, end.y) * container.height;

    // Clamp box bounds to visible area for space calculation
    const visibleX1 = Math.max(0, Math.min(container.width, x1));
    const visibleY1 = Math.max(0, Math.min(container.height, y1));
    const visibleX2 = Math.max(0, Math.min(container.width, x2));
    const visibleY2 = Math.max(0, Math.min(container.height, y2));

    // Available space in each direction (from visible portion of box)
    const spaceRight = container.width - visibleX2;
    const spaceLeft = visibleX1;
    const spaceBottom = container.height - visibleY2;
    const spaceTop = visibleY1;

    // Priority: Right > Left > Bottom > Top
    if (spaceRight >= COMMENT_INPUT_WIDTH + PADDING) {
      // Position to the right
      const x = visibleX2 + PADDING;
      const y = Math.max(PADDING, Math.min(visibleY1, container.height - COMMENT_INPUT_HEIGHT - PADDING));
      return { x, y };
    } else if (spaceLeft >= COMMENT_INPUT_WIDTH + PADDING) {
      // Position to the left
      const x = visibleX1 - COMMENT_INPUT_WIDTH - PADDING;
      const y = Math.max(PADDING, Math.min(visibleY1, container.height - COMMENT_INPUT_HEIGHT - PADDING));
      return { x, y };
    } else if (spaceBottom >= COMMENT_INPUT_HEIGHT + PADDING) {
      // Position below
      const x = Math.max(PADDING, Math.min(visibleX1, container.width - COMMENT_INPUT_WIDTH - PADDING));
      const y = visibleY2 + PADDING;
      return { x, y };
    } else if (spaceTop >= COMMENT_INPUT_HEIGHT + PADDING) {
      // Position above
      const x = Math.max(PADDING, Math.min(visibleX1, container.width - COMMENT_INPUT_WIDTH - PADDING));
      const y = visibleY1 - COMMENT_INPUT_HEIGHT - PADDING;
      return { x, y };
    } else {
      // Fallback: center on screen
      const x = Math.max(PADDING, (container.width - COMMENT_INPUT_WIDTH) / 2);
      const y = Math.max(PADDING, (container.height - COMMENT_INPUT_HEIGHT) / 2);
      return { x, y };
    }
  } else if (annotation.shape.type === 'pin') {
    const { position } = annotation.shape;

    // Calculate pin position in pixels
    const pinX = position.x * container.width;
    const pinY = position.y * container.height;

    // Pin size (approx 36px = 9 * 4)
    const pinSize = 36;
    const pinRadius = pinSize / 2;

    // Available space in each direction from pin
    const spaceRight = container.width - pinX;
    const spaceLeft = pinX;
    const spaceBottom = container.height - pinY;
    const spaceTop = pinY;

    // Priority: Right > Left > Bottom > Top
    if (spaceRight >= COMMENT_INPUT_WIDTH + pinRadius + PADDING * 2) {
      // Position to the right
      const x = pinX + pinRadius + PADDING;
      const y = Math.max(PADDING, Math.min(pinY - COMMENT_INPUT_HEIGHT / 2, container.height - COMMENT_INPUT_HEIGHT - PADDING));
      return { x, y };
    } else if (spaceLeft >= COMMENT_INPUT_WIDTH + pinRadius + PADDING * 2) {
      // Position to the left
      const x = pinX - pinRadius - COMMENT_INPUT_WIDTH - PADDING;
      const y = Math.max(PADDING, Math.min(pinY - COMMENT_INPUT_HEIGHT / 2, container.height - COMMENT_INPUT_HEIGHT - PADDING));
      return { x, y };
    } else if (spaceBottom >= COMMENT_INPUT_HEIGHT + pinRadius + PADDING * 2) {
      // Position below
      const x = Math.max(PADDING, Math.min(pinX - COMMENT_INPUT_WIDTH / 2, container.width - COMMENT_INPUT_WIDTH - PADDING));
      const y = pinY + pinRadius + PADDING;
      return { x, y };
    } else if (spaceTop >= COMMENT_INPUT_HEIGHT + pinRadius + PADDING * 2) {
      // Position above
      const x = Math.max(PADDING, Math.min(pinX - COMMENT_INPUT_WIDTH / 2, container.width - COMMENT_INPUT_WIDTH - PADDING));
      const y = pinY - pinRadius - COMMENT_INPUT_HEIGHT - PADDING;
      return { x, y };
    } else {
      // Fallback: center on screen
      const x = Math.max(PADDING, (container.width - COMMENT_INPUT_WIDTH) / 2);
      const y = Math.max(PADDING, (container.height - COMMENT_INPUT_HEIGHT) / 2);
      return { x, y };
    }
  }

  // Fallback for unknown shape types
  return {
    x: Math.max(PADDING, (container.width - COMMENT_INPUT_WIDTH) / 2),
    y: Math.max(PADDING, (container.height - COMMENT_INPUT_HEIGHT) / 2),
  };
}
