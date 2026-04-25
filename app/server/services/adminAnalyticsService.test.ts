import { describe, it, expect, beforeEach, vi } from "vitest";
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
  getStartDateForPeriod,
  getTotalRevenue,
  getTotalEnrollments,
  getTopEarningCourse,
  isAdminAnalyticsPeriod,
} from "./adminAnalyticsService";

function insertPurchase(opts: {
  userId: number;
  courseId: number;
  pricePaid: number;
  createdAt: string;
}) {
  return testDb
    .insert(schema.purchases)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      pricePaid: opts.pricePaid,
      country: null,
      createdAt: opts.createdAt,
    })
    .returning()
    .get();
}

function insertEnrollment(opts: {
  userId: number;
  courseId: number;
  enrolledAt: string;
}) {
  return testDb
    .insert(schema.enrollments)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      enrolledAt: opts.enrolledAt,
    })
    .returning()
    .get();
}

function insertCourse(opts: {
  title: string;
  slug: string;
  instructorId: number;
  categoryId: number;
}) {
  return testDb
    .insert(schema.courses)
    .values({
      title: opts.title,
      slug: opts.slug,
      description: "desc",
      instructorId: opts.instructorId,
      categoryId: opts.categoryId,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();
}

describe("adminAnalyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("isAdminAnalyticsPeriod", () => {
    it("accepts known periods", () => {
      expect(isAdminAnalyticsPeriod("7d")).toBe(true);
      expect(isAdminAnalyticsPeriod("30d")).toBe(true);
      expect(isAdminAnalyticsPeriod("12m")).toBe(true);
      expect(isAdminAnalyticsPeriod("all")).toBe(true);
    });

    it("rejects unknown periods", () => {
      expect(isAdminAnalyticsPeriod("today")).toBe(false);
      expect(isAdminAnalyticsPeriod("")).toBe(false);
    });
  });

  describe("getStartDateForPeriod", () => {
    const now = new Date("2026-04-25T12:00:00.000Z");

    it("returns 7 days ago for 7d", () => {
      const start = getStartDateForPeriod({ period: "7d", now });
      expect(start).toBe("2026-04-18T12:00:00.000Z");
    });

    it("returns 30 days ago for 30d", () => {
      const start = getStartDateForPeriod({ period: "30d", now });
      expect(start).toBe("2026-03-26T12:00:00.000Z");
    });

    it("returns 12 months ago for 12m", () => {
      const start = getStartDateForPeriod({ period: "12m", now });
      expect(start).toBe("2025-04-25T12:00:00.000Z");
    });

    it("returns null for all", () => {
      expect(getStartDateForPeriod({ period: "all", now })).toBeNull();
    });
  });

  describe("getTotalRevenue", () => {
    it("returns 0 when there are no purchases", () => {
      expect(getTotalRevenue({ startDate: null })).toBe(0);
    });

    it("sums pricePaid across all purchases when startDate is null", () => {
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 2500,
        createdAt: "2026-04-01T00:00:00.000Z",
      });

      expect(getTotalRevenue({ startDate: null })).toBe(3500);
    });

    it("excludes purchases before startDate", () => {
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 2500,
        createdAt: "2026-04-20T00:00:00.000Z",
      });

      expect(getTotalRevenue({ startDate: "2026-04-01T00:00:00.000Z" })).toBe(
        2500
      );
    });

    it("aggregates across multiple courses and instructors", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Inst",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();
      const otherCourse = insertCourse({
        title: "Other Course",
        slug: "other-course",
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
      });

      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 1500,
        createdAt: "2026-04-10T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.user.id,
        courseId: otherCourse.id,
        pricePaid: 4000,
        createdAt: "2026-04-15T00:00:00.000Z",
      });

      expect(getTotalRevenue({ startDate: null })).toBe(5500);
    });
  });

  describe("getTotalEnrollments", () => {
    it("returns 0 when there are no enrollments", () => {
      expect(getTotalEnrollments({ startDate: null })).toBe(0);
    });

    it("counts all enrollments when startDate is null", () => {
      insertEnrollment({
        userId: base.user.id,
        courseId: base.course.id,
        enrolledAt: "2026-04-01T00:00:00.000Z",
      });
      insertEnrollment({
        userId: base.instructor.id,
        courseId: base.course.id,
        enrolledAt: "2026-04-10T00:00:00.000Z",
      });

      expect(getTotalEnrollments({ startDate: null })).toBe(2);
    });

    it("excludes enrollments before startDate", () => {
      insertEnrollment({
        userId: base.user.id,
        courseId: base.course.id,
        enrolledAt: "2026-01-01T00:00:00.000Z",
      });
      insertEnrollment({
        userId: base.instructor.id,
        courseId: base.course.id,
        enrolledAt: "2026-04-20T00:00:00.000Z",
      });

      expect(
        getTotalEnrollments({ startDate: "2026-04-01T00:00:00.000Z" })
      ).toBe(1);
    });
  });

  describe("getTopEarningCourse", () => {
    it("returns null when there are no purchases", () => {
      expect(getTopEarningCourse({ startDate: null })).toBeNull();
    });

    it("returns the course with the highest revenue", () => {
      const otherCourse = insertCourse({
        title: "Other Course",
        slug: "other-course",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
      });

      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 5000,
        createdAt: "2026-04-10T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.user.id,
        courseId: otherCourse.id,
        pricePaid: 1000,
        createdAt: "2026-04-11T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.instructor.id,
        courseId: otherCourse.id,
        pricePaid: 1500,
        createdAt: "2026-04-12T00:00:00.000Z",
      });

      const top = getTopEarningCourse({ startDate: null });

      expect(top).not.toBeNull();
      expect(top!.courseId).toBe(base.course.id);
      expect(top!.title).toBe("Test Course");
      expect(top!.revenue).toBe(5000);
    });

    it("respects startDate when ranking", () => {
      const otherCourse = insertCourse({
        title: "Other Course",
        slug: "other-course",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
      });

      // Test Course earned more historically, but not in window.
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 9000,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      insertPurchase({
        userId: base.user.id,
        courseId: otherCourse.id,
        pricePaid: 3000,
        createdAt: "2026-04-15T00:00:00.000Z",
      });

      const top = getTopEarningCourse({
        startDate: "2026-04-01T00:00:00.000Z",
      });

      expect(top).not.toBeNull();
      expect(top!.courseId).toBe(otherCourse.id);
      expect(top!.revenue).toBe(3000);
    });

    it("returns null when no purchases fall inside the period", () => {
      insertPurchase({
        userId: base.user.id,
        courseId: base.course.id,
        pricePaid: 5000,
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      expect(
        getTopEarningCourse({ startDate: "2026-04-01T00:00:00.000Z" })
      ).toBeNull();
    });
  });
});
