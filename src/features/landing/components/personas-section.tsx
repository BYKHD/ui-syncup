"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Paintbrush, Code2, KanbanSquare, Check } from "lucide-react"

export function PersonasSection() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Designed for designers, devs, and PMs</h2>
        <p className="text-muted-foreground text-lg">Everyone stays in the loop, in their own language.</p>
      </div>

      <Tabs defaultValue="designers" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="designers" className="py-3 gap-2">
            <Paintbrush className="h-4 w-4" /> Designers
          </TabsTrigger>
          <TabsTrigger value="developers" className="py-3 gap-2">
            <Code2 className="h-4 w-4" /> Developers
          </TabsTrigger>
          <TabsTrigger value="pms" className="py-3 gap-2">
            <KanbanSquare className="h-4 w-4" /> PMs
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="designers">
            <PersonaCard 
              title="For Designers"
              description="Stop taking screenshots of screenshots. Give feedback where it belongs."
              features={[
                "Drop pins directly on mockups",
                "Attach context and assets to comments",
                "Request reviews from specific developers",
                "Compare implementation with overlay mode"
              ]}
              icon={<Paintbrush className="h-12 w-12 text-primary" />}
            />
          </TabsContent>
          <TabsContent value="developers">
            <PersonaCard 
              title="For Developers"
              description="No more guessing which pixel they meant. See the issue in context."
              features={[
                "See issues pinned to the actual UI element",
                "Update status directly from the view",
                "Add implementation notes and code snippets",
                "Clear acceptance criteria for every ticket"
              ]}
              icon={<Code2 className="h-12 w-12 text-primary" />}
            />
          </TabsContent>
          <TabsContent value="pms">
            <PersonaCard 
              title="For Product Managers"
              description="Track progress across projects without chasing people."
              features={[
                "High-level view of project health",
                "See what's blocking the release",
                "Track velocity and resolution times",
                "Manage permissions and team access"
              ]}
              icon={<KanbanSquare className="h-12 w-12 text-primary" />}
            />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  )
}

function PersonaCard({ title, description, features, icon }: { title: string, description: string, features: string[], icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base mt-2">{description}</CardDescription>
          </div>
          <div className="hidden md:block p-3 bg-primary/10 rounded-full">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
