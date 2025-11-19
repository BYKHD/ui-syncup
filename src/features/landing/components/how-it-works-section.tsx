"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, useInView } from "motion/react"
import { MessageSquarePlus, ListTodo, CheckCircle, MousePointer2, FileText, Zap } from "lucide-react"
import { useRef, useState } from "react"

const steps = [
  {
    step: 1,
    title: "Capture visual feedback",
    description: "Upload Figma exports or screenshots. Pin comments directly on the UI, draw boxes, and start threaded discussions with context.",
    icon: MessageSquarePlus,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  },
  {
    step: 2,
    title: "Convert to issues",
    description: "One click turns a comment into a trackable issue. Assign team members, set priority, and sync with your project workflow.",
    icon: ListTodo,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20"
  },
  {
    step: 3,
    title: "Track to resolution",
    description: "Follow the timeline from Open to Resolved. Compare implementation vs design side-by-side to ensure pixel perfection.",
    icon: CheckCircle,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20"
  },
]

// Animated flow dots between cards
function FlowDots({ delay = 0, vertical = false }: { delay?: number, vertical?: boolean }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-primary z-10"
          initial={vertical ? { top: 0, opacity: 0 } : { left: 0, opacity: 0 }}
          animate={vertical
            ? { top: ["0%", "100%"], opacity: [0, 1, 0] }
            : { left: ["0%", "100%"], opacity: [0, 1, 0] }
          }
          transition={{
            duration: 2,
            delay: delay + (i * 0.6),
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </>
  )
}

// Animated icon morphing
function AnimatedIcon({ icon: Icon, delay, color }: { icon: any, delay: number, color: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        delay,
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
      className={`absolute top-0 right-0 p-4 opacity-10`}
    >
      <Icon className="h-24 w-24" />
    </motion.div>
  )
}

// Interactive step card
function StepCard({ step, index }: { step: typeof steps[0], index: number }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const mockData = [
    {
      icon: MousePointer2,
      detail: "Click to pin feedback",
      metric: "3 annotations"
    },
    {
      icon: FileText,
      detail: "Auto-create issue",
      metric: "ISS-247 created"
    },
    {
      icon: CheckCircle,
      detail: "Mark as resolved",
      metric: "100% verified"
    }
  ]

  const IconComponent = mockData[index].icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2, duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative h-full"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 : 0,
          scale: isHovered ? 1.02 : 1
        }}
        transition={{ duration: 0.6 }}
        className="relative h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of card */}
        <Card
          className={`relative overflow-hidden border-2 shadow-lg bg-background/60 backdrop-blur h-full ${step.borderColor}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <AnimatedIcon icon={step.icon} delay={index * 0.2 + 0.3} color={step.color} />

          <CardHeader>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 + 0.4 }}
            >
              <Badge className={`w-fit mb-4 bg-gradient-to-r ${step.color} border-0 text-white`}>
                Step {step.step}
              </Badge>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 + 0.5 }}
            >
              <CardTitle className="text-xl">{step.title}</CardTitle>
            </motion.div>
          </CardHeader>

          <CardContent>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 + 0.6 }}
            >
              {step.description}
            </motion.p>

            {/* Animated visual indicator */}
            <motion.div
              className={`mt-6 p-4 rounded-lg ${step.bgColor} border ${step.borderColor}`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 + 0.7 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className={`p-2 rounded-full bg-gradient-to-br ${step.color}`}
                  animate={{
                    scale: isHovered ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 1, repeat: isHovered ? Infinity : 0 }}
                >
                  <IconComponent className="h-5 w-5 text-white" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{mockData[index].detail}</p>
                  <motion.p
                    className="text-xs text-muted-foreground"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {mockData[index].metric}
                  </motion.p>
                </div>
                <Zap className="h-4 w-4 text-primary" />
              </div>
            </motion.div>
          </CardContent>

          {/* Hover indicator */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}

export function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="container mx-auto px-4 py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center mb-16 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 gap-2">
            <Zap className="h-3 w-3" />
            Simple Process
          </Badge>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold tracking-tight md:text-4xl"
        >
          How teams use UI SyncUp
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          From visual feedback to production-ready code in three simple steps.
        </motion.p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 relative">
        {/* Connecting arrows and flow animations */}
        <div className="hidden md:block absolute top-32 left-0 right-0 pointer-events-none z-10">
          {/* Arrow 1 -> 2 */}
          <div className="absolute left-[30%] top-0 w-[15%] h-0.5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <FlowDots delay={0} />
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="w-0 h-0 border-l-8 border-l-primary border-y-4 border-y-transparent" />
            </motion.div>
          </div>

          {/* Arrow 2 -> 3 */}
          <div className="absolute left-[63%] top-0 w-[15%] h-0.5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <FlowDots delay={0.4} />
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="w-0 h-0 border-l-8 border-l-primary border-y-4 border-y-transparent" />
            </motion.div>
          </div>
        </div>

        {/* Mobile connecting arrows */}
        <div className="md:hidden">
          {steps.slice(0, 2).map((_, i) => (
            <div key={i} className="absolute left-1/2 -translate-x-1/2 h-8 w-0.5" style={{ top: `${(i + 1) * 350}px` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
              <FlowDots delay={i * 0.4} vertical />
            </div>
          ))}
        </div>

        {steps.map((step, index) => (
          <StepCard key={step.step} step={step} index={index} />
        ))}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-center"
      >
        <p className="text-muted-foreground mb-4">See it in action</p>
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                repeat: Infinity
              }}
            />
          ))}
        </div>
      </motion.div>
    </section>
  )
}
