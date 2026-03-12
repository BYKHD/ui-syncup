import { Separator } from '@/components/ui/separator';
import { RiTeamLine, RiCheckboxCircleLine, RiPieChartLine } from '@remixicon/react';

interface ProjectStats {
  memberCount: number;
  totalTickets: number;
  completedTickets: number;
  progressPercent: number;
}

interface ProjectStatsProps {
  stats: ProjectStats;
}

/**
 * ProjectStats
 * Displays project statistics: member count, issue completion, and progress percentage
 */
export function ProjectStats({ stats }: ProjectStatsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground/80 font-medium">
      <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
        <RiTeamLine className="h-3.5 w-3.5" />
        <span>
          {stats.memberCount} member{stats.memberCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      <Separator orientation="vertical" className="h-3" />
      
      <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
        <RiCheckboxCircleLine className="h-3.5 w-3.5" />
        <span>
          {stats.completedTickets}/{stats.totalTickets} issues
        </span>
      </div>

      <Separator orientation="vertical" className="h-3" />

      <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
        <RiPieChartLine className="h-3.5 w-3.5" />
        <span>{stats.progressPercent}%</span>
      </div>
    </div>
  );
}
