"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { SectionContainer } from "@/components/shared/section-container"

const personas = [
  {
    id: "designer",
    label: "Designer / QA",
    title: "Design review made visual",
    description: "Catch UI inconsistencies before they ship",
    features: [
      "Drop pins directly on mockups and screenshots",
      "Attach design context and reference materials",
      "Request review from developers and stakeholders",
      "Compare implementation side-by-side with designs",
      "Track visual accuracy throughout development",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "developer",
    label: "Developer",
    title: "See issues in UI context",
    description: "Fix bugs faster with visual annotations",
    features: [
      "See exact location of UI issues on mockups",
      "Update status as you work (Open → In Progress → In Review)",
      "Add implementation notes and commit references",
      "Clarify requirements with threaded comments",
      "Ship with confidence knowing design intent",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "pm",
    label: "PM / Manager",
    title: "Track progress across projects",
    description: "Know what's blocking your next release",
    features: [
      "Dashboard view of all issues across projects",
      "Filter by status, priority, and assignee",
      "Identify blockers before they delay shipping",
      "Export reports for stakeholder updates",
      "Manage permissions and team access",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
]

/**
 * Personas section: showcases value for different user roles
 */
export function PersonasSection() {
  return (
    <SectionContainer id="personas">
      <div className="space-y-12">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Designed for designers, devs, and PMs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everyone on your team gets exactly what they need
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="designer" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
            {personas.map((persona) => (
              <TabsTrigger
                key={persona.id}
                value={persona.id}
                className="gap-2"
              >
                {persona.icon}
                <span className="hidden sm:inline">{persona.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {personas.map((persona) => (
            <TabsContent key={persona.id} value={persona.id} className="mt-8">
              <Card>
                <CardContent className="p-8">
                  <div className="grid gap-8 md:grid-cols-2 items-center">
                    {/* Left: Description */}
                    <div className="space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {persona.icon}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold">{persona.title}</h3>
                        <p className="text-lg text-muted-foreground">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Feature list */}
                    <div className="space-y-3">
                      {persona.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <p className="text-sm leading-relaxed">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SectionContainer>
  )
}
