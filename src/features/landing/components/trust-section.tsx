"use client"

import { ShieldCheck, Lock, Server, Github, Code2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "motion/react"

export function TrustSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30 border-t">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Badge variant="outline" className="mb-4 gap-2">
            <Code2 className="h-3 w-3" />
            Open Source
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">Built in the open, for everyone</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Modern Stack</h3>
                <p className="text-muted-foreground">Built with Next.js, Postgres, and Drizzle for speed and reliability.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure by Design</h3>
                <p className="text-muted-foreground">Strict role-based access control (RBAC) ensures data privacy.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Self-Host Anywhere</h3>
                <p className="text-muted-foreground">Deploy on your own infrastructure with Docker, VPS, or any cloud provider.</p>
              </div>
            </div>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-background p-8 rounded-2xl border shadow-sm"
        >
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-muted/50 rounded-full">
              <Github className="h-12 w-12" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Join the Community</h3>
              <p className="text-muted-foreground">
                UI SyncUp is MIT licensed. Contribute, customize, and make it your own.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Code2 className="h-5 w-5 text-primary" />
                  <span>MIT</span>
                </div>
                <p className="text-xs text-muted-foreground">License</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Users className="h-5 w-5 text-primary" />
                  <span>100%</span>
                </div>
                <p className="text-xs text-muted-foreground">Free Forever</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Server className="h-5 w-5 text-primary" />
                  <span>∞</span>
                </div>
                <p className="text-xs text-muted-foreground">Self-Host</p>
              </div>
            </div>
            
            <a 
              href="https://github.com/BYKHD/ui-syncup" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full gap-2">
                <Github className="h-4 w-4" />
                Star on GitHub
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
