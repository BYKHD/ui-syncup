import type { ProjectRole } from '@/features/projects/types'

export function getRoleDisplayName(role: ProjectRole): string {
  const roleNames: Record<ProjectRole, string> = {
    owner: 'Owner',
    editor: 'Editor',
    member: 'Member',
    viewer: 'Viewer',
  }
  return roleNames[role]
}

export function getRoleBadgeVariant(
  role: ProjectRole
): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'owner':
      return 'default'
    case 'editor':
      return 'secondary'
    case 'member':
    case 'viewer':
      return 'outline'
  }
}
