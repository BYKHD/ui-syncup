/**
 * Project Utilities
 * 
 * Utility functions for project operations including slug generation and validation.
 */

import { db } from "@/lib/db";
import { projects } from "@/server/db/schema/projects";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Generates a URL-friendly slug from a project name
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 * Only allows lowercase letters, numbers, and hyphens
 * 
 * @param name - Project name to convert to slug
 * @returns URL-friendly slug
 * 
 * @example
 * ```ts
 * generateSlug("Marketing Site") // "marketing-site"
 * generateSlug("UI/UX Design") // "uiux-design"
 * generateSlug("  Project  123  ") // "project-123"
 * ```
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove all except letters, numbers, spaces, hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Ensures slug uniqueness within a team by appending numeric suffix if needed
 * Only checks against non-deleted projects (deletedAt IS NULL)
 * 
 * @param teamId - Team ID to check uniqueness within
 * @param baseSlug - Base slug to make unique
 * @returns Unique slug for the team
 * 
 * @example
 * ```ts
 * // If "marketing" exists, returns "marketing-1"
 * await ensureUniqueSlug("team_123", "marketing")
 * ```
 */
export async function ensureUniqueSlug(
  teamId: string,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    // Check if slug exists among non-deleted projects in this team
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.teamId, teamId),
        eq(projects.slug, slug),
        isNull(projects.deletedAt)
      ),
    });

    if (!existing) {
      return slug;
    }

    // Append counter and try again
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Generates a unique slug from a project name within a team
 * Combines slug generation and uniqueness checking
 * 
 * @param teamId - Team ID to check uniqueness within
 * @param name - Project name to convert to slug
 * @returns Unique URL-friendly slug for the team
 * 
 * @example
 * ```ts
 * await generateUniqueSlug("team_123", "Marketing Site")
 * // Returns "marketing-site" or "marketing-site-1" if exists
 * ```
 */
export async function generateUniqueSlug(
  teamId: string,
  name: string
): Promise<string> {
  const baseSlug = generateSlug(name);
  return ensureUniqueSlug(teamId, baseSlug);
}

/**
 * Validates a project key format
 * Keys must be 2-10 uppercase letters
 * 
 * @param key - Project key to validate
 * @returns True if key is valid
 * 
 * @example
 * ```ts
 * validateProjectKey("MKT") // true
 * validateProjectKey("PROJ") // true
 * validateProjectKey("A") // false (too short)
 * validateProjectKey("mkt") // false (not uppercase)
 * validateProjectKey("MKT123") // false (contains numbers)
 * ```
 */
export function validateProjectKey(key: string): boolean {
  return /^[A-Z]{2,10}$/.test(key);
}

/**
 * Validates a project name
 * Names must be 1-100 characters and not empty/whitespace-only
 * 
 * @param name - Project name to validate
 * @returns True if name is valid
 */
export function validateProjectName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 100;
}
