/**
 * Landing page demo: sample annotations for interactive showcase
 * Simplified types for demo purposes only
 */

type DemoAnnotation = {
  id: string
  type: "pin" | "box"
  x: number
  y: number
  width?: number
  height?: number
  issueId: string
  createdAt: string
  updatedAt: string
  color: string
}

export const LANDING_DEMO_ANNOTATIONS: DemoAnnotation[] = [
  {
    id: "ann_demo_1",
    type: "pin",
    x: 0.25,
    y: 0.3,
    issueId: "iss_demo_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: "#ef4444",
  },
  {
    id: "ann_demo_2",
    type: "box",
    x: 0.6,
    y: 0.5,
    width: 0.2,
    height: 0.15,
    issueId: "iss_demo_2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: "#f59e0b",
  },
  {
    id: "ann_demo_3",
    type: "pin",
    x: 0.45,
    y: 0.7,
    issueId: "iss_demo_3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: "#3b82f6",
  },
]

type DemoIssue = {
  id: string
  key: string
  title: string
  description?: string
  status: string
  priority: string
  type: string
  teamId: string
  projectId: string
  createdById: string
  assignedToId?: string
  createdAt: string
  updatedAt: string
}

/**
 * Landing page demo: sample issues linked to annotations
 */
export const LANDING_DEMO_ISSUES: DemoIssue[] = [
  {
    id: "iss_demo_1",
    key: "DEMO-1",
    title: "Button padding doesn't match design spec",
    description: "The CTA button has 12px padding but design calls for 16px",
    status: "open",
    priority: "high",
    type: "visual",
    teamId: "team_demo",
    projectId: "proj_demo",
    createdById: "user_demo_1",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "iss_demo_2",
    key: "DEMO-2",
    title: "Contrast ratio fails WCAG AA",
    description: "Text color #888 on #fff background is below 4.5:1 ratio",
    status: "in_progress",
    priority: "critical",
    type: "accessibility",
    teamId: "team_demo",
    projectId: "proj_demo",
    createdById: "user_demo_2",
    assignedToId: "user_demo_3",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "iss_demo_3",
    key: "DEMO-3",
    title: "Card shadow is too subtle on mobile",
    description: "The elevation effect is barely visible on smaller screens",
    status: "in_review",
    priority: "medium",
    type: "visual",
    teamId: "team_demo",
    projectId: "proj_demo",
    createdById: "user_demo_1",
    assignedToId: "user_demo_3",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
]
