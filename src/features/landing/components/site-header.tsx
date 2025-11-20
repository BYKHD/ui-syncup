import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Layers } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Layers className="h-6 w-6" />
          <span>UI SyncUp</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Start Free Workspace</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
