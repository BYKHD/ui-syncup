// src/server/setup/sample-data-service.ts

/**
 * Sample Data Service
 * 
 * Creates demo data for exploring the platform features.
 * Idempotent: checks for existing demo project before creating.
 */

import { db } from "@/lib/db";
import { projects, projectMembers, issues } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

const DEMO_PROJECT_SLUG = "demo-project";
const DEMO_PROJECT_KEY = "DEMO";

/**
 * Options for sample data creation
 */
export interface CreateSampleDataOptions {
  teamId: string;
  userId: string;
}

/**
 * Result of sample data creation
 */
export interface CreateSampleDataResult {
  projectId: string;
  issueCount: number;
  alreadyExisted: boolean;
}

/**
 * Create a sample project with demo data.
 * 
 * Idempotent: If a demo project already exists in the team,
 * returns the existing project without creating duplicates.
 * 
 * @param options - Options including team and user IDs
 * @returns Result with project ID and whether it was newly created
 */
export async function createSampleProject(
  options: CreateSampleDataOptions
): Promise<CreateSampleDataResult> {
  const { teamId, userId } = options;

  // Check if demo project already exists
  const existingProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.teamId, teamId),
      eq(projects.slug, DEMO_PROJECT_SLUG)
    ),
  });

  if (existingProject) {
    logger.info("Demo project already exists, skipping creation", {
      projectId: existingProject.id,
      teamId,
    });

    // Count existing issues
    const existingIssues = await db.query.issues.findMany({
      where: eq(issues.projectId, existingProject.id),
      columns: { id: true },
    });

    return {
      projectId: existingProject.id,
      issueCount: existingIssues.length,
      alreadyExisted: true,
    };
  }

  // Create demo project
  const [project] = await db.insert(projects).values({
    teamId: teamId,
    name: "Demo Project",
    slug: DEMO_PROJECT_SLUG,
    key: DEMO_PROJECT_KEY,
    description: "Sample project to explore UI SyncUp features. Feel free to edit or delete this project.",
    visibility: "private",
  }).returning({ id: projects.id });

  if (!project) {
    throw new Error("Failed to create demo project");
  }

  // Add user as project owner
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId,
    role: "owner",
  });

  // Create sample issues
  const sampleIssues = getSampleIssues(project.id, teamId, userId);
  
  if (sampleIssues.length > 0) {
    await db.insert(issues).values(sampleIssues);
  }

  logger.info("Demo project created with sample data", {
    projectId: project.id,
    teamId,
    issueCount: sampleIssues.length,
  });

  return {
    projectId: project.id,
    issueCount: sampleIssues.length,
    alreadyExisted: false,
  };
}

/**
 * Check if sample data exists for a team.
 * 
 * @param teamId - Team ID to check
 * @returns true if demo project exists
 */
export async function hasSampleData(teamId: string): Promise<boolean> {
  const existingProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.teamId, teamId),
      eq(projects.slug, DEMO_PROJECT_SLUG)
    ),
    columns: { id: true },
  });

  return existingProject !== null;
}

/**
 * Delete sample data for a team.
 * 
 * @param teamId - Team ID
 */
export async function deleteSampleData(teamId: string): Promise<void> {
  const existingProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.teamId, teamId),
      eq(projects.slug, DEMO_PROJECT_SLUG)
    ),
    columns: { id: true },
  });

  if (existingProject) {
    // Delete will cascade to issues and members
    await db.delete(projects).where(eq(projects.id, existingProject.id));
    
    logger.info("Demo project deleted", {
      projectId: existingProject.id,
      teamId,
    });
  }
}

/**
 * Generate sample issues for the demo project.
 */
function getSampleIssues(projectId: string, teamId: string, reporterId: string) {
  const now = new Date();
  
  return [
    {
      projectId,
      teamId,
      issueKey: `${DEMO_PROJECT_KEY}-1`,
      issueNumber: 1,
      reporterId,
      title: "Welcome to UI SyncUp!",
      description: "This is a sample issue to help you explore the platform. Try adding annotations, comments, and changing the status.",
      status: "open" as const,
      priority: "medium" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      projectId,
      teamId,
      issueKey: `${DEMO_PROJECT_KEY}-2`,
      issueNumber: 2,
      reporterId,
      title: "Button alignment needs adjustment",
      description: "The primary CTA button on the landing page is slightly off-center on mobile viewports. See attached annotation for details.",
      status: "open" as const,
      priority: "high" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      projectId,
      teamId,
      issueKey: `${DEMO_PROJECT_KEY}-3`,
      issueNumber: 3,
      reporterId,
      title: "Color contrast issue on dark mode",
      description: "The secondary text color doesn't meet WCAG AA contrast requirements when dark mode is enabled.",
      status: "in_progress" as const,
      priority: "medium" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      projectId,
      teamId,
      issueKey: `${DEMO_PROJECT_KEY}-4`,
      issueNumber: 4,
      reporterId,
      title: "Implement loading skeleton",
      description: "Add skeleton loading states to improve perceived performance during data fetches.",
      status: "in_review" as const,
      priority: "low" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      projectId,
      teamId,
      issueKey: `${DEMO_PROJECT_KEY}-5`,
      issueNumber: 5,
      reporterId,
      title: "Header navigation redesign",
      description: "Redesign the header navigation to better accommodate the new feature categories.",
      status: "resolved" as const,
      priority: "medium" as const,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
