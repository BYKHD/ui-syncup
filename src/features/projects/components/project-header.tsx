import React, { type MouseEventHandler, type ReactNode, useId } from 'react';

import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@components/ui/dropdown-menu';
import { cn } from '@lib/utils';
import { IssuesCreateDialog } from '@features/issues/components/issues-create-dialog';
import { ProjectMemberManager } from '@features/projects/components/project-member-manager';
import {
  RiMore2Line,
  RiEditLine,
  RiTeamLine,
  RiDeleteBinLine,
} from '@remixicon/react';

type ButtonProps = React.ComponentProps<typeof Button>;

export type ProjectHeaderAction = {
  label: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
} & Pick<ButtonProps, 'variant' | 'size' | 'disabled' | 'className'>;

interface ProjectHeaderProps {
  title: string;
  description?: string;
  projectId: string;
  userRole?: 'owner' | 'editor' | 'member' | 'viewer' | null;
  children?: ReactNode;
  hideSeparator?: boolean;
  className?: string;
}

/**
 * ProjectHeader
 * - Provides a consistent shell for top-of-page context (title, description, create issue button).
 * - Uses shadcn primitives for the create issue button and visual rhythm.
 */
export default function ProjectHeader({
  title,
  description,
  projectId,
  userRole,
  children,
  className,
}: ProjectHeaderProps) {
  const id = useId();
  const titleId = `page-header-title-${id}`;
  const descId = description ? `page-header-description-${id}` : undefined;

  const handleRename = () => {
    console.log("Rename project:", projectId);
    // TODO: Implement rename functionality
  };

  const handleDelete = () => {
    console.log("Delete project:", projectId);
    // TODO: Implement delete functionality with confirmation
  };

  return (
    <div className={cn('space-y-6', className)}>
      <header
        className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="space-y-1">
          <h1 id={titleId} className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p id={descId} className="text-base text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <RiMore2Line />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRename}>
                <RiEditLine className="h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <ProjectMemberManager
                projectId={projectId}
                projectName={title}
                userRole={userRole || null}
                canManageMembers={userRole === 'owner' || userRole === 'editor'}
              >
                <DropdownMenuItem>
                  <RiTeamLine className="h-4 w-4" />
                  <span>Members</span>
                </DropdownMenuItem>
              </ProjectMemberManager>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} variant="destructive">
                <RiDeleteBinLine className="h-4 w-4" />
                <span>Delete project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <IssuesCreateDialog projectId={projectId}>
            <Button>Add Issue</Button>
          </IssuesCreateDialog>
        </div>
      </header>

      {children ? <div className="grid gap-4">{children}</div> : null}

    </div>
  );
}

