"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Landing page header with logo and authentication CTAs
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 max-w-7xl">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            US
          </div>
          <span className="font-semibold text-lg">UI SyncUp</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
