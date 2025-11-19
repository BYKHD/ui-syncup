"use client"

import { Button } from "@/components/ui/button"
import { motion } from "motion/react"
import { ArrowRight, MessageSquare, CheckCircle2, MousePointer2 } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Close the loop between design and implementation
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Pin feedback on mockups, turn comments into issues, track every UI detail from design review to production.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Link href="/sign-up">
              <Button size="lg" className="w-full min-[400px]:w-auto gap-2">
                Start free workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="w-full min-[400px]:w-auto">
                Book a demo
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Interactive Annotation Board Mock */}
        <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none">
          <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted/50 shadow-2xl">
            {/* Mock UI Background */}
            <div className="absolute inset-0 bg-background p-6 grid gap-4 content-start opacity-80">
              <div className="h-8 w-1/3 rounded-md bg-muted" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-32 rounded-md bg-muted" />
                <div className="h-32 rounded-md bg-muted" />
                <div className="h-32 rounded-md bg-muted" />
              </div>
              <div className="h-8 w-1/2 rounded-md bg-muted" />
              <div className="h-24 rounded-md bg-muted" />
            </div>

            {/* Interactive Pins */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute top-1/4 left-1/4"
            >
              <div className="relative group cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                  <MousePointer2 className="h-4 w-4" />
                </div>
                <div className="absolute left-full top-0 ml-2 w-48 rounded-md border bg-background p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-medium">Padding should be 24px</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                    <span>@alex</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="absolute bottom-1/3 right-1/3"
            >
              <div className="relative group cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg ring-4 ring-background">
                  <MessageSquare className="h-4 w-4" />
                </div>
                 <div className="absolute right-full top-0 mr-2 w-48 rounded-md border bg-background p-3 shadow-xl opacity-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-destructive">BUG-12</span>
                    <span className="text-[10px] text-muted-foreground">Just now</span>
                  </div>
                  <p className="text-xs font-medium">Button alignment is off on mobile</p>
                </div>
              </div>
            </motion.div>

            {/* Side Panel Mock */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              transition={{ delay: 0.8, type: "spring", damping: 20 }}
              className="absolute right-0 top-0 bottom-0 w-1/3 border-l bg-background/95 backdrop-blur p-4 flex flex-col gap-3"
            >
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="space-y-2">
                <div className="rounded border p-2 text-[10px] shadow-sm bg-card">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="font-medium">Resolved</span>
                  </div>
                  <p className="text-muted-foreground line-through">Wrong color code</p>
                </div>
                <div className="rounded border p-2 text-[10px] shadow-sm bg-card border-primary/20">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="font-medium">In Review</span>
                  </div>
                  <p>Header spacing update</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
