"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"
import { Check, Github, Server } from "lucide-react"
import Link from "next/link"
import { SectionHeader } from "./section-header"

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      <SectionHeader
        badge="Open Source"
        title="Free forever. Self-host anywhere."
        description="UI SyncUp is fully open source. Deploy on your own infrastructure with complete control."
      />

      <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Cloud Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
        >
          <Card className="flex flex-col h-full relative overflow-hidden transition-all duration-500 hover:border-primary/20 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Server className="h-5 w-5" />
                Cloud Hosted
              </CardTitle>
              <CardDescription>Get started instantly with our hosted version</CardDescription>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-muted-foreground text-sm">during beta</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {[
                  "Instant setup",
                  "Automatic updates",
                  "Managed infrastructure",
                  "Community support",
                  "All features included",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Link href="/sign-up" className="w-full">
                <Button className="w-full" variant="default" size="lg">
                  Get Started Free
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Self-hosted Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Card className="flex flex-col h-full relative overflow-hidden transition-all duration-500 hover:border-primary/20 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Github className="h-5 w-5" />
                Self-Hosted
              </CardTitle>
              <CardDescription>Deploy on your own infrastructure</CardDescription>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-muted-foreground text-sm">forever</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {[
                  "Full source code access",
                  "Deploy anywhere (Docker, VPS, cloud)",
                  "Configure your own limits",
                  "Complete data ownership",
                  "MIT License",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <a 
                href="https://github.com/your-org/ui-syncup" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full" variant="outline" size="lg">
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                </Button>
              </a>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-12">
        Configure resource limits via environment variables. No artificial restrictions.
      </p>
    </section>
  )
}
