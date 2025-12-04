import { Badge } from '@/components/ui/badge';
import { RiLockLine, RiGlobalLine, RiVipCrownLine } from '@remixicon/react';

interface ProjectTitleSectionProps {
  name: string;
  description?: string | null;
  visibility: 'private' | 'public';
  userRole?: 'owner' | 'editor' | 'member' | 'viewer' | null;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'owner':
      return 'default';
    case 'editor':
      return 'secondary';
    case 'member':
    case 'viewer':
    default:
      return 'outline';
  }
};

const getRoleDisplayName = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * ProjectTitleSection
 * Displays project name, description, visibility badge, and user role badge
 */
export function ProjectTitleSection({
  name,
  description,
  visibility,
  userRole,
}: ProjectTitleSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h1>

        <div className="flex items-center gap-2">
          {/* Visibility indicator */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground"
            title={`This project is ${visibility}`}
          >
            {visibility === 'private' ? (
              <RiLockLine className="h-3 w-3" />
            ) : (
              <RiGlobalLine className="h-3 w-3" />
            )}
            <span className="capitalize">{visibility}</span>
          </div>

          {/* User role badge - only show if owner or editor for cleaner look */}
          {userRole && (userRole === 'owner' || userRole === 'editor') && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-secondary/80"
            >
              {userRole}
            </Badge>
          )}
        </div>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
