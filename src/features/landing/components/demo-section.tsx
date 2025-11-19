"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Calendar, Tag } from "lucide-react"

export function DemoSection() {
  const [activePin, setActivePin] = useState<string | null>(null)

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">See it in action</h2>
        <p className="text-muted-foreground text-lg">Interactive feedback that feels like part of your app.</p>
      </div>

      <div className="rounded-xl border bg-background shadow-2xl overflow-hidden max-w-6xl mx-auto h-[600px] flex">
        {/* Mock App Area */}
        <div className="flex-1 bg-muted/20 relative p-8 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-12 gap-4 p-8 opacity-50 pointer-events-none">
            <div className="col-span-3 bg-muted rounded-lg h-full" />
            <div className="col-span-9 space-y-4">
              <div className="h-16 bg-muted rounded-lg w-full" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-40 bg-muted rounded-lg" />
                <div className="h-40 bg-muted rounded-lg" />
                <div className="h-40 bg-muted rounded-lg" />
              </div>
              <div className="h-96 bg-muted rounded-lg w-full" />
            </div>
          </div>

          {/* Interactive Pins */}
          <div className="absolute inset-0">
             <Pin 
              x="25%" 
              y="15%" 
              active={activePin === "pin-1"} 
              onClick={() => setActivePin("pin-1")}
            />
             <Pin 
              x="60%" 
              y="35%" 
              active={activePin === "pin-2"} 
              onClick={() => setActivePin("pin-2")}
            />
             <Pin 
              x="80%" 
              y="60%" 
              active={activePin === "pin-3"} 
              onClick={() => setActivePin("pin-3")}
            />
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="w-80 border-l bg-background flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Issue Details</h3>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">OPEN</Badge>
                      <span className="text-xs text-muted-foreground">ISS-{activePin.split('-')[1]}</span>
                    </div>
                    <h4 className="font-medium text-lg">
                      {activePin === "pin-1" && "Sidebar navigation alignment"}
                      {activePin === "pin-2" && "Card shadow is too heavy"}
                      {activePin === "pin-3" && "Chart colors don't match theme"}
                    </h4>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <span>John Doe</span>
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

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>ME</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          Can we adjust this to match the new design system specs?
                        </div>
                        <span className="text-xs text-muted-foreground">2m ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>Select a pin to view issue details</p>
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </div>
    </section>
  )
}

function Pin({ x, y, active, onClick }: { x: string, y: string, active: boolean, onClick: () => void }) {
  return (
    <motion.button
      className={`absolute h-8 w-8 -ml-4 -mt-4 rounded-full flex items-center justify-center shadow-lg transition-colors ${active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-background text-foreground hover:bg-primary hover:text-primary-foreground'}`}
      style={{ left: x, top: y }}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <div className={`h-3 w-3 rounded-full ${active ? 'bg-white' : 'bg-primary'}`} />
    </motion.button>
  )
}
