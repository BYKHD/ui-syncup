import { RiTeamLine } from '@remixicon/react';

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
    <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <RiTeamLine className="h-4 w-4" />
        <span>
          {stats.memberCount} member{stats.memberCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div>
        {stats.completedTickets} of {stats.totalTickets} issues completed
      </div>
      <div>{stats.progressPercent}% progress</div>
    </div>
  );
}
