/**
 * Property-based tests for comment delete authorization
 *
 * Tests that only comment authors can delete their own comments.
 * This is a critical security invariant that should hold for ALL inputs.
 *
 * Feature: issue-annotation-integration
 * Task: 11.5 - Write property test for comment delete authorization (Property 23)
 * Validates: Requirements 11.3
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { issueAttachments } from '@/server/db/schema/issue-attachments';
import { issues } from '@/server/db/schema/issues';
import { projects } from '@/server/db/schema/projects';
import { teams } from '@/server/db/schema/teams';
import { users } from '@/server/db/schema/users';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { deleteComment, addComment } from '../comment-service';
import { CommentPermissionError, CommentNotFoundError } from '../types';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 20, // Fewer runs for database operations
  verbose: false,
};

// ============================================================================
// Test setup and teardown
// ============================================================================

interface TestContext {
  teamId: string;
  projectId: string;
  issueId: string;
  attachmentId: string;
  authorUserId: string;
  nonAuthorUserId: string;
  commentIds: string[];
  annotationId: string;
}

let testContext: TestContext;

/**
 * Create test fixtures for property tests
 */
async function createTestFixtures(): Promise<TestContext> {
  const teamId = randomUUID();
  const projectId = randomUUID();
  const issueId = randomUUID();
  const attachmentId = randomUUID();
  const authorUserId = randomUUID();
  const nonAuthorUserId = randomUUID();
  const annotationId = randomUUID();

  // Create test team (no ownerId in schema)
  await db.insert(teams).values({
    id: teamId,
    name: 'Test Team',
    slug: `test-team-${teamId.slice(0, 8)}`,
  });

  // Create test users
  await db.insert(users).values([
    {
      id: authorUserId,
      email: `author-${authorUserId.slice(0, 8)}@test.com`,
      name: 'Comment Author',
    },
    {
      id: nonAuthorUserId,
      email: `nonauth-${nonAuthorUserId.slice(0, 8)}@test.com`,
      name: 'Non-Author User',
    },
  ]);

  // Create test project with required fields
  const shortId = projectId.slice(0, 4).toUpperCase();
  await db.insert(projects).values({
    id: projectId,
    teamId,
    name: 'Test Project',
    key: `TP${shortId}`,
    slug: `test-project-${shortId.toLowerCase()}`,
  });

  // Create test issue
  await db.insert(issues).values({
    id: issueId,
    teamId,
    projectId,
    issueKey: 'TP-1',
    issueNumber: 1,
    title: 'Test Issue',
    reporterId: authorUserId,
  });

  // Create base annotation with empty comments
  const baseAnnotation = {
    id: annotationId,
    authorId: authorUserId,
    x: 0.5,
    y: 0.5,
    shape: { type: 'pin', position: { x: 0.5, y: 0.5 } },
    label: '1',
    description: 'Test annotation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
  };

  // Create test attachment with annotation
  await db.insert(issueAttachments).values({
    id: attachmentId,
    teamId,
    projectId,
    issueId,
    fileName: 'test.png',
    fileSize: 1000,
    fileType: 'image/png',
    url: 'https://example.com/test.png',
    uploadedById: authorUserId,
    annotations: sql`${JSON.stringify([baseAnnotation])}::jsonb`,
  });

  return {
    teamId,
    projectId,
    issueId,
    attachmentId,
    authorUserId,
    nonAuthorUserId,
    commentIds: [],
    annotationId,
  };
}

/**
 * Clean up test fixtures
 */
async function cleanupTestFixtures(ctx: TestContext): Promise<void> {
  try {
    await db.delete(issueAttachments).where(eq(issueAttachments.id, ctx.attachmentId));
    await db.delete(issues).where(eq(issues.id, ctx.issueId));
    await db.delete(projects).where(eq(projects.id, ctx.projectId));
    await db.delete(users).where(eq(users.id, ctx.authorUserId));
    await db.delete(users).where(eq(users.id, ctx.nonAuthorUserId));
    await db.delete(teams).where(eq(teams.id, ctx.teamId));
  } catch {
    // Ignore cleanup errors in tests
  }
}

/**
 * Add a comment by the author for testing
 */
async function addTestComment(
  ctx: TestContext,
  message: string
): Promise<string> {
  const result = await addComment({
    attachmentId: ctx.attachmentId,
    annotationId: ctx.annotationId,
    authorId: ctx.authorUserId,
    message,
  });
  ctx.commentIds.push(result.comment.id);
  return result.comment.id;
}

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Generate random comment messages
 */
const commentMessageArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate random user IDs that are definitely different from each other
 */
const differentUserIdArb = fc.uuid();

// ============================================================================
// Property Tests
// ============================================================================

describe('Comment Delete Authorization - Property-Based Tests', () => {
  beforeEach(async () => {
    testContext = await createTestFixtures();
  });

  afterEach(async () => {
    await cleanupTestFixtures(testContext);
  });

  /**
   * Feature: issue-annotation-integration, Property 23: Comment delete authorization
   * Validates: Requirements 11.3
   *
   * Property: Only comment authors can delete their own comments.
   * Non-authors attempting to delete should receive CommentPermissionError.
   */
  test('Property 23: Non-authors cannot delete comments', async () => {
    await fc.assert(
      fc.asyncProperty(
        commentMessageArb,
        async (message) => {
          // Create a comment by the author
          const commentId = await addTestComment(testContext, message);

          // Non-author tries to delete the comment
          let errorThrown = false;
          let errorType: string | null = null;

          try {
            await deleteComment({
              attachmentId: testContext.attachmentId,
              annotationId: testContext.annotationId,
              commentId,
              authorId: testContext.nonAuthorUserId, // Different user!
            });
          } catch (error) {
            errorThrown = true;
            if (error instanceof CommentPermissionError) {
              errorType = 'CommentPermissionError';
            }
          }

          // Verify that CommentPermissionError was thrown
          expect(errorThrown).toBe(true);
          expect(errorType).toBe('CommentPermissionError');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 23 (positive case): Authors CAN delete their own comments
   */
  test('Property 23: Authors can delete their own comments', async () => {
    await fc.assert(
      fc.asyncProperty(
        commentMessageArb,
        async (message) => {
          // Create a comment by the author
          const commentId = await addTestComment(testContext, message);

          // Author deletes their own comment - should succeed
          let errorThrown = false;

          try {
            await deleteComment({
              attachmentId: testContext.attachmentId,
              annotationId: testContext.annotationId,
              commentId,
              authorId: testContext.authorUserId, // Same user as comment author
            });
          } catch (error) {
            errorThrown = true;
            console.error('Unexpected error:', error);
          }

          // Should NOT throw any error
          expect(errorThrown).toBe(false);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 23 (random users): Any random user ID that is not the author cannot delete
   */
  test('Property 23: Random user IDs that are not author cannot delete comments', async () => {
    await fc.assert(
      fc.asyncProperty(
        commentMessageArb,
        differentUserIdArb,
        async (message, randomUserId) => {
          // Skip if random ID happens to match author (extremely unlikely but possible)
          if (randomUserId === testContext.authorUserId) {
            return;
          }

          // Create a comment by the author
          const commentId = await addTestComment(testContext, message);

          // Random user tries to delete the comment
          let errorThrown = false;
          let errorType: string | null = null;

          try {
            await deleteComment({
              attachmentId: testContext.attachmentId,
              annotationId: testContext.annotationId,
              commentId,
              authorId: randomUserId, // Random user ID
            });
          } catch (error) {
            errorThrown = true;
            if (error instanceof CommentPermissionError) {
              errorType = 'CommentPermissionError';
            }
          }

          // Verify that CommentPermissionError was thrown
          expect(errorThrown).toBe(true);
          expect(errorType).toBe('CommentPermissionError');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 23 (non-existent comment): Deleting non-existent comment throws CommentNotFoundError
   */
  test('Property 23: Deleting non-existent comment throws CommentNotFoundError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Random non-existent comment ID
        async (fakeCommentId) => {
          let errorThrown = false;
          let errorType: string | null = null;

          try {
            await deleteComment({
              attachmentId: testContext.attachmentId,
              annotationId: testContext.annotationId,
              commentId: fakeCommentId,
              authorId: testContext.authorUserId,
            });
          } catch (error) {
            errorThrown = true;
            if (error instanceof CommentNotFoundError) {
              errorType = 'CommentNotFoundError';
            }
          }

          // Verify that CommentNotFoundError was thrown
          expect(errorThrown).toBe(true);
          expect(errorType).toBe('CommentNotFoundError');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 23 (invariant): After failed delete attempt, comment still exists
   */
  test('Property 23: Failed delete attempt does not modify comment', async () => {
    await fc.assert(
      fc.asyncProperty(
        commentMessageArb,
        async (message) => {
          // Create a comment by the author
          const commentId = await addTestComment(testContext, message);

          // Record the number of comments before failed delete
          const beforeResult = await db.query.issueAttachments.findFirst({
            where: eq(issueAttachments.id, testContext.attachmentId),
          });
          const beforeAnnotations = (beforeResult?.annotations as Array<{
            id: string;
            comments: Array<{ id: string }>;
          }>) || [];
          const beforeAnnotation = beforeAnnotations.find(
            (a) => a.id === testContext.annotationId
          );
          const beforeCommentCount = beforeAnnotation?.comments.length || 0;

          // Non-author tries to delete (should fail)
          try {
            await deleteComment({
              attachmentId: testContext.attachmentId,
              annotationId: testContext.annotationId,
              commentId,
              authorId: testContext.nonAuthorUserId,
            });
          } catch {
            // Expected to fail
          }

          // Verify comment still exists
          const afterResult = await db.query.issueAttachments.findFirst({
            where: eq(issueAttachments.id, testContext.attachmentId),
          });
          const afterAnnotations = (afterResult?.annotations as Array<{
            id: string;
            comments: Array<{ id: string }>;
          }>) || [];
          const afterAnnotation = afterAnnotations.find(
            (a) => a.id === testContext.annotationId
          );
          const afterCommentCount = afterAnnotation?.comments.length || 0;

          // Comment count should be unchanged
          expect(afterCommentCount).toBe(beforeCommentCount);

          // The specific comment should still exist
          const commentExists = afterAnnotation?.comments.some(
            (c) => c.id === commentId
          );
          expect(commentExists).toBe(true);
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
