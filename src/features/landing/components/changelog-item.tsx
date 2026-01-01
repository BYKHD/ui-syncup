import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChangelogItem as ChangelogItemType } from "@/config/changelog"
import { Circle, Tag, Wrench, Star } from "lucide-react"

interface ChangelogItemProps {
  item: ChangelogItemType
  isLatest?: boolean
}

export function ChangelogItem({ item, isLatest }: ChangelogItemProps) {
  return (
    <div className="flex gap-8 relative pb-12 last:pb-0">
      {/* Timeline Line */}
      <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border last:hidden" />

      {/* Version Marker */}
      <div className="flex-none pt-1 relative z-10">
        <div className={cn(
          "h-10 w-10 rounded-full border-2 flex items-center justify-center bg-background",
          isLatest ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
        )}>
          <Tag className="h-5 w-5" />
        </div>
      </div>

      <div className="flex-1 space-y-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold tracking-tight">v{item.version}</h2>
          {isLatest && <Badge variant="default">Latest</Badge>}
          <span className="text-muted-foreground text-sm">{item.date}</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{item.title}</h3>
          <p className="text-muted-foreground max-w-2xl">{item.description}</p>
        </div>

        <div className="space-y-3 pt-2">
          {item.changes.map((change, index) => (
            <div key={index} className="flex gap-3 text-sm items-start max-w-2xl">
              <div className="mt-1">
                {change.type === 'feature' && <Star className="h-4 w-4 text-purple-500" />}
                {change.type === 'fix' && <Wrench className="h-4 w-4 text-blue-500" />}
                {change.type === 'improvement' && <Circle className="h-4 w-4 text-green-500" />}
              </div>
              <span className="leading-6">
                <span className="font-medium mr-1 uppercase text-xs opacity-70 tracking-wide">
                  [{change.type}]
                </span>
                {change.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
