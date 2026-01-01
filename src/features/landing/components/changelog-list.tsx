import { changelogData } from "@/config/changelog"
import { ChangelogItem } from "./changelog-item"

export function ChangelogList() {
  return (
    <div className="relative">
      {changelogData.map((item, index) => (
        <ChangelogItem 
          key={item.version} 
          item={item} 
          isLatest={index === 0} 
        />
      ))}
    </div>
  )
}
