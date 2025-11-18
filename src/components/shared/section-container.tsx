import { cn } from "@/lib/utils"

interface SectionContainerProps {
  children: React.ReactNode
  className?: string
  id?: string
  variant?: "default" | "muted"
}

/**
 * Reusable section wrapper for landing page sections
 * Provides consistent spacing, max-width, and optional background variants
 */
export function SectionContainer({
  children,
  className,
  id,
  variant = "default",
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={cn(
        "w-full py-16 md:py-24",
        variant === "muted" && "bg-muted/30",
        className
      )}
    >
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">{children}</div>
    </section>
  )
}
