"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"
import { Figma, Trello, ArrowRight, CheckCircle2, Clock, Zap } from "lucide-react"
import { useState } from "react"

const integrations = [
  {
    name: "Figma",
    icon: Figma,
    status: "Ready",
    description: "Import designs, sync frames, and annotate mockups in real-time",
    features: ["Live frame sync", "Auto-import designs", "Two-way comments"],
    color: "from-purple-500 to-pink-500"
  },
  {
    name: "Jira",
    icon: Trello, // Using Trello icon as Jira placeholder
    status: "Coming Soon",
    description: "Seamlessly sync issues between UI SyncUp and Jira projects",
    features: ["Bi-directional sync", "Custom field mapping", "Status automation"],
    color: "from-blue-500 to-cyan-500"
  },
]

function SyncAnimation() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="relative w-24 h-24">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 border-2 border-primary/30 rounded-full"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 2,
              delay: i * 0.7,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function DataFlowDots({ delay = 0 }: { delay?: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-primary"
          initial={{ x: -20, opacity: 0 }}
          animate={{
            x: [0, 100, 200],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            delay: delay + (i * 0.4),
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ top: `${30 + (i * 20)}%` }}
        />
      ))}
    </>
  )
}

export function IntegrationsSection() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <Badge variant="outline" className="mb-4 gap-2">
          <Zap className="h-3 w-3" />
          Powerful Integrations
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
          Seamlessly connects with your workflow
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Import from Figma, sync with your project management tools, and keep everyone aligned.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto relative">
        {/* Connecting line animation */}
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 pointer-events-none z-0">
          <DataFlowDots delay={0} />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            animate={{ x: [-100, 100] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {integrations.map((tool, index) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2, duration: 0.6 }}
            onHoverStart={() => setHoveredCard(tool.name)}
            onHoverEnd={() => setHoveredCard(null)}
            style={{ perspective: 1000 }}
          >
            <Card className="relative overflow-hidden h-full">
              <motion.div
                animate={{
                  rotateY: hoveredCard === tool.name ? 5 : 0,
                  rotateX: hoveredCard === tool.name ? 5 : 0,
                  scale: hoveredCard === tool.name ? 1.02 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="p-8 h-full flex flex-col"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                {/* Status badge */}
                <div className="flex items-center justify-between mb-6">
                  <Badge
                    variant={tool.status === "Ready" ? "default" : "secondary"}
                    className="gap-1.5 text-xs"
                  >
                    {tool.status === "Ready" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Live Now
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        {tool.status}
                      </>
                    )}
                  </Badge>

                  {tool.status === "Ready" && hoveredCard === tool.name && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <SyncAnimation />
                    </motion.div>
                  )}
                </div>

                {/* Icon and name */}
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className={`relative p-4 rounded-2xl bg-gradient-to-br ${tool.color} shadow-lg`}
                    animate={{
                      boxShadow: hoveredCard === tool.name
                        ? "0 20px 40px rgba(0,0,0,0.2)"
                        : "0 10px 20px rgba(0,0,0,0.1)"
                    }}
                  >
                    <tool.icon className="h-8 w-8 text-white" />

                    {/* Animated sync indicator for Figma */}
                    {tool.status === "Ready" && hoveredCard === tool.name && (
                      <motion.div
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 ring-4 ring-background"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full bg-green-500"
                          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </motion.div>
                    )}

                    {/* Coming soon progress indicator */}
                    {tool.status === "Coming Soon" && hoveredCard === tool.name && (
                      <motion.div
                        className="absolute -bottom-2 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          initial={{ width: "0%" }}
                          animate={{ width: "75%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </motion.div>
                    )}
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-bold">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">Integration</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6 flex-1">
                  {tool.description}
                </p>

                {/* Features list */}
                <div className="space-y-2 mb-6">
                  {tool.features.map((feature, i) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${tool.color}`} />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.div
                  className="flex items-center gap-2 text-sm font-medium text-primary group/link cursor-pointer"
                  whileHover={{ x: 5 }}
                >
                  {tool.status === "Ready" ? "Connect now" : "Join waitlist"}
                  <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                </motion.div>
              </motion.div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="text-center text-sm text-muted-foreground mt-12"
      >
        More integrations coming soon. Request your favorite tool in our community.
      </motion.p>
    </section>
  )
}
