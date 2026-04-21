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
import { getQuizInsightsForCourse } from "./quizService";

function insertStudent(name: string, email: string) {
  return testDb
    .insert(schema.users)
    .values({ name, email, role: schema.UserRole.Student })
    .returning()
    .get();
}

function insertModule(courseId: number, title: string, position: number) {
  return testDb
    .insert(schema.modules)
    .values({ courseId, title, position })
    .returning()
    .get();
}

function insertLesson(moduleId: number, title: string, position: number) {
  return testDb
    .insert(schema.lessons)
    .values({ moduleId, title, position })
    .returning()
    .get();
}

function insertQuiz(lessonId: number, title: string, passingScore = 0.7) {
  return testDb
    .insert(schema.quizzes)
    .values({ lessonId, title, passingScore })
    .returning()
    .get();
}

function insertAttempt(
  userId: number,
  quizId: number,
  score: number,
  passed: boolean
) {
  return testDb
    .insert(schema.quizAttempts)
    .values({ userId, quizId, score, passed })
    .returning()
    .get();
}

describe("quizService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getQuizInsightsForCourse", () => {
    it("returns empty array when the course has no quizzes", () => {
      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows).toEqual([]);
    });

    it("returns a row per quiz with zeroed counts when no attempts exist", () => {
      const mod = insertModule(base.course.id, "Module A", 1);
      const lesson = insertLesson(mod.id, "Lesson A1", 1);
      insertQuiz(lesson.id, "Quiz A1");

      const rows = getQuizInsightsForCourse(base.course.id);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        quizTitle: "Quiz A1",
        lessonTitle: "Lesson A1",
        moduleTitle: "Module A",
        attempted: 0,
        passed: 0,
      });
    });

    it("counts distinct users for attempted (multiple attempts by one user count once)", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lesson = insertLesson(mod.id, "L", 1);
      const quiz = insertQuiz(lesson.id, "Q");

      const s1 = insertStudent("S1", "s1@example.com");
      const s2 = insertStudent("S2", "s2@example.com");

      // s1 attempts 3 times, s2 attempts once
      insertAttempt(s1.id, quiz.id, 0.4, false);
      insertAttempt(s1.id, quiz.id, 0.6, false);
      insertAttempt(s1.id, quiz.id, 0.9, true);
      insertAttempt(s2.id, quiz.id, 0.5, false);

      const rows = getQuizInsightsForCourse(base.course.id);

      expect(rows[0].attempted).toBe(2);
      expect(rows[0].passed).toBe(1);
    });

    it("counts passed as distinct users who passed at least once (best-attempt basis)", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lesson = insertLesson(mod.id, "L", 1);
      const quiz = insertQuiz(lesson.id, "Q");

      const s1 = insertStudent("S1", "s1@example.com");
      const s2 = insertStudent("S2", "s2@example.com");
      const s3 = insertStudent("S3", "s3@example.com");

      // s1: failed then passed — should count as passed
      insertAttempt(s1.id, quiz.id, 0.3, false);
      insertAttempt(s1.id, quiz.id, 0.9, true);
      // s2: only failures
      insertAttempt(s2.id, quiz.id, 0.4, false);
      // s3: only a pass
      insertAttempt(s3.id, quiz.id, 0.8, true);

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows[0].attempted).toBe(3);
      expect(rows[0].passed).toBe(2);
    });

    it("returns rows in lesson order (module position, then lesson position)", () => {
      const m1 = insertModule(base.course.id, "Module 1", 1);
      const m2 = insertModule(base.course.id, "Module 2", 2);
      const l1a = insertLesson(m1.id, "L1a", 2);
      const l1b = insertLesson(m1.id, "L1b", 1);
      const l2a = insertLesson(m2.id, "L2a", 1);

      const qA = insertQuiz(l1a.id, "Quiz L1a");
      const qB = insertQuiz(l1b.id, "Quiz L1b");
      const qC = insertQuiz(l2a.id, "Quiz L2a");

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows.map((r) => r.quizId)).toEqual([qB.id, qA.id, qC.id]);
    });

    it("omits lessons that do not have a quiz", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lessonWithQuiz = insertLesson(mod.id, "Has Quiz", 1);
      insertLesson(mod.id, "No Quiz", 2);
      const quiz = insertQuiz(lessonWithQuiz.id, "Q");

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].quizId).toBe(quiz.id);
    });

    it("returns zero attempted/passed when nobody has attempted yet", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lesson = insertLesson(mod.id, "L", 1);
      insertQuiz(lesson.id, "Q");

      // No attempts inserted (simulates enrolled=0 or attempted=0 cases).
      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows[0].attempted).toBe(0);
      expect(rows[0].passed).toBe(0);
    });

    it("returns full passed count when every attempting user passed", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lesson = insertLesson(mod.id, "L", 1);
      const quiz = insertQuiz(lesson.id, "Q");

      const s1 = insertStudent("S1", "s1@example.com");
      const s2 = insertStudent("S2", "s2@example.com");

      insertAttempt(s1.id, quiz.id, 0.9, true);
      insertAttempt(s2.id, quiz.id, 0.8, true);

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows[0].attempted).toBe(2);
      expect(rows[0].passed).toBe(2);
    });

    it("returns zero passed when nobody passed", () => {
      const mod = insertModule(base.course.id, "M", 1);
      const lesson = insertLesson(mod.id, "L", 1);
      const quiz = insertQuiz(lesson.id, "Q");

      const s1 = insertStudent("S1", "s1@example.com");
      const s2 = insertStudent("S2", "s2@example.com");

      insertAttempt(s1.id, quiz.id, 0.2, false);
      insertAttempt(s2.id, quiz.id, 0.4, false);

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows[0].attempted).toBe(2);
      expect(rows[0].passed).toBe(0);
    });

    it("does not include quizzes from other courses", () => {
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

      const thisMod = insertModule(base.course.id, "This", 1);
      const thisLesson = insertLesson(thisMod.id, "L", 1);
      const thisQuiz = insertQuiz(thisLesson.id, "This Quiz");

      const otherMod = insertModule(otherCourse.id, "Other", 1);
      const otherLesson = insertLesson(otherMod.id, "L", 1);
      insertQuiz(otherLesson.id, "Other Quiz");

      const rows = getQuizInsightsForCourse(base.course.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].quizId).toBe(thisQuiz.id);
    });
  });
});
