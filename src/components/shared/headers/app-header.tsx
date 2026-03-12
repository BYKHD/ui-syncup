'use client'

import React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemComponent,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationPanel } from '../notifications/notification-panel'
import { HeaderUserMenu } from './header-user-menu'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Breadcrumb item type (renamed to avoid conflict with Breadcrumb component)
 */
export type BreadcrumbItem = {
  label: string
  href?: string
}

export interface AppHeaderProps {
  pageName: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
  isLoading?: boolean
}

// ============================================================================
// APP HEADER COMPONENT
// ============================================================================

/**
 * AppHeader - Application header with breadcrumbs, notifications, and theme toggle
 *
 * Mockup-ready component with no data-fetching hooks.
 * All data is passed via props for clean UI prototyping.
 */
export function AppHeader({
  pageName,
  breadcrumbs,
  actions,
  className = '',
  isLoading = false,
}: AppHeaderProps) {
  const trail = breadcrumbs ?? [{ label: pageName }]

  return (
    <header
      className={`sticky top-0 z-40 flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${className}`}
      role="banner"
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="hidden h-6 md:block" />
        <Breadcrumb>
          <BreadcrumbList>
            {trail.map((crumb, index) => {
              const isLast = index === trail.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItemComponent
                    className={index === 0 ? 'hidden md:block' : undefined}
                  >
                    {isLast ? (
                      isLoading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )
                    ) : (
                      <BreadcrumbLink href={crumb.href ?? '#'}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItemComponent>
                  {!isLast ? (
                    <BreadcrumbSeparator className="hidden md:block" />
                  ) : null}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <NotificationPanel />
        <Separator orientation="vertical" className="h-6" />
        <HeaderUserMenu />
      </div>
    </header>
  )
}
