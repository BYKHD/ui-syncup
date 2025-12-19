"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"
import { ArrowRight, CheckCircle2, Clock, Zap } from "lucide-react"
import { SectionHeader } from "./section-header"
import { INTEGRATION_LIST } from "@/config/integrations"

export function IntegrationsSection() {
  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      <SectionHeader
        title="Seamlessly connects with your workflow"
        description="Import from Figma, sync with your project management tools, and keep everyone aligned."
        badge="Integrations"
        icon={Zap}
      />

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {INTEGRATION_LIST.map((tool, index) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-muted/40 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-xl ${tool.bg} ${tool.border} border`}>
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <Badge
                    variant={tool.status === "Ready" ? "default" : "secondary"}
                    className="gap-1.5"
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
                </div>

                <h3 className="text-2xl font-bold mb-2">{tool.name}</h3>
                <p className="text-muted-foreground mb-6">
                  {tool.description}
                </p>

                <div className="space-y-3 mb-8">
                  {tool.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`h-1.5 w-1.5 rounded-full ${tool.bg.replace('/10', '')}`} />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform cursor-pointer">
                  {tool.status === "Ready" ? "Connect now" : "Join waitlist"}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Hover Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.color.replace('text-', 'from-')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
