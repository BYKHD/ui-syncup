---
title: CSS will-change
type: concept
tags: [css, performance, animation]
last_updated: 2026-05-11
sources: [sources/css-will-change]
---

# CSS `will-change`

A CSS hint that tells the browser to pre-promote an element to its own compositor layer before an animation begins, eliminating first-frame jank caused by layer-promotion delay.

## When to reach for it

Use `will-change` only when **all three** are true [[sources/css-will-change]]:

1. You can see visible stuttering or juddering on the first animation frame.
2. Profiling (DevTools Performance / Layers panel) confirms the cause is layer-promotion delay, not layout thrashing or an overly heavy paint.
3. The animation runs repeatedly (hover cards, repeated transitions) — not just once on page load.

Good candidates: elements with heavy `filter`, layered `box-shadow`, or large `transform` that animate on user interaction.

## When not to use it

- **Preemptively** — the browser's own heuristics already handle common cases well.
- **One-time animations** (page load, a one-off modal opening) — the GPU memory cost outlives the benefit.
- **Before profiling** — 90 % of the time the real fix is rewriting the animation to avoid layout-triggering properties.
- **On layout-property animations** (`width`, `height`, `top`, `left`) — those trigger reflow; `will-change` cannot prevent that. Fix: switch to `transform`/`opacity` instead.

## Recommended pattern — dynamic add/remove

Add the hint immediately before the animation, remove it after, so the GPU layer is held only while needed:

```js
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform'
})
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'  // releases the promoted layer
})
```

Avoid setting `will-change` statically in CSS unless the element animates so frequently that repeated promotion/demotion is itself the bottleneck.

## Quick mental test

> "Would I notice this without `will-change`?"

If the animation looks fine, leave it out. If you're on a mid-range device and it stutters on hover — that's the moment.
