"use client"

import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Circle, CircleDot, CheckCircle2, Archive, Clock, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"

const steps = [
  {
    label: "Open",
    description: "Issue created",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    ringColor: "ring-muted",
  },
  {
    label: "In Progress",
    description: "Dev working",
    icon: CircleDot,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    ringColor: "ring-blue-500/20",
  },
  {
    label: "In Review",
    description: "Designer checking",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    ringColor: "ring-yellow-500/20",
  },
  {
    label: "Resolved",
    description: "Fix verified",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    ringColor: "ring-green-500/20",
  },
  {
    label: "Archived",
    description: "Done & dusted",
    icon: Archive,
    color: "text-muted-foreground",
    bg: "bg-muted",
    ringColor: "ring-muted",
  },
]

// Animated issue card that travels through workflow
function TravelingIssueCard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % steps.length
        if (next === 3) { // Resolved state
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 1000)
        }
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const cardPositions = [
    { x: 0, y: 80 },
    { x: 160, y: 80 },
    { x: 320, y: 80 },
    { x: 480, y: 80 },
    { x: 640, y: 80 },
  ]

  const CurrentIcon = steps[currentStep].icon

  return (
    <>
      <motion.div
        className="absolute top-0 left-0 z-20 pointer-events-none"
        animate={{
          x: cardPositions[currentStep].x,
          y: cardPositions[currentStep].y,
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="relative">
          <motion.div
            className="w-40 rounded-lg border-2 bg-background shadow-xl p-3"
            animate={{
              borderColor: currentStep === 3 ? "rgb(34, 197, 94)" : "rgba(0,0,0,0.1)",
              boxShadow: currentStep === 3
                ? "0 20px 40px rgba(34, 197, 94, 0.3)"
                : "0 10px 30px rgba(0,0,0,0.2)"
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline" className="text-[10px]">ISS-247</Badge>
              <motion.div
                animate={{ rotate: currentStep === 1 ? 360 : 0 }}
                transition={{ duration: 2, repeat: currentStep === 1 ? Infinity : 0 }}
              >
                <CurrentIcon className={`h-3 w-3 ${steps[currentStep].color}`} />
              </motion.div>
            </div>
            <p className="text-xs font-medium mb-2">Button spacing issue</p>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Confetti effect */}
          <AnimatePresence>
            {showConfetti && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-0 left-1/2"
                    initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                    animate={{
                      y: -60 + Math.random() * 40,
                      x: (Math.random() - 0.5) * 80,
                      opacity: 0,
                      scale: 0.5,
                      rotate: Math.random() * 360
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    <Sparkles className={`h-4 w-4 ${i % 2 === 0 ? 'text-yellow-500' : 'text-green-500'}`} />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

// Pulsing data flow dots along connections
function DataFlowDot({ delay = 0, index = 0 }: { delay?: number, index?: number }) {
  return (
    <motion.div
      className="absolute top-8 h-2 w-2 rounded-full bg-primary"
      initial={{ left: `${index * 20}%`, opacity: 0 }}
      animate={{
        left: `${(index + 1) * 20}%`,
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        repeatDelay: 1,
        ease: "linear"
      }}
    />
  )
}

// Issue preview card on hover
function IssuePreviewCard({ step, index }: { step: typeof steps[0], index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  const mockIssues = [
    { id: "ISS-101", title: "New design feedback", assignee: "@alex" },
    { id: "ISS-203", title: "Fixing header layout", assignee: "@sarah" },
    { id: "ISS-189", title: "Review color changes", assignee: "@mike" },
    { id: "ISS-145", title: "Spacing confirmed", assignee: "@jordan" },
    { id: "ISS-092", title: "Old UI cleanup", assignee: "@chris" },
  ]

  return (
    <motion.div
      className="relative"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background ${step.bg} ${step.color} cursor-pointer`}
        whileHover={{ scale: 1.15 }}
        animate={{
          boxShadow: isHovered
            ? "0 0 0 8px rgba(var(--primary), 0.1)"
            : "0 0 0 0px rgba(var(--primary), 0)"
        }}
      >
        <step.icon className="h-8 w-8" />

        {/* Badge showing issue count */}
        <motion.div
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background"
          initial={{ scale: 0 }}
          animate={{ scale: isHovered ? 1.1 : 1 }}
        >
          {index + 1}
        </motion.div>
      </motion.div>

      {/* Preview card */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 rounded-lg border bg-background/95 backdrop-blur-xl p-3 shadow-2xl z-30"
          >
            <div className="flex items-center gap-2 mb-2">
              <step.icon className={`h-4 w-4 ${step.color}`} />
              <span className="font-semibold text-sm">{step.label}</span>
            </div>
            <div className="space-y-2">
              <div className="rounded border p-2 bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[9px] h-4">{mockIssues[index].id}</Badge>
                  <span className="text-[9px] text-muted-foreground">2h ago</span>
                </div>
                <p className="text-[11px] font-medium">{mockIssues[index].title}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{mockIssues[index].assignee}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              + {index + 2} more issues
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function WorkflowSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30 border-y relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <Badge variant="outline" className="mb-4 gap-2">
          <ArrowRight className="h-3 w-3" />
          Smart Workflow
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
          Issue workflows that match your UI process
        </h2>
        <p className="text-muted-foreground text-lg">
          A clear, automated path from feedback to fix with full visibility.
        </p>
      </motion.div>

      <div className="relative max-w-5xl mx-auto">
        {/* Connecting Line with gradient */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-muted via-primary/30 to-muted hidden md:block" />

        {/* Animated data flow dots */}
        <div className="hidden md:block">
          {[0, 1, 2, 3].map((i) => (
            <DataFlowDot key={i} delay={i * 0.5} index={i} />
          ))}
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
          {steps.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <IssuePreviewCard step={step} index={index} />

              <motion.h3
                className="mt-4 font-semibold text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.label}
              </motion.h3>
              <motion.p
                className="text-sm text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {step.description}
              </motion.p>

              {index < steps.length - 1 && (
                <ArrowRight className="md:hidden h-6 w-6 text-muted-foreground mt-4 rotate-90" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Traveling issue card */}
        <div className="hidden md:block relative h-40">
          <TravelingIssueCard />
        </div>
      </div>

      {/* Bottom features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-16 grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
      >
        {[
          { label: "Auto-progress", desc: "Issues advance automatically" },
          { label: "Custom states", desc: "Match your team's workflow" },
          { label: "Full history", desc: "Track every status change" },
        ].map((feature, i) => (
          <motion.div
            key={feature.label}
            className="text-center p-4 rounded-lg bg-background/50 border"
            whileHover={{ scale: 1.05, borderColor: "rgba(var(--primary), 0.5)" }}
          >
            <h4 className="font-semibold mb-1">{feature.label}</h4>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
