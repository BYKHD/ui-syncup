#!/usr/bin/env bun
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { createHash, randomBytes } from "crypto";
import { hashPassword } from "../src/server/auth/password";
import type {
  TeamManagementRole,
  TeamOperationalRole,
} from "../src/config/roles";
import { PROJECT_ROLES } from "../src/config/roles";
import * as schema from "../src/server/db/schema";

dotenv.config({ path: ".env.local" });

const DIRECT_URL = process.env.DIRECT_URL;

if (!DIRECT_URL) {
  console.error("❌ DIRECT_URL is not set");
  process.exit(1);
}

const client = postgres(DIRECT_URL);
const db = drizzle(client, { schema });

const DEFAULT_PASSWORD = "password123";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type SeedUser = {
  email: string;
  name: string;
  image: string;
};

type TeamSeed = {
  slug: string;
  name: string;
  description: string;
  image?: string;
};

type MembershipSeed = {
  teamSlug: string;
  userEmail: string;
  managementRole?: TeamManagementRole | null;
  operationalRole: TeamOperationalRole;
  invitedByEmail?: string | null;
};

type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

type InvitationSeed = {
  teamSlug: string;
  email: string;
  managementRole?: TeamManagementRole | null;
  operationalRole: TeamOperationalRole;
  invitedByEmail: string;
  status: InvitationStatus;
};

type ProjectSeed = {
  name: string;
  description: string;
  ownerEmail: string;
  teamSlug: string;
  slug: string;
  key: string;
};

const USER_SEEDS: SeedUser[] = [
  {
    email: "demo@ui-syncup.com",
    name: "Demo User",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Demo",
  },
  {
    email: "alice@ui-syncup.com",
    name: "Alice Smith",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Alice",
  },
  {
    email: "bob@ui-syncup.com",
    name: "Bob Jones",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Bob",
  },
  {
    email: "charlie@ui-syncup.com",
    name: "Charlie Brown",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Charlie",
  },
  {
    email: "diana@ui-syncup.com",
    name: "Diana Prince",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Diana",
  },
  {
    email: "eve@ui-syncup.com",
    name: "Eve Turner",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Eve",
  },
];

const TEAM_SEEDS: TeamSeed[] = [
  {
    slug: "demo-team",
    name: "Demo Team",
    description: "Baseline workspace used throughout docs and onboarding flows.",
  },
  {
    slug: "product-design",
    name: "Product Design",
    description: "Workspace that exercises admin features.",
  },
  {
    slug: "qa-guild",
    name: "QA Guild",
    description: "Secondary workspace for testing team switching and exports.",
  },
];

const MEMBERSHIP_SEEDS: MembershipSeed[] = [
  {
    teamSlug: "demo-team",
    userEmail: "demo@ui-syncup.com",
    managementRole: "WORKSPACE_OWNER",
    operationalRole: "WORKSPACE_EDITOR",
  },
  {
    teamSlug: "demo-team",
    userEmail: "alice@ui-syncup.com",
    managementRole: "WORKSPACE_ADMIN",
    operationalRole: "WORKSPACE_EDITOR",
    invitedByEmail: "demo@ui-syncup.com",
  },
  {
    teamSlug: "demo-team",
    userEmail: "bob@ui-syncup.com",
    operationalRole: "WORKSPACE_MEMBER",
    invitedByEmail: "alice@ui-syncup.com",
  },
  {
    teamSlug: "demo-team",
    userEmail: "charlie@ui-syncup.com",
    operationalRole: "WORKSPACE_VIEWER",
    invitedByEmail: "alice@ui-syncup.com",
  },
  {
    teamSlug: "product-design",
    userEmail: "alice@ui-syncup.com",
    managementRole: "WORKSPACE_OWNER",
    operationalRole: "WORKSPACE_EDITOR",
  },
  {
    teamSlug: "product-design",
    userEmail: "demo@ui-syncup.com",
    managementRole: "WORKSPACE_ADMIN",
    operationalRole: "WORKSPACE_EDITOR",
    invitedByEmail: "alice@ui-syncup.com",
  },
  {
    teamSlug: "product-design",
    userEmail: "diana@ui-syncup.com",
    operationalRole: "WORKSPACE_MEMBER",
    invitedByEmail: "alice@ui-syncup.com",
  },
  {
    teamSlug: "qa-guild",
    userEmail: "eve@ui-syncup.com",
    managementRole: "WORKSPACE_OWNER",
    operationalRole: "WORKSPACE_MEMBER",
  },
  {
    teamSlug: "qa-guild",
    userEmail: "bob@ui-syncup.com",
    managementRole: "WORKSPACE_ADMIN",
    operationalRole: "WORKSPACE_EDITOR",
    invitedByEmail: "eve@ui-syncup.com",
  },
];

const INVITATION_SEEDS: InvitationSeed[] = [
  {
    teamSlug: "demo-team",
    email: "pm.contractor@ui-syncup.com",
    managementRole: "WORKSPACE_ADMIN",
    operationalRole: "WORKSPACE_EDITOR",
    invitedByEmail: "demo@ui-syncup.com",
    status: "pending",
  },
  {
    teamSlug: "demo-team",
    email: "designer.contract@ui-syncup.com",
    operationalRole: "WORKSPACE_MEMBER",
    invitedByEmail: "alice@ui-syncup.com",
    status: "accepted",
  },
  {
    teamSlug: "product-design",
    email: "qa.lead@ui-syncup.com",
    operationalRole: "WORKSPACE_VIEWER",
    invitedByEmail: "alice@ui-syncup.com",
    status: "expired",
  },
  {
    teamSlug: "qa-guild",
    email: "ops.manager@ui-syncup.com",
    managementRole: "WORKSPACE_ADMIN",
    operationalRole: "WORKSPACE_MEMBER",
    invitedByEmail: "eve@ui-syncup.com",
    status: "cancelled",
  },
];

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    name: "Design System Refresh",
    description: "Component audit that keeps Alice as the blocking owner.",
    ownerEmail: "alice@ui-syncup.com",
    teamSlug: "product-design",
    slug: "design-system-refresh",
    key: "DSR",
  },
  {
    name: "Release Regression Suite",
    description: "Regression checklist Bob owns, blocks demotion/removal tests.",
    ownerEmail: "bob@ui-syncup.com",
    teamSlug: "qa-guild",
    slug: "release-regression-suite",
    key: "RRS",
  },
];

type UserRow = typeof schema.users.$inferSelect;
type TeamRow = typeof schema.teams.$inferSelect;

function ensure<T>(value: T | undefined | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function createInvitationToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

function resolveInvitationDates(status: InvitationStatus) {
  const now = Date.now();
  switch (status) {
    case "accepted":
      return {
        expiresAt: new Date(now + 5 * DAY_IN_MS),
        usedAt: new Date(now - 2 * DAY_IN_MS),
        cancelledAt: null,
      };
    case "expired":
      return {
        expiresAt: new Date(now - 3 * DAY_IN_MS),
        usedAt: null,
        cancelledAt: null,
      };
    case "cancelled":
      return {
        expiresAt: new Date(now + 7 * DAY_IN_MS),
        usedAt: null,
        cancelledAt: new Date(now - DAY_IN_MS),
      };
    case "pending":
    default:
      return {
        expiresAt: new Date(now + 7 * DAY_IN_MS),
        usedAt: null,
        cancelledAt: null,
      };
  }
}

async function main() {
  console.log("🌱 Seeding database...");

  const summary = {
    users: 0,
    teams: 0,
    teamMembers: 0,
    roles: 0,
    projects: 0,
    invitations: {
      pending: 0,
      accepted: 0,
      expired: 0,
      cancelled: 0,
    },
  };

  const pendingInvitationTokens: { team: string; email: string; token: string }[] = [];

  try {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // Upsert users
    const usersByEmail = new Map<string, UserRow>();
    for (const seed of USER_SEEDS) {
      const [user] = await db
        .insert(schema.users)
        .values({
          email: seed.email,
          name: seed.name,
          emailVerified: true,
          image: seed.image,
          passwordHash,
        })
        .onConflictDoUpdate({
          target: schema.users.email,
          set: {
            name: seed.name,
            image: seed.image,
            passwordHash,
            emailVerified: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      usersByEmail.set(seed.email, user);
    }
    summary.users = usersByEmail.size;

    // Upsert teams
    const teamsBySlug = new Map<string, TeamRow>();
    for (const seed of TEAM_SEEDS) {
      const [team] = await db
        .insert(schema.teams)
        .values({
          name: seed.name,
          slug: seed.slug,
          description: seed.description,
          image: seed.image ?? null,
        })
        .onConflictDoUpdate({
          target: schema.teams.slug,
          set: {
            name: seed.name,
            description: seed.description,
            image: seed.image ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      teamsBySlug.set(seed.slug, team);
    }
    summary.teams = teamsBySlug.size;
    const teamsById = new Map<string, TeamRow>(
      Array.from(teamsBySlug.values()).map((team) => [team.id, team])
    );

    const teamIds = Array.from(teamsBySlug.values()).map((team) => team.id);

    if (teamIds.length > 0) {
      // Clean deterministic rows so script can be re-run safely
      await db.delete(schema.teamMembers).where(inArray(schema.teamMembers.teamId, teamIds));
      await db
        .delete(schema.teamInvitations)
        .where(inArray(schema.teamInvitations.teamId, teamIds));
      await db
        .delete(schema.userRoles)
        .where(
          and(
            eq(schema.userRoles.resourceType, "team"),
            inArray(schema.userRoles.resourceId, teamIds)
          )
        );
    }

    const lastActiveTeamByUser = new Map<string, string>();
    const teamMemberCounts = new Map<string, number>();
    const roleAssignments: typeof schema.userRoles.$inferInsert[] = [];

    for (const seed of MEMBERSHIP_SEEDS) {
      const team = ensure(
        teamsBySlug.get(seed.teamSlug),
        `Team ${seed.teamSlug} not found`
      );
      const user = ensure(
        usersByEmail.get(seed.userEmail),
        `User ${seed.userEmail} not found`
      );
      const invitedBy = seed.invitedByEmail
        ? ensure(
            usersByEmail.get(seed.invitedByEmail),
            `Inviter ${seed.invitedByEmail} not found`
          )
        : null;

      await db
        .insert(schema.teamMembers)
        .values({
          teamId: team.id,
          userId: user.id,
          managementRole: seed.managementRole ?? null,
          operationalRole: seed.operationalRole,
          invitedBy: invitedBy?.id ?? null,
        })
        .returning();

      summary.teamMembers += 1;
      teamMemberCounts.set(team.id, (teamMemberCounts.get(team.id) ?? 0) + 1);

      if (!lastActiveTeamByUser.has(user.id)) {
        lastActiveTeamByUser.set(user.id, team.id);
      }

      if (seed.managementRole) {
        roleAssignments.push({
          userId: user.id,
          role: seed.managementRole,
          resourceType: "team",
          resourceId: team.id,
        });
      }

      roleAssignments.push({
        userId: user.id,
        role: seed.operationalRole,
        resourceType: "team",
        resourceId: team.id,
      });
    }



    // Update last active team pointer per user
    for (const [email, user] of usersByEmail.entries()) {
      const lastActiveTeamId = lastActiveTeamByUser.get(user.id) ?? null;
      await db
        .update(schema.users)
        .set({ lastActiveTeamId })
        .where(eq(schema.users.id, user.id));
    }

    // Seed projects (and clear prior ones with the same names)
    if (PROJECT_SEEDS.length > 0) {
      const projectNames = PROJECT_SEEDS.map((p) => p.name);
      if (projectNames.length > 0) {
        const existingProjects = await db
          .select({
            id: schema.projects.id,
            name: schema.projects.name,
          })
          .from(schema.projects)
          .where(inArray(schema.projects.name, projectNames));

        const existingProjectIds = existingProjects.map((project) => project.id);
        if (existingProjectIds.length > 0) {
          await db
            .delete(schema.userRoles)
            .where(
              and(
                eq(schema.userRoles.resourceType, "project"),
                inArray(schema.userRoles.resourceId, existingProjectIds)
              )
            );
        }

        await db
          .delete(schema.projects)
          .where(inArray(schema.projects.name, projectNames));
      }

      for (const projectSeed of PROJECT_SEEDS) {
        const owner = ensure(
          usersByEmail.get(projectSeed.ownerEmail),
          `Owner ${projectSeed.ownerEmail} not found`
        );

        const team = ensure(
          teamsBySlug.get(projectSeed.teamSlug),
          `Team ${projectSeed.teamSlug} not found for project ${projectSeed.name}`
        );

        const [project] = await db
          .insert(schema.projects)
          .values({
            name: projectSeed.name,
            description: projectSeed.description,
            teamId: team.id,
            slug: projectSeed.slug,
            key: projectSeed.key,
            // owner_id is not in the schema, projects are owned by teams
            // We might want to track who created it, but schema doesn't have it right now
            // or maybe it does but under a different name? 
            // Checking schema: id, teamId, name, key, slug, description, icon, visibility, status, createdAt, updatedAt, deletedAt
            // No owner_id or creator_id.
            // So we just omit it.
          })
          .returning();

        summary.projects += 1;
        roleAssignments.push({
          userId: owner.id,
          role: PROJECT_ROLES.PROJECT_OWNER,
          resourceType: "project",
          resourceId: project.id,
        });
      }
    }

    // Seed invitations
    for (const invitationSeed of INVITATION_SEEDS) {
      const team = ensure(
        teamsBySlug.get(invitationSeed.teamSlug),
        `Team ${invitationSeed.teamSlug} not found for invitation`
      );
      const inviter = ensure(
        usersByEmail.get(invitationSeed.invitedByEmail),
        `Inviter ${invitationSeed.invitedByEmail} not found`
      );

      const { token, tokenHash } = createInvitationToken();
      const { expiresAt, usedAt, cancelledAt } = resolveInvitationDates(
        invitationSeed.status
      );

      await db.insert(schema.teamInvitations).values({
        teamId: team.id,
        email: invitationSeed.email,
        tokenHash,
        managementRole: invitationSeed.managementRole ?? null,
        operationalRole: invitationSeed.operationalRole,
        invitedBy: inviter.id,
        expiresAt,
        usedAt,
        cancelledAt,
      });

      summary.invitations[invitationSeed.status] += 1;

      if (invitationSeed.status === "pending") {
        pendingInvitationTokens.push({
          team: team.name,
          email: invitationSeed.email,
          token,
        });
      }
    }

    // Insert role assignments for teams + projects
    if (roleAssignments.length > 0) {
      await db.insert(schema.userRoles).values(roleAssignments);
      summary.roles = roleAssignments.length;
    }

    console.log("✅ Seed complete!");
    console.log(`👥 Users ensured: ${summary.users} (password: ${DEFAULT_PASSWORD})`);
    console.log(
      `🏢 Teams: ${summary.teams} (${Array.from(teamsBySlug.values())
        .map((team) => team.name)
        .join(", ")})`
    );
    console.log(`🤝 Team memberships: ${summary.teamMembers}`);
    const rosterDetails = Array.from(teamMemberCounts.entries())
      .map(([teamId, count]) => {
        const team = teamsById.get(teamId);
        return `${team?.name ?? teamId}: ${count}`;
      })
      .join(", ");
    if (rosterDetails.length > 0) {
      console.log(`👥 Team rosters: ${rosterDetails}`);
    }
    console.log(
      `🪪 Role assignments: ${summary.roles} (team + project level)`
    );
    console.log(
      `📁 Projects: ${summary.projects} (${PROJECT_SEEDS.map((p) => p.name).join(
        ", "
      )})`
    );
    console.log(
      `✉️ Invitations → pending: ${summary.invitations.pending}, accepted: ${summary.invitations.accepted}, expired: ${summary.invitations.expired}, cancelled: ${summary.invitations.cancelled}`
    );

    if (pendingInvitationTokens.length > 0) {
      console.log("\n🔗 Pending invitation tokens:");
      for (const invite of pendingInvitationTokens) {
        console.log(` • ${invite.email} → ${invite.team}: ${invite.token}`);
      }
    }

    console.log("\nℹ️  Demo tips:");
    console.log(" - Transfer ownership in Demo Team (owner: demo@ui-syncup.com, eligible admin: alice@ui-syncup.com).");
    console.log(" - Alice owns a project, so demoting/removing her will trigger guard rails.");
    console.log(" - QA Guild showcases owner+admin with minimal billable seats.");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
