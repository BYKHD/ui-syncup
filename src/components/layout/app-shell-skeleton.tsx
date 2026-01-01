"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * AppShellSkeleton - Loading fallback for the main application shell
 * 
 * Displays while the AppShell component is being dynamically imported.
 * Matches the layout structure of the actual sidebar/header/content pattern.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card">
        {/* Logo area */}
        <div className="flex h-16 items-center gap-2 px-4 border-b">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        
        {/* Team switcher skeleton */}
        <div className="px-3 py-2">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        
        {/* Navigation skeleton */}
        <div className="flex-1 px-3 py-2 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
          
          {/* Recent projects section */}
          <div className="pt-4 space-y-1">
            <Skeleton className="h-4 w-24 mb-2" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`project-${i}`} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header skeleton */}
        <div className="flex h-14 items-center gap-4 border-b bg-background px-4">
          {/* Mobile menu button */}
          <Skeleton className="h-9 w-9 rounded-md md:hidden" />
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* User avatar */}
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        
        {/* Content area skeleton */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            {/* Content cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            
            {/* Main content area */}
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
