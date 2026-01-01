/**
 * Preload utilities for lazy-loaded components
 * 
 * These functions trigger the dynamic import of heavy components
 * before they are actually needed, reducing perceived load time.
 */

/**
 * Preloads issue detail page components.
 * Call this on hover/focus of issue links to warm up the component cache.
 * 
 * Components preloaded:
 * - optimized-attachment-view (heavy image/canvas rendering)
 * - issue-details-panel (form + activity timeline)
 */
export function preloadIssueDetailComponents() {
  // These imports are fire-and-forget - we don't need the result
  // The browser will cache the modules for when they're actually needed
  import('./optimized-attachment-view');
  import('./issue-details-panel');
}

/**
 * Preloads the responsive issue layout and its dependencies.
 * Useful for project list pages where users commonly click into issues.
 */
export function preloadIssueLayout() {
  import('./responsive-issue-layout');
  // Also preload sub-components
  preloadIssueDetailComponents();
}
