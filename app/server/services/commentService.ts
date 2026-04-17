import { db } from "~/server/db";
import { lessonComments, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/** Get all comments for a lesson with author info, oldest first */
export function getCommentsForLesson(lessonId: number) {
  return db
    .select({
      id: lessonComments.id,
      lessonId: lessonComments.lessonId,
      userId: lessonComments.userId,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(lessonComments.createdAt)
    .all();
}

/** Get a single comment by ID (for authorization checks) */
export function getCommentById(commentId: number) {
  return (
    db
      .select()
      .from(lessonComments)
      .where(eq(lessonComments.id, commentId))
      .get() ?? null
  );
}

/** Create a new comment on a lesson */
export function createComment(
  lessonId: number,
  userId: number,
  content: string
) {
  return db
    .insert(lessonComments)
    .values({ lessonId, userId, content })
    .returning()
    .get();
}

/** Delete a comment by ID. Authorization is enforced at the route level. */
export function deleteComment(commentId: number) {
  db.delete(lessonComments).where(eq(lessonComments.id, commentId)).run();
}
