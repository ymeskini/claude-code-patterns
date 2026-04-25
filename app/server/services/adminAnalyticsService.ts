import { eq, gte, sql, desc, and } from "drizzle-orm";
import { db } from "~/server/db";
import { purchases, enrollments, courses } from "~/server/db/schema";

export type AdminAnalyticsPeriod = "7d" | "30d" | "12m" | "all";

export const ADMIN_ANALYTICS_PERIODS: readonly AdminAnalyticsPeriod[] = [
  "7d",
  "30d",
  "12m",
  "all",
] as const;

export function isAdminAnalyticsPeriod(
  value: string
): value is AdminAnalyticsPeriod {
  return (ADMIN_ANALYTICS_PERIODS as readonly string[]).includes(value);
}

export function getStartDateForPeriod(opts: {
  period: AdminAnalyticsPeriod;
  now?: Date;
}): string | null {
  const now = opts.now ?? new Date();
  switch (opts.period) {
    case "7d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 7);
      return d.toISOString();
    }
    case "30d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 30);
      return d.toISOString();
    }
    case "12m": {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 12);
      return d.toISOString();
    }
    case "all":
      return null;
  }
}

export function getTotalRevenue(opts: { startDate: string | null }) {
  const query = db
    .select({ total: sql<number>`coalesce(sum(${purchases.pricePaid}), 0)` })
    .from(purchases);

  const result = opts.startDate
    ? query.where(gte(purchases.createdAt, opts.startDate)).get()
    : query.get();

  return result?.total ?? 0;
}

export function getTotalEnrollments(opts: { startDate: string | null }) {
  const query = db.select({ count: sql<number>`count(*)` }).from(enrollments);

  const result = opts.startDate
    ? query.where(gte(enrollments.enrolledAt, opts.startDate)).get()
    : query.get();

  return result?.count ?? 0;
}

export function getTopEarningCourse(opts: { startDate: string | null }) {
  const conditions = opts.startDate
    ? and(gte(purchases.createdAt, opts.startDate))
    : undefined;

  const baseQuery = db
    .select({
      courseId: courses.id,
      title: courses.title,
      revenue: sql<number>`coalesce(sum(${purchases.pricePaid}), 0)`,
    })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .groupBy(courses.id)
    .orderBy(desc(sql`coalesce(sum(${purchases.pricePaid}), 0)`))
    .limit(1);

  const row = (conditions ? baseQuery.where(conditions) : baseQuery).get();

  if (!row || row.revenue === 0) return null;

  return {
    courseId: row.courseId,
    title: row.title,
    revenue: row.revenue,
  };
}
