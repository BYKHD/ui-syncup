# Sidebar Layout Best Practices (Tailwind + React/Next.js + Tailwind)

A pragmatic guide for building resilient, accessible sidebar layouts. Opinionated toward Tailwind, shadcn/ui, and Next.js, but the principles apply broadly.

---

## TL;DR
- **One—and only one—scroll container** in the main content area.
- Use **CSS Grid** for the shell: `grid min-h-svh grid-cols-[auto_1fr]`.
- Put a **sticky header outside** the scroll container: `sticky top-0`.
- Add `min-w-0` to the main column to prevent horizontal overflow.
- Prefer **`min-h-svh`** (or `min-h-[100dvh]`) to avoid iOS toolbar jumpiness.
- Keep scrollbars stable: `[scrollbar-gutter:stable]`.
- Make the sidebar **collapsible on mobile**; use an **overlay drawer** pattern.
- Ship **keyboard + screen reader support** (skip link, focus management, aria attributes).
- Avoid **nested scroll regions** and unexpected horizontal scroll.

---

## Core Principles

1. **Single Scroller**
   - Only the content area should scroll: this prevents header/sidebar jitter, double scrollbars, and “lost” scroll positions.
   - Use `flex-1 overflow-auto` for the content pane, and **do not** add additional `overflow` on parents unless required.

2. **Robust Shell with Grid**
   - `grid min-h-svh grid-cols-[auto_1fr]` for a permanent sidebar.
   - `min-h-svh` (or `min-h-[100dvh]`) fills the viewport without iOS jumpiness.
   - `isolate` on the shell creates a new stacking context so z-index is predictable.

3. **Sticky Header That Actually Sticks**
   - Place the `<header>` **outside** of the scrolling `<div>`.
   - `sticky top-0 z-10` with a background + optional `backdrop-blur` to keep it legible.

4. **Horizontal Overflow Guard**
   - Apply `min-w-0` to the main column to allow long lines/child flex items to shrink instead of pushing a horizontal scrollbar.

5. **Accessible & Mobile-First**
   - Provide a **skip link** to jump to the main content.
   - On small screens, use an **overlay drawer** (e.g., shadcn/ui `Sheet`) for the sidebar.
   - Manage focus when opening/closing the sidebar; **trap focus** inside the drawer.

6. **Stable Scrollbars**
   - Add `[scrollbar-gutter:stable]` to the scroller to avoid layout shifts when the scrollbar appears/disappears.

---

## Reference Layout (Permanent Sidebar)

```tsx
// app/layout.tsx (Next.js / React)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Skip link for accessibility */}
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-primary text-primary-foreground px-3 py-2 rounded">
          Skip to content
        </a>

        {/* App shell */}
        <div className="grid min-h-svh grid-cols-[auto_1fr] isolate">
          <AppSidebar />

          {/* MAIN */}
          <main id="content" className="min-w-0 flex flex-col bg-background text-foreground">
            {/* Sticky header (outside scroller) */}
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <AppHeader />
            </header>

            {/* Single scroll container */}
            <div className="flex-1 overflow-auto p-3 md:p-4 [scrollbar-gutter:stable]">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
```

**Key classes:**  
- Shell: `grid min-h-svh grid-cols-[auto_1fr] isolate`  
- Main: `min-w-0 flex flex-col`  
- Header: `sticky top-0 z-10 ...`  
- Scroller: `flex-1 overflow-auto [scrollbar-gutter:stable]`  

---

## Mobile Pattern (Collapsible / Overlay Sidebar)

Use a permanent sidebar ≥ `md` and an overlay drawer < `md`.

```tsx
// Shell with responsive behavior
<div className="grid min-h-svh grid-cols-1 md:grid-cols-[auto_1fr] isolate">
  {/* Desktop permanent */}
  <aside className="hidden md:block">
    <AppSidebar />
  </aside>

  {/* Main */}
  <main className="min-w-0 flex flex-col">
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu button opens overlay drawer */}
      <SidebarToggle aria-controls="mobile-sidebar" aria-expanded={open} />
      <AppHeader />
    </header>

    <div className="flex-1 overflow-auto [scrollbar-gutter:stable]">
      {children}
    </div>
  </main>

  {/* Mobile overlay drawer (e.g., shadcn/ui Sheet) */}
  <MobileSidebarDrawer id="mobile-sidebar" open={open} onOpenChange={setOpen} />
</div>
```

**Notes:**
- On open, **trap focus** in the drawer, restore focus on close.
- Add `aria-controls` + `aria-expanded` on the toggle button.
- Prevent background scroll while drawer is open (shadcn `Sheet` already does this).

---

## Resizable Sidebar Variant

If you need a draggable resizer, prefer a **non-scrolling sidebar** with a resizer that updates a CSS custom property.

```tsx
<div
  style={{ gridTemplateColumns: "var(--sidebar, 280px) 1fr" }}
  className="grid min-h-svh isolate"
>
  <aside className="overflow-hidden">
    <AppSidebar />
  </aside>

  <main className="min-w-0 flex flex-col">
    <header className="sticky top-0 z-10 border-b bg-background">{/* ... */}</header>
    <div className="flex-1 overflow-auto [scrollbar-gutter:stable]">{children}</div>
  </main>

  <button
    aria-label="Resize sidebar"
    className="absolute left-[var(--sidebar)] top-0 h-full w-1 cursor-col-resize md:block hidden"
    onMouseDown={startDragging}
  />
</div>
```

- Persist the width in localStorage or user settings.
- Avoid making the **sidebar** scroll if you can; overflow on the **main** is safer.

---

## “Carded” Look Without Breaking Sticky Header

If you want borders/rounded corners around content, wrap **inside the scroller**, not around the whole main column:

```tsx
<div className="flex-1 overflow-auto [scrollbar-gutter:stable]">
  <div className="m-3 md:m-4 border rounded-md bg-background">
    {children}
  </div>
</div>
```

This keeps the header sticky and avoids double borders around it.

---

## Accessibility Essentials

- **Skip link** to main content (see example).
- **Keyboard support** for opening/closing the sidebar on mobile (Space/Enter).
- **Focus management**: focus first actionable in the sidebar when opened; restore focus to the toggle when closed.
- **ARIA**: `aria-expanded`, `aria-controls` on the toggle, and landmark roles (`<aside>`, `<main>`, `<header>`).
- **Reduced motion**: honor `prefers-reduced-motion` for animations.

---

## Responsive & Safe-Area Details

- Use tailwind breakpoints to switch from permanent to overlay: `md:block` / `md:grid-cols-[auto_1fr]`.
- For PWA/iOS safe areas, apply as needed:  
  `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]`.
- If you need dynamic viewport units, consider `min-h-[100dvh]` instead of `min-h-svh`.

---

## Performance Tips

- Avoid heavy box-shadows/filters on large scrolling containers (especially on low-end devices).
- Keep only **one** `overflow-auto` region to minimize paint work.
- Debounce expensive layout reads in resizable sidebars.

---

## Common Pitfalls (and Fixes)

- **Double scrollbars** — Remove extra `overflow-*` on wrappers; keep a single scroller (`flex-1 overflow-auto`).  
- **Header not sticking** — Ensure header is **outside** the scroll container; add `sticky top-0 z-10`.  
- **Horizontal overflow** — Add `min-w-0` to the main column; ensure children don’t set `w-[calc(100vw)]`.  
- **Janky viewport height on iOS** — Prefer `min-h-svh` or `min-h-[100dvh]`.  
- **Sidebar covers content at small widths** — Switch to overlay drawer on small screens; add a backdrop and focus trap.  

---

## Quick Checklist

- [ ] Shell uses **Grid**: `grid min-h-svh grid-cols-[auto_1fr]`.  
- [ ] **One scroller** in main: `flex-1 overflow-auto [scrollbar-gutter:stable]`.  
- [ ] Header is **sticky** and **outside** the scroller.  
- [ ] Main column has `min-w-0`.  
- [ ] Sidebar collapses to **overlay** on mobile with focus trap.  
- [ ] **Skip link** and proper ARIA attributes present.  
- [ ] No unintended **horizontal scroll**.  
- [ ] Safe-area / PWA cases considered as needed.  

---

## Example Minimal Markup (Drop-in)

```tsx
<div className="grid min-h-svh grid-cols-[auto_1fr] isolate">
  <AppSidebar />
  <main className="min-w-0 flex flex-col bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {header}
    </header>
    <div className="flex-1 overflow-auto p-3 md:p-4 [scrollbar-gutter:stable]">
      {children}
    </div>
  </main>
</div>
```
