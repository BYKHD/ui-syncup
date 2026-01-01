import { ChangelogList } from "../components/changelog-list"
import { SiteHeader } from "../components/site-header"

export function ChangelogScreen() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Changelog</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stay up to date with the latest features, improvements, and bug fixes.
            </p>
          </div>

          <div className="mt-16">
            <ChangelogList />
          </div>
        </div>
      </main>
      
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} UI SyncUp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
