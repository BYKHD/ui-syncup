# Breadcrumb Best Practices

These notes capture how we wire breadcrumbs into the shared `AppHeader` while staying aligned with the AGENTS scaffolding rules.

## Core Principles

- **Server-driven data**: Resolve breadcrumb labels and hrefs in the closest server component (route segment layout or page) so we keep data loading out of UI primitives.
- **Single source of truth**: Reuse constants for routes/segments (e.g., from `@/config/nav`) to avoid typo drift across features.
- **Feature-boundaries first**: Treat breadcrumbs as page-level composition—screens/components should only expose the data you need to render, never reach into router state.
- **Accessible copy**: Keep labels short, sentence case, and ensure the final crumb matches the visible `pageName`.
- **Predictable fallbacks**: When no breadcrumbs are provided, `AppHeader` falls back to the `pageName` so mock screens still look complete.

## Implementation Pattern

1. **Set breadcrumb data close to the route**  
   Thin `page.tsx` files (or segment layouts) own the breadcrumb array. Compose them from domain data (`team.name`, `issue.key`) instead of hard-coded strings when possible.

2. **Configure the header declaratively**  
   Use `<AppHeaderConfigurator />` to push the `pageName`, `breadcrumbs`, and optional `actions` into the `AppShell` context. Until a configurator runs, the shell renders a skeleton breadcrumb, so adding the configurator is what swaps in real text.

   ```tsx
   import { AppHeaderConfigurator } from "@/components/shared/headers"

   export default function ProjectsPage() {
     const trail = [
       { label: "Workspace", href: "/dashboard" },
       { label: "Projects" },
     ]

     return (
       <>
         <AppHeaderConfigurator pageName="Projects" breadcrumbs={trail} />
         <ProjectsListScreen />
       </>
     )
   }
   ```

3. **Keep routes portable**  
   When the breadcrumb depends on params (`[projectId]`), derive labels inside the same route segment so screens remain pure UI. Pass primitive props (`projectName`, `issueKey`) into the screen rather than making the screen query router state.

4. **Test for regressions**  
   Add lightweight unit tests or Playwright assertions for critical flows (e.g., navigating from Team → Settings) to make sure the breadcrumb reflects the path the user is on.

## Do / Don’t

| ✅ Do | ❌ Don’t |
| --- | --- |
| Define breadcrumb constants next to each page/layout for clarity. | Manipulate breadcrumbs inside feature components—they shouldn’t know about routing. |
| Use `AppHeaderConfigurator` once per page to set `pageName`, `breadcrumbs`, and `actions`. | Render multiple configurators per page—they will race one another. |
| Provide hrefs for intermediate crumbs and omit them for the current page. | Link the current page crumb—it should be rendered with `BreadcrumbPage`. |
| Keep the breadcrumb trail shallow (≤3 levels) unless there’s a real hierarchy. | Mirror every URL segment blindly; collapsing redundant steps keeps the UI readable. |
| Watch for console warnings: they indicate a missing breadcrumb trail and the UI will stay in skeleton mode. | Ignore the skeleton fallback—if you see it persist, you probably forgot to configure breadcrumbs. |
