import { ShieldCheck, Lock, Server } from "lucide-react"

export function TrustSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30 border-t">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">Built for modern product teams</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Modern Stack</h3>
                <p className="text-muted-foreground">Built with Next.js, Postgres, and Drizzle for speed and reliability.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure by Design</h3>
                <p className="text-muted-foreground">Strict role-based access control (RBAC) ensures data privacy.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Private & Scoped</h3>
                <p className="text-muted-foreground">Visual feedback is strictly scoped to your teams and projects.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-background p-8 rounded-2xl border shadow-sm">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">TRUSTED BY PRODUCT TEAMS AT</p>
          <div className="grid grid-cols-2 gap-8 opacity-50 grayscale">
            {/* Placeholder Logos */}
            <div className="flex items-center justify-center font-bold text-xl">ACME Inc.</div>
            <div className="flex items-center justify-center font-bold text-xl">Globex</div>
            <div className="flex items-center justify-center font-bold text-xl">Soylent</div>
            <div className="flex items-center justify-center font-bold text-xl">Initech</div>
          </div>
        </div>
      </div>
    </section>
  )
}
