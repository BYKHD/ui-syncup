import { afterEach, describe, expect, test } from "vitest";
import { db } from "@/lib/db";
import {
  issues,
  projectMembers,
  projects,
  teamMembers,
  teams,
  users,
} from "@/server/db/schema";
import { createIssue, getIssueByRef } from "@/server/issues/issue-service";
import { createProject } from "@/server/projects/project-service";
import { createTeam } from "@/server/teams/team-service";
import { eq } from "drizzle-orm";

const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];
const testIssueIds: string[] = [];

async function createTestUser(email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase().trim(), name: name.trim(), emailVerified: true })
    .returning();
  testUserIds.push(user.id);
  return user;
}

async function cleanupTestData() {
  for (const id of testIssueIds) {
    await db.delete(issues).where(eq(issues.id, id)).catch(() => {});
  }
  for (const id of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id)).catch(() => {});
    await db.delete(projects).where(eq(projects.id, id)).catch(() => {});
  }
  for (const id of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id)).catch(() => {});
    await db.delete(teams).where(eq(teams.id, id)).catch(() => {});
  }
  for (const id of testUserIds) {
    await db.delete(users).where(eq(users.id, id)).catch(() => {});
  }
  testIssueIds.length = 0;
  testProjectIds.length = 0;
  testTeamIds.length = 0;
  testUserIds.length = 0;
}

afterEach(async () => {
  await cleanupTestData();
});

describe("getIssueByRef", () => {
  test("resolves duplicate issue keys to the first issue the user can access", async () => {
    const ts = Date.now();
    const userA = await createTestUser(`user-a-ref-${ts}@test.com`, "User A");
    const userB = await createTestUser(`user-b-ref-${ts}@test.com`, "User B");

    const teamB = await createTeam({ name: `T-ref-b-${ts}`, creatorId: userB.id });
    testTeamIds.push(teamB.id);
    const projectB = await createProject(
      { teamId: teamB.id, name: `P-ref-b-${ts}`, key: "PRJ", visibility: "private" },
      userB.id
    );
    testProjectIds.push(projectB.id);
    const teamBIssue = await createIssue({
      projectId: projectB.id,
      reporterId: userB.id,
      title: "Team B duplicate issue",
    });
    testIssueIds.push(teamBIssue.id);

    const teamA = await createTeam({ name: `T-ref-a-${ts}`, creatorId: userA.id });
    testTeamIds.push(teamA.id);
    const projectA = await createProject(
      { teamId: teamA.id, name: `P-ref-a-${ts}`, key: "PRJ", visibility: "private" },
      userA.id
    );
    testProjectIds.push(projectA.id);
    const teamAIssue = await createIssue({
      projectId: projectA.id,
      reporterId: userA.id,
      title: "Team A accessible issue",
    });
    testIssueIds.push(teamAIssue.id);

    await db
      .update(issues)
      .set({ createdAt: new Date("2025-01-01T00:00:00.000Z") })
      .where(eq(issues.id, teamBIssue.id));
    await db
      .update(issues)
      .set({ createdAt: new Date("2025-01-02T00:00:00.000Z") })
      .where(eq(issues.id, teamAIssue.id));

    const byKey = await getIssueByRef("PRJ-1", userA.id);
    expect(byKey?.id).toBe(teamAIssue.id);

    const byId = await getIssueByRef(teamBIssue.id, userA.id);
    expect(byId?.id).toBe(teamBIssue.id);

    const missing = await getIssueByRef("ZZZ-999", userA.id);
    expect(missing).toBeNull();
  });
});
