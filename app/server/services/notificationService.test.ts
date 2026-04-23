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

import { createNotification, getUnreadCount } from "./notificationService";

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
});
