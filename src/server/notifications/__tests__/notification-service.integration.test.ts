/**
 * Notification Service Integration Tests
 *
 * Tests for the notification service layer covering:
 * - CRUD operations
 * - Actor exclusion (self-notification prevention)
 * - Deduplication
 * - Pagination
 * - Read/unread count
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db";
import { notifications } from "@/server/db/schema/notifications";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import {
  createNotification,
  createNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  shouldCreateNotification,
  isDuplicate,
  buildTargetUrl,
} from "../notification-service";
import type { CreateNotificationDTO, NotificationType } from "../types";

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Notification Service", () => {
  // Test user IDs
  let testUserId1: string;
  let testUserId2: string;

  // Helper to create a valid notification DTO
  const createTestNotificationDTO = (
    overrides: Partial<CreateNotificationDTO> = {}
  ): CreateNotificationDTO => ({
    recipientId: testUserId1,
    actorId: testUserId2,
    type: "mention",
    entityType: "comment",
    entityId: crypto.randomUUID(),
    metadata: {
      target_url: "/teams/test/projects/PROJ/issues/PROJ-1",
      issue_title: "Test Issue",
      issue_key: "PROJ-1",
      comment_preview: "Test comment...",
      team_slug: "test",
      project_key: "PROJ",
    },
    ...overrides,
  });

  beforeEach(async () => {
    // Create test users
    const [user1] = await db
      .insert(users)
      .values({
        email: `test-${crypto.randomUUID()}@example.com`,
        name: "Test User 1",
        emailVerified: true,
      })
      .returning();
    testUserId1 = user1.id;

    const [user2] = await db
      .insert(users)
      .values({
        email: `test-${crypto.randomUUID()}@example.com`,
        name: "Test User 2",
        emailVerified: true,
      })
      .returning();
    testUserId2 = user2.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(notifications).where(eq(notifications.recipientId, testUserId1));
    await db.delete(notifications).where(eq(notifications.recipientId, testUserId2));
    await db.delete(users).where(eq(users.id, testUserId1));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  // ============================================================================
  // HELPER FUNCTION TESTS
  // ============================================================================

  describe("shouldCreateNotification", () => {
    it("should return true when actorId is different from recipientId", () => {
      expect(shouldCreateNotification("user-1", "user-2")).toBe(true);
    });

    it("should return false when actorId equals recipientId (self-notification)", () => {
      expect(shouldCreateNotification("user-1", "user-1")).toBe(false);
    });

    it("should return true when actorId is undefined", () => {
      expect(shouldCreateNotification(undefined, "user-1")).toBe(true);
    });
  });

  describe("buildTargetUrl", () => {
    it("should build URL for mention notification with comment anchor", () => {
      const url = buildTargetUrl("mention", {
        team_slug: "acme",
        project_key: "PROJ",
        issue_key: "PROJ-123",
        comment_id: "abc-123",
      });
      expect(url).toBe("/teams/acme/projects/PROJ/issues/PROJ-123#comment-abc-123");
    });

    it("should build URL for issue_assigned without comment anchor", () => {
      const url = buildTargetUrl("issue_assigned", {
        team_slug: "acme",
        project_key: "PROJ",
        issue_key: "PROJ-123",
      });
      expect(url).toBe("/teams/acme/projects/PROJ/issues/PROJ-123");
    });

    it("should build URL for project_invitation", () => {
      const url = buildTargetUrl("project_invitation", {
        team_slug: "acme",
        project_key: "PROJ",
      });
      expect(url).toBe("/teams/acme/projects/PROJ");
    });

    it("should build URL for team_invitation", () => {
      const url = buildTargetUrl("team_invitation", {
        team_slug: "acme",
      });
      expect(url).toBe("/projects");
    });

    it("should fallback to root when missing required fields", () => {
      const url = buildTargetUrl("mention", {});
      expect(url).toBe("/");
    });

    it("should use provided target_url as fallback", () => {
      const url = buildTargetUrl("mention", {
        target_url: "/custom/path",
      });
      expect(url).toBe("/custom/path");
    });
  });

  // ============================================================================
  // CREATE OPERATION TESTS
  // ============================================================================

  describe("createNotification", () => {
    it("should create a notification successfully", async () => {
      const dto = createTestNotificationDTO();
      const notification = await createNotification(dto);

      expect(notification).not.toBeNull();
      expect(notification?.recipientId).toBe(testUserId1);
      expect(notification?.actorId).toBe(testUserId2);
      expect(notification?.type).toBe("mention");
      expect(notification?.readAt).toBeNull();
    });

    it("should NOT create self-notification (actor exclusion)", async () => {
      const dto = createTestNotificationDTO({
        recipientId: testUserId1,
        actorId: testUserId1, // Same as recipient
      });
      const notification = await createNotification(dto);

      expect(notification).toBeNull();
    });

    it("should NOT create duplicate notification within dedup window", async () => {
      const dto = createTestNotificationDTO();

      // Create first notification
      const first = await createNotification(dto);
      expect(first).not.toBeNull();

      // Try to create duplicate
      const duplicate = await createNotification(dto);
      expect(duplicate).toBeNull();
    });

    it("should return null for invalid notification data", async () => {
      const dto = {
        recipientId: "invalid-uuid", // Invalid UUID
        type: "mention" as NotificationType,
        entityType: "comment" as const,
        entityId: crypto.randomUUID(),
        metadata: { target_url: "/test" },
      };

      const notification = await createNotification(dto as CreateNotificationDTO);
      expect(notification).toBeNull();
    });
  });

  describe("createNotifications (batch)", () => {
    it("should create multiple notifications", async () => {
      const dtos = [
        createTestNotificationDTO({ entityId: crypto.randomUUID() }),
        createTestNotificationDTO({ entityId: crypto.randomUUID() }),
      ];

      const results = await createNotifications(dtos);
      expect(results).toHaveLength(2);
    });

    it("should filter out failed creations (actor exclusion)", async () => {
      const dtos = [
        createTestNotificationDTO({ entityId: crypto.randomUUID() }),
        createTestNotificationDTO({
          entityId: crypto.randomUUID(),
          recipientId: testUserId1,
          actorId: testUserId1, // Self-notification - should be filtered
        }),
      ];

      const results = await createNotifications(dtos);
      expect(results).toHaveLength(1);
    });
  });

  // ============================================================================
  // READ OPERATION TESTS
  // ============================================================================

  describe("getNotifications", () => {
    it("should return empty list for user with no notifications", async () => {
      const result = await getNotifications(testUserId1);

      expect(result.notifications).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.totalUnread).toBe(0);
    });

    it("should return notifications for user", async () => {
      // Create notifications
      await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));

      const result = await getNotifications(testUserId1);

      expect(result.notifications).toHaveLength(2);
      expect(result.totalUnread).toBe(2);
    });

    it("should respect pagination limit", async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      }

      const result = await getNotifications(testUserId1, { limit: 2 });

      expect(result.notifications).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it("should filter unread only when specified", async () => {
      // Create 2 notifications
      const n1 = await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));

      // Mark one as read
      if (n1) {
        await markAsRead(testUserId1, [n1.id]);
      }

      const result = await getNotifications(testUserId1, { unreadOnly: true });

      expect(result.notifications).toHaveLength(1);
    });
  });

  describe("getUnreadCount", () => {
    it("should return 0 for user with no notifications", async () => {
      const count = await getUnreadCount(testUserId1);
      expect(count).toBe(0);
    });

    it("should return correct unread count", async () => {
      // Create 3 notifications
      for (let i = 0; i < 3; i++) {
        await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      }

      const count = await getUnreadCount(testUserId1);
      expect(count).toBe(3);
    });

    it("should decrease after marking as read", async () => {
      // Create notifications
      const n1 = await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));

      // Mark one as read
      if (n1) {
        await markAsRead(testUserId1, [n1.id]);
      }

      const count = await getUnreadCount(testUserId1);
      expect(count).toBe(1);
    });
  });

  // ============================================================================
  // UPDATE OPERATION TESTS
  // ============================================================================

  describe("markAsRead", () => {
    it("should mark specific notifications as read", async () => {
      const n1 = await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      const n2 = await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));

      if (n1 && n2) {
        const updated = await markAsRead(testUserId1, [n1.id]);
        expect(updated).toBe(1);

        const unread = await getUnreadCount(testUserId1);
        expect(unread).toBe(1);
      }
    });

    it("should return 0 for empty array", async () => {
      const updated = await markAsRead(testUserId1, []);
      expect(updated).toBe(0);
    });

    it("should only mark user's own notifications", async () => {
      const n1 = await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));

      if (n1) {
        // Try to mark as read with different user
        const updated = await markAsRead(testUserId2, [n1.id]);
        expect(updated).toBe(0);
      }
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      // Create 3 notifications
      for (let i = 0; i < 3; i++) {
        await createNotification(createTestNotificationDTO({ entityId: crypto.randomUUID() }));
      }

      const updated = await markAllAsRead(testUserId1);
      expect(updated).toBe(3);

      const unread = await getUnreadCount(testUserId1);
      expect(unread).toBe(0);
    });

    it("should return 0 when no unread notifications exist", async () => {
      const updated = await markAllAsRead(testUserId1);
      expect(updated).toBe(0);
    });
  });

  // ============================================================================
  // DEDUPLICATION TESTS
  // ============================================================================

  describe("isDuplicate", () => {
    it("should return false when no duplicate exists", async () => {
      const dto = createTestNotificationDTO();
      const result = await isDuplicate(dto);
      expect(result).toBe(false);
    });

    it("should return true when duplicate exists within window", async () => {
      const dto = createTestNotificationDTO();

      // Create notification first
      await createNotification(dto);

      // Check for duplicate
      const result = await isDuplicate(dto);
      expect(result).toBe(true);
    });

    it("should return false for different entity IDs", async () => {
      const dto1 = createTestNotificationDTO({ entityId: crypto.randomUUID() });
      const dto2 = createTestNotificationDTO({ entityId: crypto.randomUUID() });

      await createNotification(dto1);

      const result = await isDuplicate(dto2);
      expect(result).toBe(false);
    });
  });
});
