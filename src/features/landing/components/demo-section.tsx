"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Calendar, Tag, MousePointer2, CheckCircle2, PlayCircle, Pause, ChevronRight } from "lucide-react"

const tourSteps = [
  {
    id: 1,
    title: "Pin feedback anywhere",
    description: "Click anywhere on your mockup to drop a pin and start a discussion",
    spotlight: { x: "30%", y: "25%", size: 150 }
  },
  {
    id: 2,
    title: "Create threaded comments",
    description: "Discuss design decisions with your team in context",
    spotlight: { x: "75%", y: "50%", size: 250 }
  },
  {
    id: 3,
    title: "Convert to issues",
    description: "One click turns feedback into a tracked issue",
    spotlight: { x: "75%", y: "30%", size: 200 }
  },
  {
    id: 4,
    title: "Track to completion",
    description: "Watch status updates in real-time as your team works",
    spotlight: { x: "75%", y: "15%", size: 180 }
  }
]

// Collaborative cursor component
function CollaborativeCursor({ name, color, delay = 0 }: { name: string, color: string, delay?: number }) {
  const [position, setPosition] = useState({ x: 100, y: 100 })

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        x: Math.random() * 60 + 10,
        y: Math.random() * 60 + 10
      })
    }, 3000 + delay * 1000)
    return () => clearInterval(interval)
  }, [delay])

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      animate={{ left: `${position.x}%`, top: `${position.y}%` }}
      transition={{ duration: 2, ease: "easeInOut" }}
    >
      <MousePointer2 className="h-5 w-5" style={{ color }} />
      <div className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap" style={{ backgroundColor: color }}>
        {name}
      </div>
    </motion.div>
  )
}

// Toast notification
function Toast({ message, show }: { message: string, show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="absolute top-4 right-4 bg-background border rounded-lg shadow-xl p-4 flex items-center gap-3 z-50 max-w-xs"
        >
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-1 p-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            delay: i * 0.2,
            repeat: Infinity
          }}
        />
      ))}
    </div>
  )
}

export function DemoSection() {
  const [activePin, setActivePin] = useState<string | null>(null)
  const [tourStep, setTourStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [issueStatus, setIssueStatus] = useState<"open" | "in_progress" | "resolved">("open")
  const [showToast, setShowToast] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [commentCount, setCommentCount] = useState(1)

  // Auto-play tour
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setTourStep((prev) => {
        if (prev >= tourSteps.length - 1) {
          setIsPlaying(false)
          return 0
        }
        return prev + 1
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Simulate status changes
  useEffect(() => {
    if (tourStep === 3) {
      const timeout1 = setTimeout(() => setIssueStatus("in_progress"), 1000)
      const timeout2 = setTimeout(() => {
        setIssueStatus("resolved")
        setShowToast(true)
      }, 2500)
      const timeout3 = setTimeout(() => setShowToast(false), 4500)
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
        clearTimeout(timeout3)
      }
    }
  }, [tourStep])

  // Simulate typing and new comments
  useEffect(() => {
    if (activePin && tourStep === 1) {
      setShowTyping(true)
      const timeout = setTimeout(() => {
        setShowTyping(false)
        setCommentCount(2)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [activePin, tourStep])

  const statusConfig = {
    open: { label: "OPEN", variant: "secondary" as const, color: "text-muted-foreground" },
    in_progress: { label: "IN PROGRESS", variant: "default" as const, color: "text-blue-500" },
    resolved: { label: "RESOLVED", variant: "default" as const, color: "text-green-500" }
  }

  return (
    <section className="container mx-auto px-4 py-24 relative">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 gap-2">
            <PlayCircle className="h-3 w-3" />
            Interactive Demo
          </Badge>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold tracking-tight md:text-4xl mb-4"
        >
          See it in action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          Interactive feedback that feels like part of your app.
        </motion.p>
      </div>

      {/* Tour Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4 mb-8"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          className="gap-2"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          {isPlaying ? "Pause Tour" : "Start Tour"}
        </Button>
        <div className="flex gap-2">
          {tourSteps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => {
                setTourStep(i)
                setIsPlaying(false)
              }}
              className={`h-2 rounded-full transition-all ${
                i === tourStep ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Tour Step Indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tourStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-center mb-6 max-w-xl mx-auto"
        >
          <h3 className="font-semibold text-lg mb-1">{tourSteps[tourStep].title}</h3>
          <p className="text-sm text-muted-foreground">{tourSteps[tourStep].description}</p>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border-2 bg-background shadow-2xl overflow-hidden max-w-6xl mx-auto h-[600px] flex relative"
      >
        {/* Toast Notifications */}
        <Toast message="Issue ISS-247 marked as resolved!" show={showToast} />

        {/* Spotlight Effect */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tourStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-20 pointer-events-none"
            style={{
              maskImage: `radial-gradient(circle ${tourSteps[tourStep].spotlight.size}px at ${tourSteps[tourStep].spotlight.x} ${tourSteps[tourStep].spotlight.y}, transparent 0%, transparent 70%, black 100%)`,
              WebkitMaskImage: `radial-gradient(circle ${tourSteps[tourStep].spotlight.size}px at ${tourSteps[tourStep].spotlight.x} ${tourSteps[tourStep].spotlight.y}, transparent 0%, transparent 70%, black 100%)`
            }}
          />
        </AnimatePresence>

        {/* Mock App Area */}
        <div className="flex-1 bg-muted/20 relative p-8 overflow-hidden">
          {/* Realistic mockup UI */}
          <div className="absolute inset-0 p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full grid grid-cols-12 gap-4"
            >
              {/* Sidebar */}
              <div className="col-span-3 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg p-4 space-y-3">
                <div className="h-8 w-full bg-primary/20 rounded" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-muted/60 rounded" />
                ))}
              </div>

              {/* Main content */}
              <div className="col-span-9 space-y-4">
                <div className="h-16 bg-gradient-to-r from-muted/80 to-muted/40 rounded-lg flex items-center px-4 gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20" />
                  <div className="h-4 w-40 bg-muted rounded" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.5 }}
                      className="h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-primary/10 p-4"
                    >
                      <div className="h-3 w-2/3 bg-muted/60 rounded mb-2" />
                      <div className="h-2 w-1/2 bg-muted/40 rounded" />
                    </motion.div>
                  ))}
                </div>

                <div className="h-80 bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/60 rounded" />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Collaborative Cursors */}
          <CollaborativeCursor name="Sarah" color="#3b82f6" delay={0} />
          <CollaborativeCursor name="Mike" color="#8b5cf6" delay={1.5} />

          {/* Interactive Pins */}
          <div className="absolute inset-0 z-40">
            <Pin
              x="30%"
              y="25%"
              active={activePin === "pin-1"}
              onClick={() => setActivePin("pin-1")}
              pulse={tourStep === 0}
            />
            <Pin
              x="60%"
              y="40%"
              active={activePin === "pin-2"}
              onClick={() => setActivePin("pin-2")}
              pulse={tourStep === 1}
            />
            <Pin
              x="45%"
              y="65%"
              active={activePin === "pin-3"}
              onClick={() => setActivePin("pin-3")}
              pulse={tourStep === 2}
            />
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="w-96 border-l bg-background flex flex-col z-30">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Issue Details</h3>
            {activePin && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>2 viewing</span>
              </motion.div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              {activePin ? (
                <motion.div
                  key={activePin}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 space-y-6"
                >
                  {/* Status Badge with transition */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={issueStatus}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                        >
                          <Badge variant={statusConfig[issueStatus].variant} className="gap-1.5">
                            {issueStatus === "resolved" && <CheckCircle2 className="h-3 w-3" />}
                            {statusConfig[issueStatus].label}
                          </Badge>
                        </motion.div>
                      </AnimatePresence>
                      <span className="text-xs text-muted-foreground">
                        ISS-{activePin.split('-')[1]}
                      </span>
                    </div>

                    <h4 className="font-semibold text-lg">
                      {activePin === "pin-1" && "Sidebar navigation alignment"}
                      {activePin === "pin-2" && "Card shadow inconsistent"}
                      {activePin === "pin-3" && "Chart colors need update"}
                    </h4>

                    {tourStep === 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Button size="sm" className="w-full gap-2" onClick={() => setTourStep(3)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Convert to Issue
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3 text-sm pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                            JD
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">John Doe</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Due tomorrow</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs">UI Polish</Badge>
                    </div>
                  </div>

                  {/* Comment Thread */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          ME
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-1">
                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                          Can we adjust this to match the new design system specs?
                        </div>
                        <span className="text-xs text-muted-foreground">2m ago</span>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {commentCount > 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3"
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                              SD
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1">
                            <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-sm">
                              Good catch! I'll update this today.
                            </div>
                            <span className="text-xs text-muted-foreground">Just now</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {showTyping && <TypingIndicator />}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground"
                >
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm">Click a pin to view issue details</p>
                  <p className="text-xs mt-2">Or start the interactive tour above</p>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </motion.div>
    </section>
  )
}

function Pin({
  x,
  y,
  active,
  onClick,
  pulse = false
}: {
  x: string
  y: string
  active: boolean
  onClick: () => void
  pulse?: boolean
}) {
  return (
    <motion.button
      className={`absolute h-8 w-8 -ml-4 -mt-4 rounded-full flex items-center justify-center shadow-lg transition-colors ${
        active
          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
          : "bg-background text-foreground hover:bg-primary hover:text-primary-foreground border-2 border-primary/30"
      }`}
      style={{ left: x, top: y }}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={pulse ? { scale: [1, 1.2, 1] } : {}}
      transition={pulse ? { duration: 1, repeat: Infinity } : {}}
    >
      <div className={`h-3 w-3 rounded-full ${active ? "bg-white" : "bg-primary"}`} />
      {pulse && !active && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}
