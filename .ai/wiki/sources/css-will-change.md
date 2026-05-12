---
title: CSS will-change — When and How to Use It
type: source
tags: [css, performance, animation]
last_updated: 2026-05-11
sources: []
feeds_into: [concepts/css-will-change]
---

# CSS `will-change` — When and How to Use It

**Origin:** https://jakub.kr/components/will-change-in-css

## Summary

`will-change` hints to the browser that an element is about to be animated, letting it pre-promote the element to its own compositor layer. This eliminates the jank visible on the *first frame* of an animation — but it permanently holds GPU memory for as long as the property is set, so careless use is wasteful.

## Key facts

- **Use only for observed problems.** Browser heuristics are already good; `will-change` is for residual cases profiling confirms are layer-promotion delays.
- **Good signal:** animation stutters/judders on first frame; complex elements (heavy `filter`, layered shadows, large `transform`) jank repeatedly; Safari hover interactions flicker.
- **Bad signal:** adding it "just in case", one-time animations (page load, one-off modal), before profiling.
- **Layout properties are a dead end.** Animating `width`, `height`, `top`, `left` triggers layout — `will-change` cannot prevent that cost. Fix: switch to `transform`/`opacity`.
- **Dynamic add/remove pattern:** apply right before the animation starts, remove after it ends to release the GPU layer.

```js
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform'
})
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'  // release the layer
})
```

- **Mental test:** "Would I notice this without `will-change`?" If not, leave it out.
