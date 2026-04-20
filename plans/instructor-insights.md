# Plan: Instructor Course Insights

> Source PRD: `prd/instructor-insights.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Route**: no new route. The feature lives as a new tab on the existing `/instructor/:courseId` course editor.
- **Tab surface**: reuses the shared `Tabs` primitive already in use on the page (`TabsList` + `TabsTrigger` + `TabsContent value="insights"`), so the Insights tab is siblings with Content, Settings, Sales Copy, and Students.
- **Data flow**: no new API endpoint. Data is loaded through the existing course-editor loader and returned as an `insights` payload shaped as `{ enrolledCount, quizzes: QuizInsightRow[] }`.
- **Authorization**: reuses existing route-level checks — authenticated user, role is Instructor or Admin, and (unless Admin) the course's `instructorId` matches the current user. No new auth surface.
- **Schema**: no migrations. All required data lives in existing tables: `quizAttempts`, `quizzes`, `lessons`, `modules`, `enrollments`.
- **Key data model**: `QuizInsightRow` — `{ quizId, quizTitle, lessonId, lessonTitle, moduleId, moduleTitle, attempted, passed }`. Percentages are derived in the view, not stored.
- **Metric definitions** (v1):
  - *Attempted per quiz*: distinct users with ≥1 row in `quizAttempts` for that quiz.
  - *Passed per quiz*: distinct users with ≥1 row where `passed = true` (best-attempt basis).
  - *Completion rate per quiz*: `attempted / enrolled`, rounded to nearest integer; `0%` when `enrolled` is 0.
  - *Pass rate per quiz*: `passed / attempted`, rounded to nearest integer; `—` when `attempted` is 0.
  - *Course-level completion rate*: arithmetic mean of per-quiz completion rates; `—` when course has no quizzes.
- **Query shape**: the per-course aggregate is a single query joining quizzes → lessons → modules with `quizAttempts` subqueries — no N+1 across modules/lessons/attempts. Must not be more expensive than the existing Students tab.
- **Tests**: new service functions live in `quizService.ts` and follow the project convention of an accompanying `quizService.test.ts`. Service functions with more than one same-typed parameter use object parameters per CLAUDE.md.
- **Extensibility**: the tab is a scrollable sectioned page. Future metrics (engagement, ratings, revenue, drop-off) are added as new sections on this same tab, not as new routes.

---

## Phase 1: Insights tab with course-level summary

**User stories**: 1, 2, 3, 9, 10, 13, 14, 15, 16, 17, 20

### What to build

Add the Insights tab end-to-end: the tab appears in the existing course-editor `TabsList`, the loader is extended to return an `insights` payload, and the tab's content area renders a course-level summary card.

A new aggregate read function is added to `quizService.ts` that, given a `courseId`, returns the quiz-insight rows (`quizId`, `quizTitle`, `lessonId`, `lessonTitle`, `moduleId`, `moduleTitle`, `attempted`, `passed`) in lesson order via a single query. The loader combines this with the existing enrollment count (reused from `enrollmentService.ts`) into `{ enrolledCount, quizzes: QuizInsightRow[] }`.

The summary card shows total enrolled, total quizzes in the course, and the course-level completion rate (mean of per-quiz completion rates). Empty states for "No students enrolled yet" and "No quizzes in this course yet" are surfaced explicitly instead of a zero-filled layout. The tab is only rendered for users who pass the route's existing ownership checks; students cannot reach it.

Tests are added for the new aggregate function covering: zero / one / many attempts per user, nobody passes vs. everyone passes vs. mixed, lesson-order output, lessons without quizzes omitted, and `enrolled = 0` / `attempted = 0` edge cases.

### Acceptance criteria

- [ ] An "Insights" tab button appears in the course-editor `TabsList` between the existing tabs, consistent with the page's visual language.
- [ ] Clicking the tab shows the Insights content area; no navigation or URL change.
- [ ] The course-editor loader returns an `insights` payload shaped as `{ enrolledCount, quizzes: QuizInsightRow[] }`.
- [ ] A new aggregate function in `quizService.ts` returns per-quiz insight rows for a course in lesson order using a single query (no N+1).
- [ ] `quizService.test.ts` exists and covers the listed edge cases; `pnpm test` passes.
- [ ] Summary card shows: total enrolled, total quizzes, course-level completion rate (integer %, or `—` when course has no quizzes).
- [ ] When the course has no quizzes, the empty state "No quizzes in this course yet" is shown instead of a zero-filled summary.
- [ ] When the course has quizzes but zero enrollments, the empty state "No students enrolled yet" is shown and completion rate is not rendered as a misleading `0%` alone.
- [ ] The tab and its loader data are only accessible to the course's owning instructor or an admin; all other roles receive the existing route-level rejection.
- [ ] Opening the course editor is not measurably slower than before the change on a course with a realistic roster size.

---

## Phase 2: Per-quiz breakdown table

**User stories**: 4, 5, 6, 7, 8, 11, 12, 18, 19

### What to build

Below the summary card, render a table of per-quiz rows consuming the Phase 1 payload. Each row identifies the module, lesson, and quiz it belongs to and shows the raw counts alongside every percentage, so a `100%` on a tiny cohort is never presented without its denominator.

Rows are sorted in lesson order (module position, then lesson position) so the view mirrors the curriculum. Quizzes that exist but have never been attempted are rendered (not hidden) so instructors can spot unused assessments. Pass rate renders as `—` for any row with `attempted = 0`. All percentages are rounded to whole integers.

No new loader or service work is required — Phase 1's payload is sufficient. This phase is pure presentation on top of data that already flows through the loader.

### Acceptance criteria

- [ ] A table appears below the summary card with columns: Module, Lesson, Quiz, Attempted (`n / enrolled`), Completion %, Passed (`n / attempted`), Pass %.
- [ ] Rows are ordered by module position, then lesson position within module.
- [ ] Every percentage is rendered as a whole integer (no decimals).
- [ ] Rows where `attempted = 0` render `—` in the Pass % column and still show the `0 / enrolled` attempted count.
- [ ] Quizzes with zero attempts are visible in the table (not filtered out).
- [ ] Raw counts are shown next to each percentage (both the completion and pass columns).
- [ ] The table uses the existing page's table/UI primitives; no new shared components are introduced.
- [ ] No additional loader calls or service functions are added in this phase.
