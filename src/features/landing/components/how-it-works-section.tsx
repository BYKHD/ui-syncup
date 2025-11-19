import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquarePlus, ListTodo, CheckCircle } from "lucide-react"

export function HowItWorksSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How teams use UI SyncUp</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          From visual feedback to production-ready code in three simple steps.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="relative overflow-hidden border-none shadow-lg bg-background/60 backdrop-blur">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MessageSquarePlus className="h-24 w-24" />
          </div>
          <CardHeader>
            <Badge className="w-fit mb-4" variant="secondary">Step 1</Badge>
            <CardTitle>Capture visual feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Upload Figma exports or screenshots. Pin comments directly on the UI, draw boxes, and start threaded discussions with context.
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-background/60 backdrop-blur">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <ListTodo className="h-24 w-24" />
          </div>
          <CardHeader>
            <Badge className="w-fit mb-4" variant="secondary">Step 2</Badge>
            <CardTitle>Convert to issues</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            One click turns a comment into a trackable issue. Assign team members, set priority, and sync with your project workflow.
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-background/60 backdrop-blur">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle className="h-24 w-24" />
          </div>
          <CardHeader>
            <Badge className="w-fit mb-4" variant="secondary">Step 3</Badge>
            <CardTitle>Track to resolution</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Follow the timeline from Open to Resolved. Compare implementation vs design side-by-side to ensure pixel perfection.
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
