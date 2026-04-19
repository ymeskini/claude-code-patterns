import { db } from "~/server/db";
import { lessonBookmarks, lessons, modules } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";

/** Toggle bookmark: delete if exists, insert if not. Returns new state. */
export function toggleBookmark(opts: {
  userId: number;
  lessonId: number;
}): { bookmarked: boolean } {
  const { userId, lessonId } = opts;
  const existing = db
    .select({ id: lessonBookmarks.id })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(lessonBookmarks.lessonId, lessonId)
      )
    )
    .get();

  if (existing) {
    db.delete(lessonBookmarks)
      .where(eq(lessonBookmarks.id, existing.id))
      .run();
    return { bookmarked: false };
  }

  db.insert(lessonBookmarks).values({ userId, lessonId }).run();
  return { bookmarked: true };
}

/** Whether this user has bookmarked this lesson. */
export function isLessonBookmarked(opts: {
  userId: number;
  lessonId: number;
}): boolean {
  const row = db
    .select({ id: lessonBookmarks.id })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, opts.userId),
        eq(lessonBookmarks.lessonId, opts.lessonId)
      )
    )
    .get();
  return !!row;
}

/** All lessonIds bookmarked by this user within a given course. */
export function getBookmarkedLessonIds(opts: {
  userId: number;
  courseId: number;
}): number[] {
  const rows = db
    .select({ lessonId: lessonBookmarks.lessonId })
    .from(lessonBookmarks)
    .innerJoin(lessons, eq(lessonBookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(
        eq(lessonBookmarks.userId, opts.userId),
        eq(modules.courseId, opts.courseId)
      )
    )
    .all();
  return rows.map((r) => r.lessonId);
}
