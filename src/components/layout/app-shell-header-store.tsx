'use client'

import * as React from 'react'
import type { AppHeaderProps } from '@/components/shared/headers/app-header'

type HeaderContextValue = {
  headerConfig: AppHeaderProps | null
  setHeaderConfig: React.Dispatch<React.SetStateAction<AppHeaderProps | null>>
}

export const AppShellHeaderContext =
  React.createContext<HeaderContextValue | null>(null)

export function useAppShellHeader() {
  const context = React.useContext(AppShellHeaderContext)
  if (!context) {
    throw new Error('useAppShellHeader must be used within AppShell')
  }
  return context
}
