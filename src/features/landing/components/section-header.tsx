"use client"

import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  description?: string
  badge?: string
  icon?: React.ElementType
  align?: "center" | "left"
  className?: string
}

export function SectionHeader({
  title,
  description,
  badge,
  icon: Icon,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 mb-16",
        align === "center" ? "text-center items-center" : "text-left items-start",
        className
      )}
    >
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="gap-2 py-1.5 px-4 text-sm font-medium backdrop-blur-sm bg-background/50">
            {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
            {badge}
          </Badge>
        </motion.div>
      )}

      <div className="space-y-4 max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
        >
          {title}
        </motion.h2>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            {description}
          </motion.p>
        )}
      </div>
    </div>
  )
}
