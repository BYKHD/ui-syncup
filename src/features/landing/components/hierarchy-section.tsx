import { Users, Folder, FileText, Shield, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function HierarchySection() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Multi-team, multi-project, clear permissions</h2>
          <p className="text-muted-foreground text-lg">
            Organize your work the way your company works. Strict role-based access ensures the right people see the right things.
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Team Roles</h3>
                <p className="text-sm text-muted-foreground">Owner, Admin, Editor. Control team settings and access.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Project Roles</h3>
                <p className="text-sm text-muted-foreground">Owner, Editor, Developer, Viewer. Granular access per project.</p>
              </div>
            </div>
             <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Unlimited Users</h3>
                <p className="text-sm text-muted-foreground">Add as many team members as your instance allows.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy Diagram */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-3xl -z-10" />
          <div className="p-8 flex flex-col items-center gap-6">
            {/* Team Level */}
            <Card className="w-full max-w-md border-primary/20 shadow-lg">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Acme Corp</p>
                    <p className="text-xs text-muted-foreground">Team</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Owner</Badge>
                  <Badge variant="outline">Admin</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Connector */}
            <div className="h-8 w-0.5 bg-border" />

            {/* Project Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              <Card className="w-full border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-muted rounded-md">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Marketing Site</p>
                      <p className="text-[10px] text-muted-foreground">Project</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">Editor</Badge>
                    <Badge variant="secondary" className="text-[10px]">Dev</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="w-full border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-muted rounded-md">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Dashboard App</p>
                      <p className="text-[10px] text-muted-foreground">Project</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">Owner</Badge>
                    <Badge variant="secondary" className="text-[10px]">Viewer</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connector */}
            <div className="h-8 w-0.5 bg-border" />

            {/* Issue Level */}
            <Card className="w-full max-w-md bg-muted/50">
              <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Issues & Comments</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
