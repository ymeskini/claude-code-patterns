# Instructor Insights — Implementation Plan

Source PRD: [prd/instructor-insights.md](../prd/instructor-insights.md)

This plan breaks the PRD into phases that can land as independent PRs. Each phase is shippable on its own: phases 1–2 deliver a working feature; phases 3–4 harden it. No phase is blocked waiting on UX iteration of a later phase.

---

## Phase 0 — Groundwork: backfill quizService tests

**Goal:** satisfy the repo convention (CLAUDE.md: every `*Service.ts` has a `*Service.test.ts`) before extending `quizService.ts` with new functions. Currently `app/server/services/quizService.ts` has no accompanying test file.

**Scope:**
- Add `app/server/services/quizService.test.ts` with coverage for the existing functions we will build on: `getQuizByLessonId`, `getAttemptsByUser`, `getBestAttempt`, `recordAttempt`. Keep the suite small — we are establishing a test fixture and a working import, not rewriting history.
- Follow the style of `enrollmentService.test.ts` / `courseService.test.ts` (same DB setup pattern).

**Exit criteria:**
- `pnpm test quizService` passes.
- No production code changed.

**Why first:** Phase 1 adds three new aggregate functions to `quizService.ts`. Writing those tests in a file that already exists is much cleaner than creating the test file *and* the new behavior in the same PR.

---

## Phase 1 — Aggregate read functions in services

**Goal:** land the data-layer primitives the Insights tab will consume, with tests, independent of any UI.

**Scope (in `quizService.ts`):**
1. `getAttemptedUserCountForQuiz(quizId: number): number` — `COUNT(DISTINCT userId)` on `quizAttempts` for the quiz.
2. `getPassedUserCountForQuiz(quizId: number): number` — `COUNT(DISTINCT userId)` on `quizAttempts` where `passed = true`.
3. `getCourseQuizInsights(courseId: number): QuizInsightRow[]` — single-pass join across `modules → lessons → quizzes` left-joined with aggregated `quizAttempts`, returning rows shaped as:
   ```ts
   { quizId, quizTitle, lessonId, lessonTitle, moduleId, moduleTitle, attempted, passed }
   ```
   Ordered by `modules.position, lessons.position`. This is the N+1-avoidance function called out in the PRD (§ Modules modified).

**Convention notes:**
- All three take a single id, so no object-parameter refactor is forced (CLAUDE.md rule doesn't trigger).
- Export `QuizInsightRow` as a type from `quizService.ts` so the loader and component can share it.

**Tests (add to `quizService.test.ts`):**
- `getAttemptedUserCountForQuiz`: 0 attempts, 1 user with 3 attempts (returns 1), 3 users with 1 attempt each (returns 3).
- `getPassedUserCountForQuiz`: nobody passed, everyone passed, mixed (only passing users count once).
- `getCourseQuizInsights`:
  - course with 2 modules, each with lessons, mixed quiz presence — rows returned in `module.position, lesson.position` order.
  - lessons without quizzes are omitted.
  - `attempted=0, passed=0` for a quiz nobody attempted (left join returns the row with zeros, not null).

**Exit criteria:**
- New functions exported, typed, tested. No route changes yet.
- Vitest green.

---

## Phase 2 — Loader + Insights tab (v1 UI)

**Goal:** expose the data in the existing course editor, shipping the feature end-to-end at a minimum-viable bar.

**Scope (in `app/routes/instructor/$courseId.tsx`):**
1. Loader: after the existing auth/ownership checks, call `getCourseQuizInsights(courseId)` and return an additional `insights` payload:
   ```ts
   insights: {
     enrolledCount: number;           // reuse existing enrollmentCount
     totalQuizzes: number;            // insights.length
     courseCompletionRate: number | null;  // avg of per-quiz completion; null if no quizzes
     quizzes: QuizInsightRow[];
   }
   ```
   Reuse the already-computed `enrollmentCount` — do not re-query.
2. Tab: add a fifth `<TabsTrigger value="insights">` (icon: `BarChart3` from lucide) between "Sales Copy" and "Students" *or* after "Students" — pick whichever keeps the existing tab order stable (after "Students" is safer).
3. `<TabsContent value="insights">`:
   - Summary card: total enrolled, total quizzes, course-level completion rate (integer %, `—` when no quizzes).
   - Table: Module · Lesson · Quiz · Attempted (`n / enrolled`) · Completion % · Passed (`n / attempted`) · Pass %.
   - Empty states:
     - No quizzes → "No quizzes in this course yet."
     - Quizzes present but `enrolledCount === 0` → "No students enrolled yet."
     - Quiz never attempted → row renders with `0 / n`, `0%`, and `—` for pass rate (do not hide the row — PRD story #18).
4. Formatting helper (local to the file): `formatRate(numerator, denominator): string` returning integer % or `—` for zero denominators. Do not create a new module for a single formatter.

**Auth:** no new code — the insights branch is gated by the loader's existing instructor/admin/ownership check (PRD § Authorization).

**Exit criteria:**
- Tab renders for instructor-owned courses and for admins on any course.
- Student account cannot reach it (no route, no tab in their UI — students never hit this loader).
- Manual test via the DevUI panel: instructor A cannot see instructor B's insights.
- No regressions on existing tabs (Content, Settings, Sales Copy, Students).

---

## Phase 3 — Polish and edge cases

**Goal:** clean up the rough edges that are easy to defer in Phase 2 but worth fixing before calling the v1 done.

**Scope:**
- Sort stability: confirm the SQL `ORDER BY` is deterministic (tiebreak on `lessons.id` if `position` ties exist in seed data).
- Rounding: centralize percentage rounding in `formatRate` (PRD story #19: integers in v1).
- Copy: final empty-state strings, card titles, column headers.
- Accessibility: table has a caption or aria-label; numeric cells are right-aligned; empty-state cards use the same `Card` primitive as the Students tab for visual consistency.
- Performance sanity check (PRD story #20): verify with `EXPLAIN QUERY PLAN` or a quick log that `getCourseQuizInsights` issues one aggregated query, not one per quiz. If it's inadvertently N+1, rewrite before shipping.

**Exit criteria:**
- Manual pass on a course with 0, 1, and many quizzes, and 0 vs many enrollments.
- Opening the editor for a course with many quizzes is visibly no slower than before (Students tab is the benchmark).

---

## Phase 4 — Future-proofing the surface (non-blocking)

**Goal:** make sure the "add more sections later" intent from the PRD is actually easy when the next metric arrives. This phase is a short refactor, not new features.

**Scope:**
- Split the Insights tab content into a section-per-metric structure inside the `TabsContent` — e.g. a `<InsightsSection title="Quiz Completion">…</InsightsSection>` wrapper component local to the route file. This is the seam future metrics will slot into.
- Document nothing new — the seam is self-explanatory once it exists.

**Exit criteria:**
- Adding a hypothetical second section (e.g. "Video Watch Time") would be a copy-paste of the wrapper + one new loader call, with no layout reshuffling.

**Skip condition:** if Phase 2's implementation already naturally factored this way, Phase 4 is a no-op — don't invent work.

---

## Explicitly deferred (from PRD "Out of Scope")

Cross-course dashboard, time-series charts, per-student drill-downs, per-question difficulty, video/rating/revenue sections, CSV export, caching, alerts, student-facing visibility. None of these are in any phase above.

## Risk register

- **Aggregate query correctness** — the left join + `COUNT(DISTINCT)` is the highest-risk piece. Phase 1 tests are the mitigation. Write those tests *before* wiring the loader.
- **Tab order churn** — inserting "Insights" between existing tabs risks confusing users who have muscle memory. Default to appending after "Students."
- **Denominator semantics** — PRD chose "all enrolled" over "reached the lesson." Keep this documented in the code near the computation so a future contributor doesn't "fix" it.
