"use client"

import { motion } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { SectionHeader } from "./section-header"
import { 
  RiCheckboxBlankCircleLine, 
  RiProgress2Line, 
  RiFlagLine, 
  RiCheckboxCircleLine, 
  RiArchiveLine,
  RiArrowRightLine
} from "@remixicon/react"

const workflowSteps = [
  {
    id: "open",
    label: "Open",
    description: "Issue reported",
    icon: RiCheckboxBlankCircleLine,
    color: "text-zinc-500",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20"
  },
  {
    id: "in_progress",
    label: "In Progress",
    description: "Active development",
    icon: RiProgress2Line,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    id: "in_review",
    label: "In Review",
    description: "QA & Design check",
    icon: RiFlagLine,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20"
  },
  {
    id: "resolved",
    label: "Resolved",
    description: "Fix deployed",
    icon: RiCheckboxCircleLine,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20"
  },
  {
    id: "archived",
    label: "Archived",
    description: "Case closed",
    icon: RiArchiveLine,
    color: "text-zinc-400",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/10"
  }
]

export function WorkflowSection() {
  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      <SectionHeader
        badge="Workflow"
        title="Built for modern product teams"
        description="A linear, transparent process that keeps everyone aligned from bug report to fix."
      />

      <div className="mt-16 relative max-w-5xl mx-auto">
        {/* Connector Line */}
        <div className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {workflowSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              {/* Step Card */}
              <div className="flex flex-col items-center text-center p-4 rounded-2xl transition-all duration-300 hover:bg-muted/50">
                <div className={`
                  relative z-10 flex h-24 w-24 items-center justify-center rounded-full 
                  bg-background border-2 shadow-sm transition-all duration-300
                  group-hover:scale-110 group-hover:shadow-lg
                  ${step.border}
                `}>
                  <div className={`absolute inset-0 rounded-2xl opacity-20 ${step.bg}`} />
                  <step.icon className={`h-10 w-10 ${step.color}`} />
                  
                  {/* Step Number Badge
                  <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background border shadow-sm flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </div> */}
                </div>

                <div className="mt-6 space-y-1">
                  <h3 className="font-semibold text-lg">{step.label}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>

                {/* Mobile Arrow */}
                {index < workflowSteps.length - 1 && (
                  <RiArrowRightLine className="md:hidden h-6 w-6 text-muted-foreground/30 mt-6 rotate-90" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Automated Transitions",
              desc: "Status updates trigger notifications and move issues automatically."
            },
            {
              title: "Git Integration",
              desc: "Link PRs to issues. Merging a PR automatically resolves the issue."
            },
            {
              title: "Custom Views",
              desc: "Filter by status, priority, or assignee to focus on what matters."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="p-6 rounded-xl border bg-background/50 backdrop-blur-sm"
            >
              <h4 className="font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
