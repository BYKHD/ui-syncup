"use client"

import { cn } from "@/lib/utils"
import type { Team } from "./type"

// ============================================================================
// TYPES AND CONSTANTS
// ============================================================================

interface TeamAvatarProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg';
  showFallback?: boolean;
  className?: string;
}

// Visual design specifications for team avatars
const TEAM_AVATAR_STYLES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm', 
  lg: 'h-12 w-12 text-base'
} as const;

// Random Tailwind colors for avatar fallbacks
const TEAM_AVATAR_FALLBACK_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-sky-500'
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate consistent team initials from team name
 * Takes first character of first two words, uppercase
 */
export function generateTeamInitials(teamName: string): string {
  return teamName
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 1) // Take only first initial
    .join('');
}

/**
 * Get consistent color for team based on team ID
 * Uses simple hash function to ensure same team always gets same color
 */
function getTeamAvatarColor(teamId: string): string {
  const colors = TEAM_AVATAR_FALLBACK_COLORS;
  const hash = teamId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

// ============================================================================
// TEAM AVATAR COMPONENT
// ============================================================================

export function TeamAvatar({ 
  team, 
  size = 'md', 
  showFallback = true, 
  className 
}: TeamAvatarProps) {
  const sizeClasses = TEAM_AVATAR_STYLES[size];
  const fallbackColor = getTeamAvatarColor(team.id);
  const initials = generateTeamInitials(team.name);

  // If team has an image, show it
  if (team.image) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-full overflow-hidden",
        sizeClasses,
        className
      )}>
        <img
          src={team.image}
          alt={`${team.name} avatar`}
          className="h-full w-full object-cover"
          onError={(e) => {
            // If image fails to load and fallback is enabled, show initials
            if (showFallback) {
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="flex items-center justify-center h-full w-full ${fallbackColor} text-white font-medium">${initials}</div>`;
              }
            }
          }}
        />
      </div>
    );
  }

  // Show fallback with initials and random color
  if (showFallback) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-full font-medium text-white",
        sizeClasses,
        fallbackColor,
        className
      )}>
        {initials}
      </div>
    );
  }

  // No image and no fallback - show empty placeholder
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full bg-muted",
      sizeClasses,
      className
    )} />
  );
}