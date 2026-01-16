"use client"

import { motion } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Github, Star, GitFork, BookOpen, Terminal, Heart } from "lucide-react"
import { SectionHeader } from "./section-header"

const openSourceFeatures = [
  {
    icon: Terminal,
    title: "Easy Setup",
    description: "Get started with a single command. Docker Compose ready."
  },
  {
    icon: BookOpen,
    title: "Well Documented",
    description: "Comprehensive docs for setup, customization, and contribution."
  },
  {
    icon: Heart,
    title: "Community Driven",
    description: "Built by developers, for developers. PRs welcome!"
  }
]

export function OpenSourceSection() {
  return (
    <section id="open-source" className="container mx-auto px-4 py-24 relative overflow-hidden">
      <SectionHeader
        badge="MIT Licensed"
        title="100% Open Source"
        description="No hidden costs, no vendor lock-in. Deploy UI SyncUp on your own terms."
      />

      <div className="mt-16 max-w-5xl mx-auto">
        {/* GitHub CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative p-6 bg-background rounded-2xl border shadow-lg">
                      <Github className="h-16 w-16" />
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3">
                    Star us on GitHub
                  </h3>
                  <p className="text-muted-foreground text-lg mb-6">
                    Help us grow the community. Your stars help others discover UI SyncUp 
                    and motivate us to keep improving.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <a 
                      href="https://github.com/BYKHD/ui-syncup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button size="lg" className="gap-2 w-full sm:w-auto">
                        <Star className="h-4 w-4" />
                        Star Repository
                      </Button>
                    </a>
                    <a 
                      href="https://github.com/BYKHD/ui-syncup/fork" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                        <GitFork className="h-4 w-4" />
                        Fork & Contribute
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {openSourceFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-6 rounded-xl bg-muted/30 border"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <Terminal className="h-3 w-3" />
                Quick Start
              </Badge>
              <code className="text-sm bg-background px-4 py-2 rounded-lg border font-mono">
                git clone https://github.com/BYKHD/ui-syncup.git && cd ui-syncup && bun install
              </code>
            </div>
            <a 
              href="https://github.com/BYKHD/ui-syncup#getting-started" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                View Docs
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
