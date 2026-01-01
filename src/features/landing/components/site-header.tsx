"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Layers, Loader2 } from "lucide-react"
import { useSession } from "@/features/auth/hooks/use-session"

export function SiteHeader() {
  const { user, isLoading, isAuthenticated } = useSession()

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Layers className="h-6 w-6" />
          <span>UI SyncUp</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/changelog" className="text-sm font-medium hover:underline underline-offset-4">
            Changelog
          </Link>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isAuthenticated && user ? (
            <Link href="/projects" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user.name || user.email}</span>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Start Free Workspace</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
