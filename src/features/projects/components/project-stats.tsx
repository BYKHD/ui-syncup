import { RiTeamLine } from '@remixicon/react';

interface ProjectStatsProps {
  memberCount: number;
  tickets: number;
  ticketsDone: number;
  progressPercent: number;
}

/**
 * ProjectStats
 * Displays project statistics: member count, issue completion, and progress percentage
 */
export function ProjectStats({
  memberCount,
  tickets,
  ticketsDone,
  progressPercent,
}: ProjectStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <RiTeamLine className="h-4 w-4" />
        <span>
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div>
        {ticketsDone} of {tickets} issues completed
      </div>
      <div>{progressPercent}% progress</div>
    </div>
  );
}
