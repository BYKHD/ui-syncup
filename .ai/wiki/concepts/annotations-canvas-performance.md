---
title: Annotations canvas performance
type: concept
tags: [annotations, performance, canvas, animation, motion]
last_updated: 2026-06-15
sources: [sources/css-will-change]
---

# Annotations canvas performance

How to keep the annotation canvas at 60fps while **editing** (drag/draw) and **viewing** (zoom/pan). Companion to [[concepts/css-will-change]]; applies to [[features/annotations]] and the shared viewer `src/features/issues/components/centered-canvas-view.tsx`.

## The three frame-budget rules

1. **Animate `transform`, never layout props.** Driving `left/top/width/height` per pointer/zoom frame forces layout + paint. Use `transform: translate`/`scale` (GPU-composited) — see [[concepts/css-will-change]].
2. **Never read layout in a per-event handler.** `getBoundingClientRect()` forces a synchronous reflow. Cache the overlay rect once at `pointerdown` (it can't resize mid-gesture) and reuse it for every move; clear on `pointerup`.
3. **At most one state update per frame.** Pointer/wheel events fire faster than the display refreshes. Either coalesce `setState` with `requestAnimationFrame` (latest-value ref, not skip-and-drop), or — better — drive the visual via framer-motion **motion values**, which write straight to the compositor with zero React renders.

## Patterns in use

- **Pin/box drag** (`annotation-pin.tsx`, `annotation-box.tsx`): box whole-move uses motion values (`x/y`); box resize keeps width/height but rAF-coalesced (a `scale` would distort the 2px border and round handles); pin uses the conservative rect-cache + rAF path to keep its render byte-identical. Committed coords (`onMoveComplete`, normalized 0–1) are unchanged — the optimisation is render-only.
- **Draw** (`annotation-canvas.tsx`): the live draft preview is local to the canvas. Do **not** push per-move draft state up to the parent — it re-renders the whole overlay for nothing. Keep only `onDraftCommit`.
- **Zoom** (`centered-canvas-view.tsx`): pan was already GPU (motion values); zoom now matches via a **transient `scale` motion value** composed with pan, committing `canvasState.zoom` ~120ms after the gesture ends (commit value == old per-event math). The image stays sized at the committed zoom (crisp at rest); only the gesture is a transform.
  - **Fixed-size pins under a scaled canvas:** pins live inside the scaled layer, so they counter-scale by `1/transientScale`. The live scale is threaded via `annotation-scale-context.tsx` (`CanvasScaleProvider` provided by the viewer, `useCanvasTransientScale` consumed by pins; default `MotionValue(1)` so components work with no provider). Counter-scale cancels the **transient** scale only — committed zoom is baked into the overlay's pixel size, so pins are already fixed-size at rest.
  - **Compare mode** (linked panes, signalled by `hideZoomControls`) stays on the old per-event commit so both panes zoom in lockstep.
  - **Touch pinch** reuses the same transient-scale model: a 2-finger gesture drives `transientScale` + pan on the compositor and commits `canvasState.zoom` on `touchend` (no debounce needed — touch has a native gesture-end, unlike wheel). Compare mode keeps the per-event commit. Crucially, the document `touchmove`/`touchend`/`touchcancel` listeners are attached while a drag **or** pinch is active (tracked by an `isPinching` state), not gated on `isDragging` alone — see [[#Fixed]].

- **Memoization + callback stability**: `AnnotationPin`/`AnnotationBox` are `React.memo`'d so an unrelated parent render (selection, hover, post-commit) re-renders only the changed markers, not all N. This holds ONLY if every callback prop is referentially stable — stabilize hook-returned callbacks with `useCallback`, and for handlers that read frequently-changing values (annotations, permissions, the popover's `isDragging`) read them through a ref synced each render rather than listing them as deps. `React.memo` on a generic component erases the generic; re-export with `memo(Inner) as typeof Inner`.

## Gotchas

> [!warning] **framer-motion owns `transform`.** A `motion.*` element that animates any transform key (`x`, `y`, `scale`, …) writes inline `transform`, which **overrides** Tailwind transform utilities like `-translate-x-1/2 -translate-y-1/2`. The pin relies on those classes for centering, so once its entrance animation settles it likely renders ~12px off-centre (anchored top-left, not centre). Change this only deliberately (a `transformTemplate` re-adding the centering, or an outer non-framer wrapper) because it shifts every existing pin. To add a transform to such an element without disturbing it, wrap it in a separate scaling element — but note a transformed wrapper becomes the containing block for `position:absolute` children, so anchor the *wrapper* (`left/top` %) and set the child to `left:0;top:0`.

## Known issues (pre-existing, not yet fixed)

- **~12px pin centering offset** (the framer gotcha above).

## Fixed

- **Touch pinch-to-zoom** (2026-06-15): `touchmove`/`touchend` were attached to `document` only while `isDragging`, but a 2-finger touch sets `isDragging=false` (and a 1→2-finger transition detaches them), so the pinch branch of `handleTouchMove` never ran — pinch silently did nothing on touchscreens. Desktop / Mac-trackpad zoom was always fine (arrives as `ctrl+wheel`, handled by `handleWheel`). Fix: gate the touch listeners on `isDragging || isPinching` (new `isPinching` state, also adds `touchcancel`), and route the pinch through the transient-scale path — drive `transientScale`+pan during the gesture, commit `canvasState.zoom` on `touchend` (compare mode keeps its per-event commit). Note: this had to be a native non-passive listener — React registers `onTouchMove` as **passive**, so the handler's `event.preventDefault()` (blocks native browser pinch) would no-op as a JSX prop.

## Safety invariant

These are render-only optimisations. The **persisted** state must not change: annotation coordinates are normalized `(0–1)` and scale-invariant; `CanvasViewState` (zoom/pan) is never persisted and its committed values equal the prior per-event math.
