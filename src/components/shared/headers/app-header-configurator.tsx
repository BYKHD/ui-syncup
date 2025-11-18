'use client'

import { useEffect } from 'react'

import { useAppShellHeader } from '@/components/layout/app-shell-header-store'
import type { AppHeaderProps } from './app-header'

type AppHeaderConfiguratorProps = AppHeaderProps

export function AppHeaderConfigurator(props: AppHeaderConfiguratorProps) {
  const { setHeaderConfig } = useAppShellHeader()
  const { pageName, breadcrumbs, actions, className, isLoading } = props

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      (!breadcrumbs || breadcrumbs.length === 0)
    ) {
      console.warn(
        '[AppHeaderConfigurator] Breadcrumbs are missing. Provide a trail to avoid the loading skeleton.'
      )
    }

    setHeaderConfig({
      pageName,
      breadcrumbs,
      actions,
      className,
      isLoading,
    })
    return () => setHeaderConfig(null)
  }, [
    pageName,
    breadcrumbs,
    actions,
    className,
    isLoading,
    setHeaderConfig,
  ])

  return null
}
