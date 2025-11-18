"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionContainer } from "@/components/shared/section-container"
import { LANDING_DEMO_ISSUES } from "@/mocks/landing.fixtures"

const demoAnnotations = [
  { id: 1, x: 25, y: 30, color: "bg-red-500", issueIndex: 0 },
  { id: 2, x: 60, y: 50, width: 20, height: 15, color: "bg-amber-500", issueIndex: 1 },
  { id: 3, x: 45, y: 70, color: "bg-blue-500", issueIndex: 2 },
]

/**
 * Demo section: interactive annotation board with issue panel preview
 */
export function DemoSection() {
  const [selectedPin, setSelectedPin] = useState<number | null>(0)

  const selectedIssue =
    selectedPin !== null ? LANDING_DEMO_ISSUES[selectedPin] : null

  return (
    <SectionContainer id="demo">
      <div className="space-y-12">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            See it in action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Click on any annotation pin to see the linked issue details
          </p>
        </div>

        {/* Interactive demo */}
          <div className="flex gap-6 flex-col lg:flex-row">
          {/* Left: Annotation canvas */}
          <Card className="relative overflow-hidden w-full">
            <CardContent className="p-6">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg border">
                {/* Mock UI content */}
                <div className="absolute inset-4 bg-card rounded border shadow-sm p-6 space-y-4">
                  {/* Simulated header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-muted rounded" />
                      <div className="h-8 w-8 bg-muted rounded" />
                    </div>
                  </div>

                  {/* Simulated content */}
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>

                  {/* Simulated cards */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="h-24 bg-muted/60 rounded p-3 space-y-2">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                    <div className="h-24 bg-muted/60 rounded p-3 space-y-2">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>

                {/* Annotation pins */}
                {demoAnnotations.map((pin) => (
                  <div key={pin.id}>
                    {pin.width && pin.height ? (
                      // Box annotation
                      <button
                        className={`absolute ${pin.color} opacity-30 hover:opacity-50 border-2 border-white cursor-pointer transition-opacity rounded`}
                        style={{
                          top: `${pin.y}%`,
                          left: `${pin.x}%`,
                          width: `${pin.width}%`,
                          height: `${pin.height}%`,
                        }}
                        onClick={() => setSelectedPin(pin.issueIndex)}
                        aria-label={`Annotation ${pin.id}`}
                      />
                    ) : (
                      // Pin annotation
                      <button
                        className={`absolute w-8 h-8 ${pin.color} rounded-full border-2 ${
                          selectedPin === pin.issueIndex
                            ? "border-white ring-2 ring-primary"
                            : "border-white"
                        } shadow-lg cursor-pointer hover:scale-110 transition-all flex items-center justify-center text-xs font-bold text-white`}
                        style={{
                          top: `${pin.y}%`,
                          left: `${pin.x}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        onClick={() => setSelectedPin(pin.issueIndex)}
                        aria-label={`Annotation ${pin.id}`}
                      >
                        {pin.id}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Right: Issue details panel */}
          <Card className="lg:sticky lg:top-24 h-fit">
            <CardContent className="p-6 space-y-6">
              {selectedIssue ? (
                <>
                  {/* Issue header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="text-sm text-muted-foreground">
                          {selectedIssue.key}
                        </div>
                        <h3 className="font-semibold leading-tight">
                          {selectedIssue.title}
                        </h3>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={
                          selectedIssue.status === "open"
                            ? "bg-slate-500/10 text-slate-700 border-slate-300"
                            : selectedIssue.status === "in_progress"
                            ? "bg-blue-500/10 text-blue-700 border-blue-300"
                            : "bg-purple-500/10 text-purple-700 border-purple-300"
                        }
                      >
                        {selectedIssue.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          selectedIssue.priority === "critical"
                            ? "bg-red-500/10 text-red-700 border-red-300"
                            : selectedIssue.priority === "high"
                            ? "bg-orange-500/10 text-orange-700 border-orange-300"
                            : "bg-yellow-500/10 text-yellow-700 border-yellow-300"
                        }
                      >
                        {selectedIssue.priority}
                      </Badge>
                      <Badge variant="secondary">{selectedIssue.type}</Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Description</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedIssue.description}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assignee</span>
                      <span className="font-medium">
                        {selectedIssue.assignedToId
                          ? "John Developer"
                          : "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {new Date(selectedIssue.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium">
                        {new Date(selectedIssue.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Click on an annotation to see issue details
                </div>
              )}
            </CardContent>
          </Card>
          </div>
     
      </div>
    </SectionContainer>
  )
}
