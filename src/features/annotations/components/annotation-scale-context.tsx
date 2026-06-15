'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { motionValue, type MotionValue } from 'motion/react';

/**
 * Live transient zoom multiplier for the canvas transform layer.
 *
 * During an active wheel/pinch gesture, CenteredCanvasView scales the transform
 * layer by `transientScale = liveZoom / committedZoom` on the GPU (no re-render).
 * Annotation pins/boxes live INSIDE that scaled layer, so they would grow/shrink
 * with it. They counter-scale by `1 / transientScale` to stay a constant on-screen
 * size (map-pin behavior).
 *
 * IMPORTANT: this is the TRANSIENT scale only, NOT the committed zoom. Committed
 * zoom is baked into the overlay's pixel SIZE (displaySize = imageDimensions *
 * committedZoom) and does not change a pin's intrinsic px size, so pins must only
 * cancel the transient transform.
 *
 * Default is a constant MotionValue(1) so consumers used without a provider
 * (standalone, tests, examples) render at normal size with no special-casing.
 */
const DEFAULT_TRANSIENT_SCALE: MotionValue<number> = motionValue(1);

export interface CanvasScaleContextValue {
  /** Transient transform-layer scale (liveZoom / committedZoom). 1 at rest. */
  transientScale: MotionValue<number>;
}

const CanvasScaleContext = createContext<CanvasScaleContextValue>({
  transientScale: DEFAULT_TRANSIENT_SCALE,
});

export interface CanvasScaleProviderProps {
  transientScale: MotionValue<number>;
  children: ReactNode;
}

export function CanvasScaleProvider({ transientScale, children }: CanvasScaleProviderProps) {
  return (
    <CanvasScaleContext.Provider value={{ transientScale }}>
      {children}
    </CanvasScaleContext.Provider>
  );
}

/** Read the live transient scale. Returns a constant MotionValue(1) with no provider. */
export function useCanvasTransientScale(): MotionValue<number> {
  return useContext(CanvasScaleContext).transientScale;
}
