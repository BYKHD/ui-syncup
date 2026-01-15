import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Generates a URL-friendly slug from a team name
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 * Only allows lowercase letters, numbers, and hyphens
 */
export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove all except letters, numbers, spaces, hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Fallback for names that result in empty slug (e.g. non-ASCII names)
  if (!slug) {
    return `team-${crypto.randomUUID().slice(0, 8)}`;
  }

  return slug;
}

/**
 * Ensures slug uniqueness by appending numeric suffix if needed
 * Only checks against non-deleted teams (deletedAt IS NULL)
 */
export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    // Check if slug exists among non-deleted teams
    const existing = await db.query.teams.findFirst({
      where: and(eq(teams.slug, slug), isNull(teams.deletedAt)),
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
 * Generates a unique slug from a team name
 * Combines slug generation and uniqueness checking
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  return ensureUniqueSlug(baseSlug);
}
