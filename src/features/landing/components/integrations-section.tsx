import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Figma, Github, Trello, Slack, FileText } from "lucide-react"

const integrations = [
  { name: "Figma", icon: Figma, status: "Ready" },
  { name: "GitHub", icon: Github, status: "Ready" },
  { name: "Jira", icon: Trello, status: "Coming Soon" }, // Using Trello icon as generic kanban/Jira placeholder if Jira not available
  { name: "Linear", icon: Trello, status: "Coming Soon" },
  { name: "Slack", icon: Slack, status: "Planned" },
  { name: "Notion", icon: FileText, status: "Planned" },
]

export function IntegrationsSection() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Plays nicely with your design & dev tools</h2>
        <p className="text-muted-foreground text-lg">Built for Figma exports, design handoff, and dev workflows.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {integrations.map((tool) => (
          <Card key={tool.name} className="flex flex-col items-center justify-center p-6 gap-3 hover:bg-muted/50 transition-colors">
            <tool.icon className="h-8 w-8" />
            <span className="font-medium">{tool.name}</span>
            {tool.status !== "Ready" && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {tool.status}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </section>
  )
}
