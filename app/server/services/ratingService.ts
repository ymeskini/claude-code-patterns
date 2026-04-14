import { db } from "~/server/db";
import { courseRatings } from "~/server/db/schema";
import { eq, and, avg, count, inArray } from "drizzle-orm";

/** Get the current user's rating for a course, or null */
export function getUserRating(userId: number, courseId: number) {
  return (
    db
      .select()
      .from(courseRatings)
      .where(
        and(
          eq(courseRatings.userId, userId),
          eq(courseRatings.courseId, courseId)
        )
      )
      .get() ?? null
  );
}

/** Average rating + count for a single course */
export function getAverageRating(courseId: number): {
  average: number | null;
  count: number;
} {
  const result = db
    .select({ average: avg(courseRatings.rating), count: count() })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();
  return {
    average: result?.average
      ? Number(Number(result.average).toFixed(1))
      : null,
    count: result?.count ?? 0,
  };
}

/** Batch average ratings for the course list page */
export function getAverageRatingsForCourses(
  courseIds: number[]
): Map<number, { average: number | null; count: number }> {
  if (courseIds.length === 0) return new Map();
  const rows = db
    .select({
      courseId: courseRatings.courseId,
      average: avg(courseRatings.rating),
      count: count(),
    })
    .from(courseRatings)
    .where(inArray(courseRatings.courseId, courseIds))
    .groupBy(courseRatings.courseId)
    .all();
  const map = new Map<number, { average: number | null; count: number }>();
  for (const row of rows) {
    map.set(row.courseId, {
      average: row.average ? Number(Number(row.average).toFixed(1)) : null,
      count: row.count,
    });
  }
  return map;
}

/** Insert or update a user's rating (1–5) */
export function upsertRating(
  userId: number,
  courseId: number,
  rating: number
) {
  const existing = getUserRating(userId, courseId);
  if (existing) {
    db.update(courseRatings)
      .set({ rating })
      .where(
        and(
          eq(courseRatings.userId, userId),
          eq(courseRatings.courseId, courseId)
        )
      )
      .run();
  } else {
    db.insert(courseRatings).values({ userId, courseId, rating }).run();
  }
}
