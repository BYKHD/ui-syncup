"use client"

import { motion } from "motion/react"
import { ArrowRight, Circle, CircleDot, CheckCircle2, Archive, Clock } from "lucide-react"

const steps = [
  {
    label: "Open",
    description: "Issue created",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    label: "In Progress",
    description: "Dev working",
    icon: CircleDot,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "In Review",
    description: "Designer checking",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    label: "Resolved",
    description: "Fix verified",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    label: "Archived",
    description: "Done & dusted",
    icon: Archive,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
]

export function WorkflowSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30 border-y">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Issue workflows that match your UI process</h2>
        <p className="text-muted-foreground text-lg">A clear path from feedback to fix.</p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Connecting Line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-border hidden md:block" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          {steps.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background ${step.bg} ${step.color} transition-transform group-hover:scale-110`}>
                <step.icon className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{step.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              
              {index < steps.length - 1 && (
                <ArrowRight className="md:hidden h-6 w-6 text-muted-foreground mt-4 rotate-90" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
