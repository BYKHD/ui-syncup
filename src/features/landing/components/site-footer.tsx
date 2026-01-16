import Link from "next/link"
import { Layers } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t py-12 bg-background">
      <div className="container mx-auto px-4 grid gap-8 md:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Layers className="h-6 w-6" />
            <span>UI SyncUp</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Visual feedback to ship pixel-perfect UI together.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="#" className="hover:text-foreground">Features</Link></li>
            <li><Link href="#open-source" className="hover:text-foreground">Open Source</Link></li>
            <li><a href="https://github.com/BYKHD/ui-syncup" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a></li>
            <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="#" className="hover:text-foreground">About</Link></li>
            <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
            <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} UI SyncUp. All rights reserved.
      </div>
    </footer>
  )
}
