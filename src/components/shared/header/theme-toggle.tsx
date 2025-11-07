'use client'

import { useTheme } from 'next-themes'
import { Button } from '@components/ui/button'
import { RiSunLine, RiMoonLine } from '@remixicon/react'

// ============================================================================
// THEME TOGGLE COMPONENT
// ============================================================================

/**
 * ThemeToggle - Theme switcher button
 *
 * Toggles between light and dark themes using next-themes.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const handleToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <RiMoonLine className="size-4" />
      ) : (
        <RiSunLine className="size-4" />
      )}
    </Button>
  )
}
