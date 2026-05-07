/**
 * E2E Test Fixtures and Database Helpers
 * 
 * Utilities for setting up test data and managing test database state
 */

import { db } from '@/lib/db';
import {
  account,
  issues,
  projectAccessRequests,
  projectMembers,
  projects,
  sessions,
  teamMembers,
  teams,
  users,
  verificationTokens,
} from '@/server/db/schema';
import { hashPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/tokens';
import { and, eq, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Test user fixture data
 */
export interface TestUserFixture {
  id: string;
  email: string;
  password: string;
  name: string;
  emailVerified: boolean;
}

export interface AccessRequestFlowFixture {
  owner: TestUserFixture;
  requester: TestUserFixture;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
  issue: {
    id: string;
    issueKey: string;
    title: string;
  };
}

/**
 * Create a verified test user in the database
 * This is useful for tests that need to start with an authenticated user
 */
export async function createVerifiedTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<TestUserFixture> {
  const uuid = randomUUID().slice(0, 8);
  const userData = {
    email: email || `test-${uuid}@example.com`,
    password: password || 'Test123!@#',
    name: name || `Test User ${uuid}`,
  };
  
  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user in database
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      emailVerified: true, // Pre-verified for testing
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  // Create credential account record so email/password login works
  await db.insert(account).values({
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: passwordHash,
  });

  return {
    id: user.id,
    email: user.email,
    password: userData.password,
    name: user.name,
    emailVerified: true,
  };
}

/**
 * Create an unverified test user in the database
 */
export async function createUnverifiedTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<TestUserFixture> {
  const uuid = randomUUID().slice(0, 8);
  const userData = {
    email: email || `test-${uuid}@example.com`,
    password: password || 'Test123!@#',
    name: name || `Test User ${uuid}`,
  };
  
  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user in database
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      emailVerified: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  // Create credential account record so email/password login works
  await db.insert(account).values({
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: passwordHash,
  });

  return {
    id: user.id,
    email: user.email,
    password: userData.password,
    name: user.name,
    emailVerified: false,
  };
}

/**
 * Create a verification token for a user
 */
export async function createVerificationToken(
  userId: string
): Promise<{ token: string; tokenId: string }> {
  return await generateToken(userId, 'email_verification', 24 * 60 * 60 * 1000);
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: string
): Promise<{ token: string; tokenId: string }> {
  return await generateToken(userId, 'password_reset', 60 * 60 * 1000);
}

/**
 * Create a session for a user
 */
export async function createTestSession(
  userId: string,
  ipAddress: string = '127.0.0.1',
  userAgent: string = 'Test User Agent'
): Promise<string> {
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await db.insert(sessions).values({
    userId,
    token: sessionToken,
    expiresAt,
    ipAddress,
    userAgent,
  });
  
  return sessionToken;
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // Cascade delete will handle sessions, tokens, and roles
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Delete a test user by email
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  await db.delete(users).where(eq(users.email, email));
}

/**
 * Clean up all test users (emails starting with 'test-')
 */
export async function cleanupTestUsers(): Promise<void> {
  // This is a dangerous operation - only use in test environments
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('cleanupTestUsers can only be run in test or development environments');
  }
  
  // Delete all users with test email pattern
  await db.execute(`
    DELETE FROM users 
    WHERE email LIKE 'test-%@example.com'
  `);
}

/**
 * Clean up access-request E2E fixture records from previous interrupted runs.
 */
export async function cleanupAccessRequestFlowFixtures(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('cleanupAccessRequestFlowFixtures can only be run in test or development environments');
  }

  await db.delete(teams).where(like(teams.slug, 'e2e-access-%'));
  await db.delete(users).where(like(users.email, 'test-e2e-access-%@example.com'));
}

/**
 * Create a private project fixture for the project access-request E2E flow.
 *
 * The fixture uses a unique issue key per call because Playwright runs this
 * spec once per browser project by default.
 */
export async function createAccessRequestFlowFixture(
  suffix: string = randomUUID().slice(0, 8)
): Promise<AccessRequestFlowFixture> {
  const cleanSuffix = suffix.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  const entropy = randomUUID().slice(0, 6);
  const normalizedSuffix = `${cleanSuffix.slice(0, 12)}-${entropy}`;
  const upperSuffix = entropy.toUpperCase();

  const owner = await createVerifiedTestUser(
    `test-e2e-access-owner-${normalizedSuffix}@example.com`,
    'Test123!@#',
    `E2E Owner ${normalizedSuffix}`
  );
  const requester = await createVerifiedTestUser(
    `test-e2e-access-requester-${normalizedSuffix}@example.com`,
    'Test123!@#',
    `E2E Requester ${normalizedSuffix}`
  );

  const [team] = await db
    .insert(teams)
    .values({
      name: `E2E Access Team ${normalizedSuffix}`,
      slug: `e2e-access-${normalizedSuffix}`,
    })
    .returning({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
    });

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: owner.id,
    managementRole: 'TEAM_OWNER',
    operationalRole: 'TEAM_EDITOR',
  });
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: requester.id,
    operationalRole: 'TEAM_VIEWER',
  });

  await db
    .update(users)
    .set({ lastActiveTeamId: team.id })
    .where(eq(users.id, owner.id));
  await db
    .update(users)
    .set({ lastActiveTeamId: team.id })
    .where(eq(users.id, requester.id));

  const [project] = await db
    .insert(projects)
    .values({
      teamId: team.id,
      name: `E2E Access Project ${normalizedSuffix}`,
      key: `E2E${upperSuffix}`.slice(0, 10),
      slug: `e2e-access-project-${normalizedSuffix}`,
      description: 'Private project for the access request happy path.',
      visibility: 'private',
      status: 'active',
    })
    .returning({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
    });

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: owner.id,
    role: 'owner',
  });

  const issueKey = `E2E-${upperSuffix || '1'}`;
  const [issue] = await db
    .insert(issues)
    .values({
      teamId: team.id,
      projectId: project.id,
      issueKey,
      issueNumber: 1,
      title: `E2E access request issue ${normalizedSuffix}`,
      description: 'Requester should see this after the owner approves access.',
      type: 'bug',
      priority: 'medium',
      status: 'open',
      reporterId: owner.id,
      createdBy: owner.id,
      updatedBy: owner.id,
    })
    .returning({
      id: issues.id,
      issueKey: issues.issueKey,
      title: issues.title,
    });

  return {
    owner,
    requester,
    team,
    project,
    issue,
  };
}

/**
 * Remove one access-request E2E fixture.
 */
export async function deleteAccessRequestFlowFixture(fixture: AccessRequestFlowFixture): Promise<void> {
  await db
    .delete(projectAccessRequests)
    .where(eq(projectAccessRequests.projectId, fixture.project.id));
  await db
    .delete(issues)
    .where(and(eq(issues.projectId, fixture.project.id), eq(issues.issueKey, fixture.issue.issueKey)));
  await db.delete(projects).where(eq(projects.id, fixture.project.id));
  await db.delete(teams).where(eq(teams.id, fixture.team.id));
  await db.delete(users).where(eq(users.id, fixture.requester.id));
  await db.delete(users).where(eq(users.id, fixture.owner.id));
}

/**
 * Get user by email
 */
export async function getTestUserByEmail(email: string): Promise<TestUserFixture | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = result[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: '', // Password not stored in plain text
    name: user.name,
    emailVerified: user.emailVerified ?? false,
  };
}

/**
 * Verify a test user's email
 */
export async function verifyTestUserEmail(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId));
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Get verification token for a user
 */
export async function getVerificationToken(userId: string): Promise<any | null> {
  const [token] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.userId, userId))
    .limit(1);
  
  return token ?? null;
}

/**
 * Create a test user with session (fully authenticated)
 */
export async function createAuthenticatedTestUser(): Promise<{
  user: TestUserFixture;
  sessionToken: string;
}> {
  const user = await createVerifiedTestUser();
  const sessionToken = await createTestSession(user.id);
  
  return {
    user,
    sessionToken,
  };
}

/**
 * Setup test database state before tests
 */
export async function setupTestDatabase(): Promise<void> {
  // Clean up any existing test data
  await cleanupAccessRequestFlowFixtures();
  await cleanupTestUsers();
}

/**
 * Teardown test database state after tests
 */
export async function teardownTestDatabase(): Promise<void> {
  // Clean up test data
  await cleanupAccessRequestFlowFixtures();
  await cleanupTestUsers();
}
