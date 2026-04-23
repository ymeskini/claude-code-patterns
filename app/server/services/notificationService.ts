import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { notifications, NotificationType } from "~/server/db/schema";

export function createNotification(opts: {
  recipientUserId: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
}) {
  return db
    .insert(notifications)
    .values({
      recipientUserId: opts.recipientUserId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      linkUrl: opts.linkUrl,
    })
    .returning()
    .get();
}

export function getUnreadCount(userId: number) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false)
      )
    )
    .get();

  return result?.count ?? 0;
}

export function getNotifications(opts: {
  userId: number;
  limit: number;
  offset: number;
}) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, opts.userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
}

export function getNotificationById(notificationId: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .get();
}

export function markAsRead(opts: { notificationId: number }) {
  db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, opts.notificationId))
    .run();
}

export function markAllAsRead(opts: { userId: number }) {
  db.update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientUserId, opts.userId),
        eq(notifications.isRead, false)
      )
    )
    .run();
}
