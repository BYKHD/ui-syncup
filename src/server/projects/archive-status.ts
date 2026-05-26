/**
 * Archive-status helpers.
 *
 * Kept as a leaf module so it can be imported by permission layers
 * (`src/server/auth/rbac.ts`, `src/server/annotations/permission-utils.ts`)
 * without pulling in `project-service.ts`, which depends on rbac and would
 * create an import cycle.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/server/db/schema/projects";

/**
 * Returns true when the project exists, is not soft-deleted, and has
 * status === 'archived'. Permission checks use this to freeze writes on
 * archived projects.
 */
export async function isProjectArchived(projectId: string): Promise<boolean> {
  const row = await db
    .select({ status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  return row[0]?.status === "archived";
}
