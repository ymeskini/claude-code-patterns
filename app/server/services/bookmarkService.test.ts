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

// Import after mock so the module picks up our test db
import {
  toggleBookmark,
  isLessonBookmarked,
  getBookmarkedLessonIds,
} from "./bookmarkService";

function createLesson(opts: { courseId: number; title: string }) {
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId: opts.courseId, title: `mod-${opts.title}`, position: 1 })
    .returning()
    .get();
  return testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: opts.title, position: 1 })
    .returning()
    .get();
}

describe("bookmarkService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("toggleBookmark", () => {
    it("creates a bookmark when none exists", () => {
      const lesson = createLesson({
        courseId: base.course.id,
        title: "L1",
      });

      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lesson.id,
      });

      expect(result).toEqual({ bookmarked: true });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(true);
    });

    it("removes an existing bookmark on second toggle", () => {
      const lesson = createLesson({
        courseId: base.course.id,
        title: "L1",
      });

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lesson.id,
      });

      expect(result).toEqual({ bookmarked: false });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(false);
    });

    it("treats each user's bookmarks independently", () => {
      const otherUser = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();
      const lesson = createLesson({
        courseId: base.course.id,
        title: "L1",
      });

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(true);
      expect(
        isLessonBookmarked({ userId: otherUser.id, lessonId: lesson.id })
      ).toBe(false);
    });
  });

  describe("isLessonBookmarked", () => {
    it("returns false when no bookmark exists", () => {
      const lesson = createLesson({
        courseId: base.course.id,
        title: "L1",
      });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(false);
    });
  });

  describe("getBookmarkedLessonIds", () => {
    it("returns only lessons in the requested course", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other",
          slug: "other",
          description: "x",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const a = createLesson({ courseId: base.course.id, title: "A" });
      const b = createLesson({ courseId: base.course.id, title: "B" });
      const c = createLesson({ courseId: otherCourse.id, title: "C" });

      toggleBookmark({ userId: base.user.id, lessonId: a.id });
      toggleBookmark({ userId: base.user.id, lessonId: b.id });
      toggleBookmark({ userId: base.user.id, lessonId: c.id });

      const ids = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });

      expect(ids.sort()).toEqual([a.id, b.id].sort());
    });

    it("returns empty array when user has no bookmarks", () => {
      createLesson({ courseId: base.course.id, title: "L1" });
      const ids = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });
      expect(ids).toEqual([]);
    });

    it("does not return other users' bookmarks", () => {
      const otherUser = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();
      const lesson = createLesson({
        courseId: base.course.id,
        title: "L1",
      });

      toggleBookmark({ userId: otherUser.id, lessonId: lesson.id });

      const ids = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });
      expect(ids).toEqual([]);
    });
  });
});
