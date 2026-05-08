import { db } from "@/lib/db";
import { projectAccessRequests } from "@/server/db/schema/project-access-requests";
import { projectMembers } from "@/server/db/schema/project-members";
import { projects } from "@/server/db/schema/projects";
import { teams } from "@/server/db/schema/teams";
import { and, eq, gt, gte, isNotNull, desc, inArray, or } from "drizzle-orm";
import { addMember } from "./member-service";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS, PROJECT_ROLES } from "@/config/roles";
import { users } from "@/server/db/schema/users";
import { env } from "@/lib/env";
import { createNotification } from "@/server/notifications";
import { enqueueEmail } from "@/server/email";
import type { AccessRequest, AccessRequestStatus, AccessRequestWithRequester, CreateAccessRequestData } from "./types";

const PENDING_UNIQUE_INDEX = "project_access_requests_pending_unique_idx";
const RECENT_DECISION_WINDOW_DAYS = 30;
const COOLDOWN_DAYS = 7;

function isUniqueViolationOnConstraint(err: unknown, constraintName: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    message?: unknown;
    cause?: unknown;
  };
  const codeMatches = e.code === "23505";
  const constraintMatches =
    e.constraint === constraintName ||
    e.constraint_name === constraintName ||
    (typeof e.message === "string" && e.message.includes(`"${constraintName}"`));
  if (codeMatches && constraintMatches) return true;
  return isUniqueViolationOnConstraint(e.cause, constraintName);
}

/**
 * Create a new project access request.
 *
 * Guards (in order):
 * 1. PROJECT_NOT_FOUND — project doesn't exist or is soft-deleted
 * 2. ALREADY_MEMBER    — requester already has a projectMembers row
 * 3. COOLDOWN_ACTIVE   — there is a declined row whose declineCooldownUntil is still in the future
 * 4. REQUEST_PENDING   — duplicate insert hits the partial unique index (race-safe)
 */
export async function createAccessRequest(data: CreateAccessRequestData): Promise<AccessRequest> {
  const { projectId, userId } = data;
  const message = data.message?.trim() ?? null;

  const [projectRow] = await db
    .select({ id: projects.id, deletedAt: projects.deletedAt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!projectRow || projectRow.deletedAt) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const [existingMember] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (existingMember) {
    throw new Error("ALREADY_MEMBER");
  }

  const now = new Date();
  const [cooldownRow] = await db
    .select({ id: projectAccessRequests.id })
    .from(projectAccessRequests)
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        eq(projectAccessRequests.status, "declined"),
        gt(projectAccessRequests.declineCooldownUntil, now)
      )
    )
    .limit(1);

  if (cooldownRow) {
    throw new Error("COOLDOWN_ACTIVE");
  }

  let row: typeof projectAccessRequests.$inferSelect;
  try {
    [row] = await db
      .insert(projectAccessRequests)
      .values({ projectId, requesterUserId: userId, message })
      .returning();
  } catch (err) {
    if (isUniqueViolationOnConstraint(err, PENDING_UNIQUE_INDEX)) {
      throw new Error("REQUEST_PENDING");
    }
    throw err;
  }

  logger.info("project.access_request.created", {
    requestId: row.id,
    projectId,
    requesterUserId: userId,
  });

  // Fire-and-forget: notify + email all project approvers. Failures must not block the response.
  try {
    const approvers = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          inArray(projectMembers.role, [PROJECT_ROLES.PROJECT_OWNER, PROJECT_ROLES.PROJECT_EDITOR])
        )
      );

    const [projectMeta] = await db
      .select({ name: projects.name, slug: projects.slug, teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const [teamMeta] = projectMeta
      ? await db.select({ slug: teams.slug }).from(teams).where(eq(teams.id, projectMeta.teamId)).limit(1)
      : [];

    const [requesterRow] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (projectMeta && teamMeta && requesterRow) {
      const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/${projectMeta.slug}?open=members`;

      await Promise.allSettled(
        approvers.map(async (approver) => {
          await createNotification({
            recipientId: approver.userId,
            actorId: userId,
            type: "project_access_request_created",
            entityType: "project",
            entityId: projectId,
            metadata: {
              target_url: reviewUrl,
              project_name: projectMeta.name,
              project_slug: projectMeta.slug,
              team_slug: teamMeta.slug,
              request_id: row.id,
              requester_name: requesterRow.name,
            },
          });

          const [approverRow] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, approver.userId))
            .limit(1);

          if (approverRow) {
            await enqueueEmail({
              userId: approver.userId,
              type: "project_access_request_received",
              to: approverRow.email,
              template: {
                type: "project_access_request_received",
                data: {
                  requesterName: requesterRow.name,
                  requesterEmail: requesterRow.email,
                  projectName: projectMeta.name,
                  message,
                  reviewUrl,
                },
              },
            });
          }
        })
      );
    }
  } catch (sideEffectErr) {
    logger.error("project.access_request.fanout_failed", {
      requestId: row.id,
      error: sideEffectErr instanceof Error ? sideEffectErr.message : "unknown",
    });
  }

  return rowToAccessRequest(row);
}

export function rowToAccessRequest(row: typeof projectAccessRequests.$inferSelect): AccessRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    requesterUserId: row.requesterUserId,
    message: row.message ?? null,
    status: row.status as AccessRequestStatus,
    decidedByUserId: row.decidedByUserId ?? null,
    decidedAt: row.decidedAt ?? null,
    declineCooldownUntil: row.declineCooldownUntil ?? null,
    createdAt: row.createdAt,
  };
}

export async function getMyLatestAccessRequest(
  projectId: string,
  userId: string
): Promise<AccessRequest | null> {
  const [row] = await db
    .select()
    .from(projectAccessRequests)
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        or(
          eq(projectAccessRequests.status, "pending"),
          eq(projectAccessRequests.status, "declined")
        )!
      )
    )
    .orderBy(desc(projectAccessRequests.createdAt))
    .limit(1);

  return row ? rowToAccessRequest(row) : null;
}

/**
 * List access requests for a project.
 *
 * Returns:
 * - All pending requests (no time limit)
 * - Decided (approved/declined) requests where decidedAt is within the last 30 days
 *
 * Requires: PROJECT_ACCESS_REQUEST_LIST permission on the project.
 * Throws: "FORBIDDEN" if actorUserId lacks that permission.
 */
export async function listAccessRequests(
  projectId: string,
  actorUserId: string
): Promise<AccessRequestWithRequester[]> {
  const allowed = await hasPermission({
    userId: actorUserId,
    permission: PERMISSIONS.PROJECT_ACCESS_REQUEST_LIST,
    resourceId: projectId,
    resourceType: "project",
  });
  if (!allowed) throw new Error("FORBIDDEN");

  const cutoff = new Date(Date.now() - RECENT_DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      req: projectAccessRequests,
      requesterId: users.id,
      requesterName: users.name,
      requesterEmail: users.email,
      requesterImage: users.image,
    })
    .from(projectAccessRequests)
    .innerJoin(users, eq(projectAccessRequests.requesterUserId, users.id))
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        or(
          eq(projectAccessRequests.status, "pending"),
          and(isNotNull(projectAccessRequests.decidedAt), gte(projectAccessRequests.decidedAt, cutoff))
        )
      )
    )
    .orderBy(desc(projectAccessRequests.createdAt));

  // Fetch deciders in a second query to avoid a second join to the users table.
  const deciderIds = Array.from(
    new Set(rows.map(r => r.req.decidedByUserId).filter((x): x is string => x !== null))
  );
  const deciders = deciderIds.length === 0
    ? []
    : await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, deciderIds));
  const decidersById = new Map(deciders.map(d => [d.id, d]));

  return rows.map(r => ({
    ...rowToAccessRequest(r.req),
    requester: {
      id: r.requesterId,
      name: r.requesterName,
      email: r.requesterEmail,
      image: r.requesterImage,
    },
    decidedByUser: r.req.decidedByUserId
      ? decidersById.get(r.req.decidedByUserId) ?? null
      : null,
  }));
}

/**
 * Approve a project access request.
 *
 * - Marks the row as approved, records the decider and timestamp.
 * - Grants the requester viewer membership via addMember (which also
 *   ensures the user has a team-level operational role).
 * - Idempotent: if the row is already approved, returns it unchanged.
 * - Concurrent-safe: addMember errors on duplicate membership are swallowed;
 *   if a concurrent approver wins the status UPDATE race, we re-read the row.
 *
 * Throws:
 *   REQUEST_NOT_FOUND  — no row with that id
 *   INVALID_STATE      — row is in a terminal state other than approved
 *   FORBIDDEN          — actorUserId lacks PROJECT_ACCESS_REQUEST_APPROVE
 *   PROJECT_NOT_FOUND  — project record is missing
 */
export async function approveAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const [request] = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("REQUEST_NOT_FOUND");

  const allowed = await hasPermission({
    userId: actorUserId,
    permission: PERMISSIONS.PROJECT_ACCESS_REQUEST_APPROVE,
    resourceId: request.projectId,
    resourceType: "project",
  });
  if (!allowed) throw new Error("FORBIDDEN");

  // Idempotent: already approved → return as-is.
  if (request.status === "approved") {
    return rowToAccessRequest(request);
  }

  if (request.status !== "pending") {
    throw new Error("INVALID_STATE");
  }

  // Look up teamId for addMember call.
  const [projectRow] = await db
    .select({ teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, request.projectId))
    .limit(1);

  if (!projectRow) throw new Error("PROJECT_NOT_FOUND");

  // Grant membership. addMember is idempotent-safe: if a concurrent approve
  // already added the member, it either throws "already a member" (read-then-insert
  // race caught by the pre-check) or propagates a DB unique-violation (23505)
  // if both concurrent calls race past the pre-check simultaneously.
  try {
    await addMember(
      request.projectId,
      request.requesterUserId,
      PROJECT_ROLES.PROJECT_VIEWER,
      projectRow.teamId
    );
  } catch (err) {
    if (!isUniqueViolationOnConstraint(err, "project_members_project_user_unique")) throw err;
  }

  const [updated] = await db
    .update(projectAccessRequests)
    .set({ status: "approved", decidedByUserId: actorUserId, decidedAt: new Date() })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  // If a concurrent approver beat us to the status update, re-read the row.
  if (!updated) {
    const [reread] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, requestId))
      .limit(1);
    if (!reread) throw new Error("REQUEST_NOT_FOUND");
    return rowToAccessRequest(reread);
  }

  logger.info("project.access_request.approved", {
    requestId,
    projectId: request.projectId,
    requesterUserId: request.requesterUserId,
    actorUserId,
  });

  try {
    const [projectMeta] = await db
      .select({ name: projects.name, slug: projects.slug, teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, request.projectId))
      .limit(1);

    const [teamMeta] = projectMeta
      ? await db.select({ slug: teams.slug }).from(teams).where(eq(teams.id, projectMeta.teamId)).limit(1)
      : [];

    const [requesterRow] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.requesterUserId))
      .limit(1);

    if (projectMeta && teamMeta && requesterRow) {
      const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/${projectMeta.slug}`;

      await createNotification({
        recipientId: request.requesterUserId,
        actorId: actorUserId,
        type: "project_access_request_approved",
        entityType: "project",
        entityId: request.projectId,
        metadata: {
          target_url: returnUrl,
          project_name: projectMeta.name,
          project_slug: projectMeta.slug,
          team_slug: teamMeta.slug,
        },
      });

      await enqueueEmail({
        userId: request.requesterUserId,
        type: "project_access_request_approved",
        to: requesterRow.email,
        template: {
          type: "project_access_request_approved",
          data: { projectName: projectMeta.name, returnUrl },
        },
      });
    }
  } catch (sideEffectErr) {
    logger.error("project.access_request.approve.fanout_failed", {
      requestId,
      error: sideEffectErr instanceof Error ? sideEffectErr.message : "unknown",
    });
  }

  return rowToAccessRequest(updated);
}

/**
 * Decline a project access request.
 *
 * - Marks the row as declined and sets a 7-day cooldown on the requester.
 * - Idempotent: if the row is already declined, returns it unchanged.
 * - Concurrent-safe: if a concurrent update wins the race, re-reads the row.
 *
 * Throws:
 *   REQUEST_NOT_FOUND  — no row with that id
 *   FORBIDDEN          — actorUserId lacks PROJECT_ACCESS_REQUEST_APPROVE
 *   INVALID_STATE      — row is in a terminal state other than declined
 */
export async function declineAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const [request] = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("REQUEST_NOT_FOUND");

  const allowed = await hasPermission({
    userId: actorUserId,
    permission: PERMISSIONS.PROJECT_ACCESS_REQUEST_APPROVE,
    resourceId: request.projectId,
    resourceType: "project",
  });
  if (!allowed) throw new Error("FORBIDDEN");

  // Idempotent: already declined → return as-is.
  if (request.status === "declined") return rowToAccessRequest(request);

  if (request.status !== "pending") throw new Error("INVALID_STATE");

  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const [updated] = await db
    .update(projectAccessRequests)
    .set({
      status: "declined",
      decidedByUserId: actorUserId,
      decidedAt: now,
      declineCooldownUntil: cooldownUntil,
    })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    const [reread] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, requestId))
      .limit(1);
    if (!reread) throw new Error("REQUEST_NOT_FOUND");
    return rowToAccessRequest(reread);
  }

  logger.info("project.access_request.declined", {
    requestId,
    projectId: request.projectId,
    requesterUserId: request.requesterUserId,
    actorUserId,
  });

  try {
    const [projectMeta] = await db
      .select({ name: projects.name, slug: projects.slug, teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, request.projectId))
      .limit(1);

    const [requesterRow] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, request.requesterUserId))
      .limit(1);

    if (projectMeta && requesterRow) {
      await createNotification({
        recipientId: request.requesterUserId,
        actorId: actorUserId,
        type: "project_access_request_declined",
        entityType: "project",
        entityId: request.projectId,
        metadata: {
          target_url: "/",
          project_name: projectMeta.name,
        },
      });

      await enqueueEmail({
        userId: request.requesterUserId,
        type: "project_access_request_declined",
        to: requesterRow.email,
        template: {
          type: "project_access_request_declined",
          data: { projectName: projectMeta.name },
        },
      });
    }
  } catch (sideEffectErr) {
    logger.error("project.access_request.decline.fanout_failed", {
      requestId,
      error: sideEffectErr instanceof Error ? sideEffectErr.message : "unknown",
    });
  }

  return rowToAccessRequest(updated);
}

/**
 * Cancel a project access request.
 *
 * Only the original requester may cancel their own request.
 * Cancelled requests do not impose a cooldown — the requester may re-apply immediately.
 * Idempotent: if already cancelled, returns the row unchanged.
 *
 * Throws:
 *   REQUEST_NOT_FOUND  — no row with that id
 *   FORBIDDEN          — actorUserId is not the requester
 *   INVALID_STATE      — row is in a terminal state other than cancelled
 */
export async function cancelAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const [request] = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("REQUEST_NOT_FOUND");

  // Only the requester can cancel their own request.
  if (request.requesterUserId !== actorUserId) throw new Error("FORBIDDEN");

  // Idempotent: already cancelled → return as-is.
  if (request.status === "cancelled") return rowToAccessRequest(request);

  if (request.status !== "pending") throw new Error("INVALID_STATE");

  const [updated] = await db
    .update(projectAccessRequests)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    const [reread] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, requestId))
      .limit(1);
    if (!reread) throw new Error("REQUEST_NOT_FOUND");
    return rowToAccessRequest(reread);
  }

  logger.info("project.access_request.cancelled", {
    requestId,
    projectId: request.projectId,
    actorUserId,
  });

  return rowToAccessRequest(updated);
}

/**
 * Mark any pending access requests for (projectId, userId) as superseded.
 *
 * Called from joinProject and from invitation acceptance to keep access-request
 * state consistent with realized membership.
 *
 * Idempotent: zero rows updated is a normal outcome.
 */
export async function supersedePendingRequests(
  projectId: string,
  userId: string
): Promise<void> {
  await db
    .update(projectAccessRequests)
    .set({ status: "superseded", decidedAt: new Date() })
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        eq(projectAccessRequests.status, "pending")
      )
    );
}
