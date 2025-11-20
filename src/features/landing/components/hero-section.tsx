"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, useMotionValue, useSpring, AnimatePresence } from "motion/react"
import { ArrowRight, MessageSquare, CheckCircle2, MousePointer2, Sparkles, Circle, User } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

// Animated cursor component
function AnimatedCursor({ delay = 0 }: { delay?: number }) {
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 300 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    const timeout = setTimeout(() => {
      cursorX.set(100)
      cursorY.set(80)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [cursorX, cursorY, delay])

  return (
    <motion.div
      style={{ x: cursorXSpring, y: cursorYSpring }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 0.3 }}
      className="absolute pointer-events-none z-50"
    >
      <MousePointer2 className="h-5 w-5 text-primary drop-shadow-lg" />
    </motion.div>
  )
}

// Floating particle effect
function FloatingParticle({ delay = 0, x = 0, y = 0 }: { delay?: number, x?: number, y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x, y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0.5],
        y: [y, y - 50]
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        repeatDelay: 3
      }}
      className="absolute"
    >
      <Sparkles className="h-4 w-4 text-primary/50" />
    </motion.div>
  )
}

// Typing animation component
function TypingText({ text, delay = 0 }: { text: string, delay?: number }) {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        if (index <= text.length) {
          setDisplayText(text.slice(0, index))
          index++
        } else {
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [text, delay])

  return <span>{displayText}<span className="animate-pulse">|</span></span>
}

export function HeroSection() {
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null)
  const [showTyping, setShowTyping] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setShowTyping(true), 2000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <section className="container mx-auto px-4 py-24 md:py-32 relative overflow-hidden">
      {/* Background gradient mesh - Simplified */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4 gap-2 py-1.5 px-4 backdrop-blur-sm bg-background/50">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Design-to-Dev Made Simple
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
            >
              Close the loop between design and implementation
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed"
            >
              Pin feedback directly on mockups, turn comments into tracked issues, and watch every UI detail flow seamlessly from design review to production.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col gap-3 min-[400px]:flex-row"
          >
            <Link href="/sign-up">
              <Button size="lg" className="w-full min-[400px]:w-auto gap-2 group h-12 px-6 text-base">
                Start free workspace
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="w-full min-[400px]:w-auto h-12 px-6 text-base">
                Book a demo
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Cinematic Interactive Product Demo */}
        <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative"
          >
            {/* Floating particles */}
            <FloatingParticle delay={2} x={50} y={30} />
            <FloatingParticle delay={3} x={400} y={100} />
            <FloatingParticle delay={4} x={250} y={50} />

            <div className="relative aspect-video overflow-hidden rounded-xl border bg-background/50 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
              {/* Realistic UI Background - Mockup of actual dashboard */}
              <div className="absolute inset-0 bg-background/40 p-6 grid gap-4 content-start">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <div className="h-4 w-4 rounded bg-primary" />
                    </div>
                    <div className="h-4 w-32 rounded-full bg-muted" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="h-8 w-8 rounded-full bg-primary/10" />
                  </div>
                </motion.div>

                {/* Content cards */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="grid grid-cols-3 gap-4 mt-2"
                >
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl border bg-card/50 p-4 space-y-3">
                      <div className="h-2 w-1/2 rounded-full bg-muted" />
                      <div className="h-16 rounded-lg bg-muted/30" />
                    </div>
                  ))}
                </motion.div>

                {/* Data section */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3 mt-2"
                >
                  <div className="h-4 w-1/4 rounded-full bg-muted" />
                  <div className="h-24 rounded-xl border bg-card/50" />
                </motion.div>
              </div>

              {/* Animated Cursor */}
              <AnimatedCursor delay={1.5} />

              {/* Interactive Annotation Pins */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
                className="absolute top-[30%] left-[25%]"
                onHoverStart={() => setActiveAnnotation(1)}
                onHoverEnd={() => setActiveAnnotation(null)}
              >
                <div className="relative group cursor-pointer">
                  <motion.div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      boxShadow: activeAnnotation === 1
                        ? "0 0 0 8px rgba(var(--primary), 0.2)"
                        : "0 0 0 0px rgba(var(--primary), 0)"
                    }}
                  >
                    <Circle className="h-3 w-3 fill-current" />
                  </motion.div>

                  <AnimatePresence>
                    {activeAnnotation === 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -10 }}
                        className="absolute left-full top-0 ml-3 w-64 rounded-xl border bg-background/95 backdrop-blur-xl p-4 shadow-2xl z-20"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs text-white font-bold shadow-inner">
                            A
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">Alex Design</p>
                            <p className="text-xs text-muted-foreground">2 min ago</p>
                          </div>
                        </div>
                        {showTyping && (
                          <p className="text-sm text-foreground/90 mb-3 leading-relaxed">
                            <TypingText text="Card padding should be 24px instead of 16px to match the design system." delay={0} />
                          </p>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-medium">Design feedback</Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 2.2, type: "spring", stiffness: 200 }}
                className="absolute bottom-[35%] right-[50%]"
                onHoverStart={() => setActiveAnnotation(2)}
                onHoverEnd={() => setActiveAnnotation(null)}
              >
                <div className="relative group cursor-pointer">
                  <motion.div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg ring-4 ring-background"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      y: [0, -4, 0],
                      boxShadow: activeAnnotation === 2
                        ? "0 0 0 8px rgba(239, 68, 68, 1)"
                        : "0 0 0 0px rgba(239, 68, 68, 0)"
                    }}
                    transition={{ y: { duration: 2, repeat: Infinity } }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </motion.div>

                  <AnimatePresence>
                    {activeAnnotation === 2 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                        className="absolute right-full top-0 mr-3 w-64 rounded-xl border bg-background/95 backdrop-blur-xl p-4 shadow-2xl z-20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="destructive" className="text-[10px]">BUG-142</Badge>
                          <span className="text-xs text-muted-foreground">Just now</span>
                        </div>
                        <p className="text-sm font-medium mb-3">Button alignment breaks on mobile viewport</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs text-muted-foreground">@sarah assigned</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Glassmorphism Side Panel */}
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.2, type: "spring", damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-2/5 border-l bg-background/80 backdrop-blur-xl p-4 flex flex-col gap-3 shadow-2xl"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="flex items-center gap-2 mb-2"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 }}
                  className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-[10px] shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-semibold text-green-600 dark:text-green-400">Resolved</span>
                  </div>
                  <p className="text-muted-foreground line-through mb-1">Wrong color in CTA button</p>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>Fixed by @mike</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.8 }}
                  className="rounded-lg border-2 border-yellow-500/40 bg-yellow-500/5 p-3 text-[10px] shadow-md"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="h-3.5 w-3.5 rounded-full border-2 border-yellow-500 border-t-transparent"
                    />
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">In Review</span>
                  </div>
                  <p className="font-medium mb-1">Update header spacing</p>
                  <Badge variant="outline" className="text-[9px] h-4">Priority: High</Badge>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.0 }}
                  className="rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-2.5 text-[10px] shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Circle className="h-3.5 w-3.5 text-blue-500 fill-current" />
                    <span className="font-semibold text-blue-600 dark:text-blue-400">In Progress</span>
                  </div>
                  <p className="font-medium">Mobile responsive fixes</p>
                </motion.div>
              </motion.div>

              {/* Pulse indicator for live activity */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border text-[10px] shadow-lg"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-green-500"
                />
                <span className="font-medium">Live collaboration</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

