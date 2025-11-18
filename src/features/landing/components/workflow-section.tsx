"use client"

import { Badge } from "@/components/ui/badge"
import { SectionContainer } from "@/components/shared/section-container"
import { ISSUE_WORKFLOW } from "@/config/workflow"

const workflowSteps = [
  {
    key: "open",
    label: "Open",
    description: "Issue reported with visual context",
    color: "bg-slate-500",
  },
  {
    key: "in_progress",
    label: "In Progress",
    description: "Developer is actively working on fix",
    color: "bg-blue-500",
  },
  {
    key: "in_review",
    label: "In Review",
    description: "Designer compares implementation to mockup side-by-side",
    color: "bg-purple-500",
  },
  {
    key: "resolved",
    label: "Resolved",
    description: "Fix approved and ready to ship",
    color: "bg-green-500",
  },
  {
    key: "archived",
    label: "Archived",
    description: "Issue closed and moved to history",
    color: "bg-gray-400",
  },
]

/**
 * Workflow section: visual representation of issue lifecycle
 */
export function WorkflowSection() {
  return (
    <SectionContainer variant="muted" id="workflow">
      <div className="space-y-12">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Issue workflows that match your UI process
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track every issue from discovery to resolution with clear status transitions
          </p>
        </div>

        {/* Workflow visualization */}
        <div className="relative max-w-5xl mx-auto">
          {/* Desktop: Horizontal flow */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  {/* Badge */}
                  <div className="relative">
                    <Badge
                      variant="outline"
                      className={`${step.color} text-white border-white/20 px-4 py-2 text-sm font-semibold shadow-lg`}
                    >
                      {step.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="mt-4 text-sm text-muted-foreground max-w-[150px]">
                    {step.description}
                  </p>
                </div>

                {/* Arrow connector */}
                {index < workflowSteps.length - 1 && (
                  <div className="flex items-center justify-center px-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-6 h-6 text-muted-foreground/40"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Vertical flow */}
          <div className="md:hidden space-y-6">
            {workflowSteps.map((step, index) => (
              <div key={step.key}>
                <div className="flex gap-4">
                  {/* Badge */}
                  <div className="flex flex-col items-center">
                    <Badge
                      variant="outline"
                      className={`${step.color} text-white border-white/20 px-3 py-1.5 text-xs font-semibold shadow-lg`}
                    >
                      {step.label}
                    </Badge>

                    {/* Arrow connector */}
                    {index < workflowSteps.length - 1 && (
                      <div className="flex-1 w-0.5 bg-border mt-2 min-h-[40px]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4 text-muted-foreground/40 mx-auto mt-2"
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Customize workflows to match your team's process. Add custom states, transitions, and automation rules.
          </p>
        </div>
      </div>
    </SectionContainer>
  )
}
