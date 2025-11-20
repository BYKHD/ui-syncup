"use client"

import { Card } from "@/components/ui/card"
import { motion, useScroll, useTransform } from "motion/react"
import { MessageSquarePlus, ListTodo, CheckCircle, Zap } from "lucide-react"
import { useRef } from "react"
import { SectionHeader } from "./section-header"

const steps = [
  {
    step: 1,
    title: "Capture visual feedback",
    description: "Upload Figma exports or screenshots. Pin comments directly on the UI, draw boxes, and start threaded discussions with context.",
    icon: MessageSquarePlus,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    step: 2,
    title: "Convert to issues",
    description: "One click turns a comment into a trackable issue. Assign team members, set priority, and sync with your project workflow.",
    icon: ListTodo,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20"
  },
  {
    step: 3,
    title: "Track to resolution",
    description: "Follow the timeline from Open to Resolved. Compare implementation vs design side-by-side to ensure pixel perfection.",
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20"
  },
]

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const pathLength = useTransform(scrollYProgress, [0.1, 0.6], [0, 1])

  return (
    <section ref={containerRef} className="container mx-auto px-4 py-24 md:py-32 relative">
      <SectionHeader
        title="From Design to Done"
        description="Streamline your feedback loop in three simple steps. No more scattered screenshots or lost Slack messages."
        badge="Workflow"
        icon={Zap}
      />

      <div className="relative grid gap-8 md:grid-cols-3">
        {/* Connecting Line (Desktop) */}
        <div className="hidden md:block absolute top-12 left-0 right-0 h-24 -z-10">
          <svg className="w-full h-full overflow-visible">
            <motion.path
              d="M 100 50 C 300 50, 300 50, 500 50 C 700 50, 700 50, 900 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted/30"
              vectorEffect="non-scaling-stroke"
            />
            <motion.path
              d="M 100 50 C 300 50, 300 50, 500 50 C 700 50, 700 50, 900 50"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              className="drop-shadow-lg"
              style={{ pathLength }}
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--blue-500)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--green-500)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {steps.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className="relative group"
          >
            <div className="mb-6 flex justify-center md:justify-start md:pl-8">
              <div className={`
                relative flex h-16 w-16 items-center justify-center rounded-2xl 
                bg-background border-2 ${step.border} shadow-lg
                group-hover:scale-110 transition-transform duration-300
              `}>
                <step.icon className={`h-8 w-8 ${step.color}`} />
                <div className={`absolute -top-2 -right-2 h-6 w-6 rounded-full ${step.bg} ${step.border} border flex items-center justify-center text-xs font-bold`}>
                  {step.step}
                </div>
              </div>
            </div>

            <Card className="p-6 border-muted/40 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
