import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/server/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/server/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  createNotification,
  getNotificationById,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./notificationService";

describe("notificationService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createNotification", () => {
    it("creates a notification with all fields", () => {
      const notification = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "Test User enrolled in Test Course",
        linkUrl: `/instructor/${base.course.id}/students`,
      });

      expect(notification).toBeDefined();
      expect(notification.recipientUserId).toBe(base.instructor.id);
      expect(notification.type).toBe(schema.NotificationType.Enrollment);
      expect(notification.title).toBe("New Enrollment");
      expect(notification.message).toBe("Test User enrolled in Test Course");
      expect(notification.linkUrl).toBe(
        `/instructor/${base.course.id}/students`
      );
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe("getUnreadCount", () => {
    it("returns 0 when the user has no notifications", () => {
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("counts only unread notifications for the user", () => {
      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "A enrolled",
        linkUrl: "/instructor/1/students",
      });
      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "B enrolled",
        linkUrl: "/instructor/1/students",
      });

      expect(getUnreadCount(base.instructor.id)).toBe(2);
    });

    it("does not count notifications belonging to other users", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification({
        recipientUserId: otherInstructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "A enrolled",
        linkUrl: "/instructor/1/students",
      });

      expect(getUnreadCount(base.instructor.id)).toBe(0);
      expect(getUnreadCount(otherInstructor.id)).toBe(1);
    });

    it("excludes notifications that have been marked read", () => {
      const created = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "A enrolled",
        linkUrl: "/instructor/1/students",
      });

      testDb
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, created.id))
        .run();

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });
  });

  describe("getNotifications", () => {
    it("returns an empty array when the user has no notifications", () => {
      expect(
        getNotifications({
          userId: base.instructor.id,
          limit: 5,
          offset: 0,
        })
      ).toEqual([]);
    });

    it("returns notifications ordered by most recent first", () => {
      const first = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "first",
        linkUrl: "/instructor/1/students",
      });
      const second = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "second",
        linkUrl: "/instructor/1/students",
      });
      const third = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "third",
        linkUrl: "/instructor/1/students",
      });

      const result = getNotifications({
        userId: base.instructor.id,
        limit: 10,
        offset: 0,
      });

      expect(result.map((n) => n.id)).toEqual([third.id, second.id, first.id]);
    });

    it("respects limit", () => {
      for (let i = 0; i < 7; i++) {
        createNotification({
          recipientUserId: base.instructor.id,
          type: schema.NotificationType.Enrollment,
          title: "New Enrollment",
          message: `n${i}`,
          linkUrl: "/instructor/1/students",
        });
      }

      const result = getNotifications({
        userId: base.instructor.id,
        limit: 5,
        offset: 0,
      });

      expect(result).toHaveLength(5);
    });

    it("respects offset", () => {
      const created = [];
      for (let i = 0; i < 5; i++) {
        created.push(
          createNotification({
            recipientUserId: base.instructor.id,
            type: schema.NotificationType.Enrollment,
            title: "New Enrollment",
            message: `n${i}`,
            linkUrl: "/instructor/1/students",
          })
        );
      }

      const page1 = getNotifications({
        userId: base.instructor.id,
        limit: 2,
        offset: 0,
      });
      const page2 = getNotifications({
        userId: base.instructor.id,
        limit: 2,
        offset: 2,
      });

      const newestFirstIds = [...created].reverse().map((n) => n.id);
      expect(page1.map((n) => n.id)).toEqual(newestFirstIds.slice(0, 2));
      expect(page2.map((n) => n.id)).toEqual(newestFirstIds.slice(2, 4));
    });

    it("only returns notifications owned by the given user", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification({
        recipientUserId: otherInstructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "other",
        linkUrl: "/instructor/1/students",
      });
      const mine = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "mine",
        linkUrl: "/instructor/1/students",
      });

      const result = getNotifications({
        userId: base.instructor.id,
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mine.id);
    });

    it("includes both read and unread notifications", () => {
      const read = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "read",
        linkUrl: "/instructor/1/students",
      });
      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "unread",
        linkUrl: "/instructor/1/students",
      });

      testDb
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, read.id))
        .run();

      const result = getNotifications({
        userId: base.instructor.id,
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("markAsRead", () => {
    it("marks a single notification as read", () => {
      const created = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "hello",
        linkUrl: "/instructor/1/students",
      });

      markAsRead({ notificationId: created.id });

      const after = getNotificationById(created.id);
      expect(after?.isRead).toBe(true);
    });

    it("does not affect other notifications", () => {
      const a = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "a",
        linkUrl: "/instructor/1/students",
      });
      const b = createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "b",
        linkUrl: "/instructor/1/students",
      });

      markAsRead({ notificationId: a.id });

      expect(getNotificationById(a.id)?.isRead).toBe(true);
      expect(getNotificationById(b.id)?.isRead).toBe(false);
    });
  });

  describe("markAllAsRead", () => {
    it("marks every unread notification for the user as read", () => {
      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "a",
        linkUrl: "/instructor/1/students",
      });
      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "b",
        linkUrl: "/instructor/1/students",
      });

      markAllAsRead({ userId: base.instructor.id });

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("does not touch notifications belonging to other users", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification({
        recipientUserId: base.instructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "mine",
        linkUrl: "/instructor/1/students",
      });
      createNotification({
        recipientUserId: otherInstructor.id,
        type: schema.NotificationType.Enrollment,
        title: "New Enrollment",
        message: "other",
        linkUrl: "/instructor/1/students",
      });

      markAllAsRead({ userId: base.instructor.id });

      expect(getUnreadCount(base.instructor.id)).toBe(0);
      expect(getUnreadCount(otherInstructor.id)).toBe(1);
    });

    it("is a no-op when the user has no unread notifications", () => {
      expect(() =>
        markAllAsRead({ userId: base.instructor.id })
      ).not.toThrow();
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });
  });
});
