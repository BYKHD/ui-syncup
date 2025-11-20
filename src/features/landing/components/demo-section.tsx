"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageSquare, 
  CheckCircle2, 
  PlayCircle, 
  Pause, 
  MousePointer2, 
  MoreHorizontal, 
  Paperclip, 
  Send,
  X,
  Clock,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types & Constants ---

type TourStep = {
  id: number
  label: string
  duration: number
  action: () => void
}

const MOCK_USERS = [
  { name: "Alex Design", initials: "AD", color: "bg-blue-500" },
  { name: "Sarah Dev", initials: "SD", color: "bg-purple-500" },
  { name: "Mike PM", initials: "MP", color: "bg-green-500" }
]

// --- Helper Components ---

function MockDashboard() {
  return (
    <div className="w-full h-full p-8 grid grid-cols-12 gap-6 bg-muted/10">
      {/* Sidebar */}
      <div className="col-span-2 space-y-4">
        <div className="h-8 w-8 rounded-lg bg-primary/20" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-2 w-full rounded-full bg-muted/20" />
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="col-span-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 rounded-lg bg-muted/20" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-muted/20" />
            <div className="h-8 w-8 rounded-full bg-muted/20" />
          </div>
        </div>
        
        {/* Charts/Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video rounded-xl border bg-background/40 p-4 space-y-3 shadow-sm">
              <div className="h-4 w-24 rounded bg-muted/20" />
              <div className="flex-1 rounded-lg bg-muted/10" />
            </div>
          ))}
        </div>
        
        {/* Table */}
        <div className="rounded-xl border bg-background/40 p-4 space-y-4 shadow-sm">
          <div className="flex justify-between">
            <div className="h-5 w-32 rounded bg-muted/20" />
            <div className="h-5 w-16 rounded bg-muted/20" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-muted/20" />
              <div className="h-3 w-full rounded bg-muted/10" />
              <div className="h-3 w-24 rounded bg-muted/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Cursor({ x, y, label, color, clicking }: { x: number, y: number, label: string, color: string, clicking: boolean }) {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ type: "spring", damping: 30, stiffness: 200 }}
    >
      <motion.div
        animate={clicking ? { scale: 0.8 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
      >
        <MousePointer2 className={cn("h-5 w-5 drop-shadow-md", color)} fill="currentColor" />
      </motion.div>
      <div className={cn("ml-4 px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-sm", color.replace("text-", "bg-"))}>
        {label}
      </div>
    </motion.div>
  )
}

function Pin({ x, y, active }: { x: number, y: number, active: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "absolute -ml-3 -mt-3 h-6 w-6 rounded-full border-2 shadow-lg flex items-center justify-center z-40 transition-colors duration-300",
        active 
          ? "bg-primary border-primary text-primary-foreground scale-110" 
          : "bg-background border-primary/50 text-muted-foreground"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className={cn("h-2 w-2 rounded-full", active ? "bg-white" : "bg-primary")} />
    </motion.div>
  )
}

// --- Main Component ---

export function DemoSection() {
  // State
  const [isPlaying, setIsPlaying] = useState(true)
  const [step, setStep] = useState(0)
  const [cursor, setCursor] = useState({ x: 110, y: 110, clicking: false })
  const [pins, setPins] = useState<{id: number, x: number, y: number}[]>([])
  const [activePinId, setActivePinId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<{id: number, text: string, user: typeof MOCK_USERS[0]}[]>([])
  const [issueStatus, setIssueStatus] = useState<"open" | "in_progress" | "done">("open")

  // Refs for timeouts to clear them on unmount
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Tour Sequence
  useEffect(() => {
    if (!isPlaying) return

    const runStep = async () => {
      // Reset state at start of loop
      if (step === 0) {
        setPins([])
        setActivePinId(null)
        setSidebarOpen(false)
        setCommentText("")
        setComments([])
        setIssueStatus("open")
        setCursor({ x: 110, y: 80, clicking: false }) // Start off-screen
      }

      // Define timeline
      const timeline = [
        // 0. Initial pause
        { duration: 1000, action: () => {} },
        
        // 1. Move cursor to chart
        { duration: 1500, action: () => setCursor({ x: 65, y: 35, clicking: false }) },
        
        // 2. Click to pin
        { duration: 300, action: () => setCursor(prev => ({ ...prev, clicking: true })) },
        { duration: 300, action: () => {
          setCursor(prev => ({ ...prev, clicking: false }))
          setPins([{ id: 1, x: 65, y: 35 }])
          setActivePinId(1)
          setSidebarOpen(true)
        }},

        // 3. Move to comment input
        { duration: 1000, action: () => setCursor({ x: 90, y: 85, clicking: false }) },

        // 4. Type comment
        { duration: 500, action: () => setCommentText("C") },
        { duration: 100, action: () => setCommentText("Ch") },
        { duration: 100, action: () => setCommentText("Cha") },
        { duration: 100, action: () => setCommentText("Chart") },
        { duration: 100, action: () => setCommentText("Chart ") },
        { duration: 100, action: () => setCommentText("Chart c") },
        { duration: 100, action: () => setCommentText("Chart co") },
        { duration: 100, action: () => setCommentText("Chart col") },
        { duration: 100, action: () => setCommentText("Chart colo") },
        { duration: 100, action: () => setCommentText("Chart color") },
        { duration: 100, action: () => setCommentText("Chart colors") },
        { duration: 100, action: () => setCommentText("Chart colors n") },
        { duration: 100, action: () => setCommentText("Chart colors ne") },
        { duration: 100, action: () => setCommentText("Chart colors nee") },
        { duration: 100, action: () => setCommentText("Chart colors need") },
        { duration: 100, action: () => setCommentText("Chart colors need u") },
        { duration: 100, action: () => setCommentText("Chart colors need up") },
        { duration: 100, action: () => setCommentText("Chart colors need upd") },
        { duration: 100, action: () => setCommentText("Chart colors need upda") },
        { duration: 100, action: () => setCommentText("Chart colors need updat") },
        { duration: 100, action: () => setCommentText("Chart colors need update") },

        // 5. Click send
        { duration: 500, action: () => setCursor(prev => ({ ...prev, clicking: true })) },
        { duration: 300, action: () => {
          setCursor(prev => ({ ...prev, clicking: false }))
          setComments([{ id: 1, text: "Chart colors need update to match new brand guidelines.", user: MOCK_USERS[0] }])
          setCommentText("")
        }},

        // 6. Move to status
        { duration: 1000, action: () => setCursor({ x: 85, y: 15, clicking: false }) },
        
        // 7. Change status
        { duration: 500, action: () => setCursor(prev => ({ ...prev, clicking: true })) },
        { duration: 300, action: () => {
          setCursor(prev => ({ ...prev, clicking: false }))
          setIssueStatus("in_progress")
        }},

        // 8. Pause and reset
        { duration: 3000, action: () => {} },
      ]

      // Execute current step
      if (step < timeline.length) {
        timeline[step].action()
        const timeout = setTimeout(() => {
          setStep(prev => (prev + 1) % timeline.length)
        }, timeline[step].duration)
        timeoutsRef.current.push(timeout)
      }
    }

    runStep()

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [step, isPlaying])

  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      {/* Section Header */}
      <div className="text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 gap-2">
            <PlayCircle className="h-3 w-3" />
            Live Demo
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
            Experience the workflow
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how easy it is to turn feedback into tracked issues without leaving your app.
          </p>
        </motion.div>
      </div>

      {/* Demo Container */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-6xl mx-auto"
      >
        {/* Browser Frame */}
        <div className="rounded-xl border bg-background shadow-2xl overflow-hidden ring-1 ring-white/10">
          {/* Browser Chrome */}
          <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/20" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/20" />
              <div className="h-3 w-3 rounded-full bg-green-500/20" />
            </div>
            <div className="ml-4 flex-1 max-w-md h-6 bg-background rounded-md border flex items-center px-3 text-xs text-muted-foreground">
              UI Syncup
            </div>
          </div>

          {/* App Layout */}
          <div className="h-[600px] flex relative bg-background">
            
            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden cursor-crosshair">
              <MockDashboard />
              
              {/* Overlay Elements */}
              <AnimatePresence>
                {pins.map(pin => (
                  <Pin key={pin.id} x={pin.x} y={pin.y} active={activePinId === pin.id} />
                ))}
              </AnimatePresence>

              <Cursor 
                x={cursor.x} 
                y={cursor.y} 
                label="Alex Design" 
                color="text-blue-500" 
                clicking={cursor.clicking} 
              />
            </div>

            {/* Sidebar Panel - Mimicking ResponsiveIssueLayout */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: sidebarOpen ? 320 : 0, 
                opacity: sidebarOpen ? 1 : 0,
                borderLeftWidth: sidebarOpen ? 1 : 0
              }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-background border-l flex-shrink-0 flex flex-col overflow-hidden"
            >
              <div className="w-[320px] flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">ISS-124</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={issueStatus === 'open' ? 'secondary' : 'default'}
                      className={cn(
                        "transition-colors duration-300",
                        issueStatus === 'in_progress' && "bg-blue-500 hover:bg-blue-600",
                        issueStatus === 'done' && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {issueStatus === 'open' && "Open"}
                      {issueStatus === 'in_progress' && "In Progress"}
                      {issueStatus === 'done' && "Resolved"}
                    </Badge>
                    <div className="flex -space-x-2">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="bg-blue-500 text-[10px] text-white">AD</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="activity" className="flex-1 flex flex-col">
                  <div className="px-4 pt-2">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="activity" className="flex-1 flex flex-col p-0 m-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-6">
                        {/* Initial System Message */}
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Alex Design</span> created this issue
                            </p>
                            <p className="text-xs text-muted-foreground">Just now</p>
                          </div>
                        </div>

                        {/* Comments */}
                        <AnimatePresence mode="popLayout">
                          {comments.map((comment) => (
                            <motion.div
                              key={comment.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3"
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className={cn("text-xs text-white", comment.user.color)}>
                                  {comment.user.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-sm font-medium">{comment.user.name}</span>
                                  <span className="text-xs text-muted-foreground">Just now</span>
                                </div>
                                <div className="text-sm bg-muted/30 p-3 rounded-lg">
                                  {comment.text}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Status Change Event */}
                        {issueStatus !== 'open' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center gap-2 py-2"
                          >
                            <div className="h-px flex-1 bg-border" />
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              changed status to {issueStatus.replace('_', ' ')}
                            </Badge>
                            <div className="h-px flex-1 bg-border" />
                          </motion.div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-background">
                      <div className="relative">
                        <div className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                          {commentText}
                          {commentText.length === 0 && <span className="text-muted-foreground">Add a comment...</span>}
                          {commentText.length > 0 && <span className="animate-pulse">|</span>}
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          <Button size="icon" className="h-6 w-6">
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Play/Pause Control */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {isPlaying ? "Pause Demo" : "Resume Demo"}
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
