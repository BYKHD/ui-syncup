import { Badge } from '@components/ui/badge';
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
    <div className="space-y-3 flex-1">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{name}</h1>

        {/* Visibility indicator */}
        <div className="flex items-center gap-1">
          {visibility === 'private' ? (
            <RiLockLine className="h-4 w-4 text-muted-foreground" />
          ) : (
            <RiGlobalLine className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground capitalize">
            {visibility}
          </span>
        </div>

        {/* User role badge */}
        {userRole && (
          <div className="flex items-center gap-1">
            {userRole === 'owner' && (
              <RiVipCrownLine className="h-3 w-3 text-yellow-500" />
            )}
            <Badge variant={getRoleBadgeVariant(userRole)}>
              {getRoleDisplayName(userRole)}
            </Badge>
          </div>
        )}
      </div>

      {description && (
        <p className="text-muted-foreground max-w-3xl">{description}</p>
      )}
    </div>
  );
}
