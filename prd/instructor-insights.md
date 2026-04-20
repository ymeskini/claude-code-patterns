# Instructor Course Insights

## Problem Statement

As an instructor on Cadence, I can create and manage my courses, see who is enrolled, and look at individual students' progress and quiz scores. What I cannot do today is understand how my course is performing as a whole. I have no view that answers questions like "of the students who reached this quiz, how many completed it?" or "which quizzes are students struggling with?". Without aggregated signals, I cannot tell whether a lesson is too hard, a quiz is unclear, or learners are dropping off. I am forced to reason student-by-student from the roster, which does not scale beyond a handful of learners.

I want a dedicated place in my course workspace where I can see aggregated performance of my course, starting with quiz completion rate, and where more metrics can be added over time without me having to learn a new surface every time.

## Solution

Add an **Insights** tab to the existing instructor course editor (`/instructor/:courseId`) alongside Content, Settings, Sales Copy, and Students. The tab opens on a scrollable, sectioned page designed to accumulate metrics over time. The first section shipped is **Quiz Completion**: a course-level summary card followed by a per-quiz breakdown showing, for each quiz in the course, how many enrolled students have attempted it, how many passed, and the resulting completion and pass rates.

The view is read-only and scoped to a single course. The same tab surface will host future insights (engagement, ratings, revenue, drop-off points) as additional sections, so instructors do not need to hunt across new pages as the feature set grows.

## User Stories

1. As an instructor, I want a dedicated Insights tab inside my course editor, so that I have a single place to look when I want to understand how my course is performing.
2. As an instructor, I want the Insights tab to appear alongside Content, Settings, Sales Copy, and Students, so that it fits into my existing course-management flow without me learning a new page.
3. As an instructor, I want to see a course-level quiz completion summary at the top of the Insights tab, so that I can get a one-glance sense of how my learners are engaging with quizzes.
4. As an instructor, I want to see, for each quiz in my course, how many enrolled students have attempted it, so that I know which quizzes are actually being taken.
5. As an instructor, I want to see, for each quiz, the completion rate expressed as a percentage, so that I can compare quizzes against each other within my course.
6. As an instructor, I want to see, for each quiz, the pass rate among students who attempted it, so that I can tell the difference between "few students tried" and "many students tried and failed".
7. As an instructor, I want each quiz row to identify the lesson and module it belongs to, so that I can map a low rate back to a specific place in my curriculum.
8. As an instructor, I want the per-quiz table sorted in lesson order by default, so that the view mirrors the shape of my course.
9. As an instructor, I want to see a clear empty state when my course has no quizzes yet, so that I understand the view is working but there is nothing to report.
10. As an instructor, I want to see a clear empty state when my course has quizzes but no enrollments yet, so that I know the denominator is zero and not a bug.
11. As an instructor, I want completion rate to be computed against the full enrolled population (not just students who reached the quiz's lesson), so that I can see the full funnel loss.
12. As an instructor, I want to see the raw counts (attempted, passed, total enrolled) alongside each percentage, so that small cohorts do not mislead me with a "100%" that means "1 out of 1".
13. As an instructor, I want the Insights tab to only show me data for courses I own, so that other instructors' performance stays private.
14. As an admin, I want to see the Insights tab on any course I open in the editor, so that I can review performance for support and moderation purposes the same way I already review the rest of the course.
15. As a student, I do not want the Insights tab to be reachable from my side of the product, so that aggregate performance data is not exposed to learners.
16. As an instructor, I want the Insights tab to be structured so that future metrics appear as new sections on the same page, so that I can keep using the same surface as the product grows.
17. As an instructor, I want the Insights tab to load with the rest of the course editor's data flow (server-side loader, same auth checks), so that it behaves consistently with the other tabs I already use.
18. As an instructor, I want the page to render a sensible state when a quiz exists but has never been attempted, so that I can spot unused quizzes rather than seeing them hidden.
19. As an instructor, I want percentages to be rounded to whole numbers, so that the page stays readable and does not imply false precision.
20. As an instructor, I want the Insights tab to not hit the database more expensively than the existing Students tab, so that opening my course editor stays fast as my roster grows.

## Implementation Decisions

### Placement

- A new tab **Insights** is added to the existing `Tabs` in `/instructor/:courseId`. No new top-level route is introduced. Future metrics are added as additional sections on this tab, not as new pages.
- The tab is only rendered and its data only loaded for users who already pass the existing instructor/admin ownership checks on that route.

### Metric definitions (v1)

- **Enrolled count**: distinct students enrolled in the course, reusing the counting the course editor already does.
- **Attempted (per quiz)**: distinct users with at least one row in `quizAttempts` for that quiz.
- **Passed (per quiz)**: distinct users with at least one row in `quizAttempts` for that quiz where `passed = true` (best attempt basis).
- **Completion rate (per quiz)**: `attempted / enrolled`, expressed as a percentage, rounded to the nearest integer; `0%` when `enrolled` is 0.
- **Pass rate (per quiz)**: `passed / attempted`, expressed as a percentage, rounded to the nearest integer; shown as `—` when `attempted` is 0.
- **Course-level completion rate**: average of per-quiz completion rates across all quizzes in the course; shown as `—` when the course has no quizzes.

These definitions are chosen deliberately: completion is measured against all enrolled students (funnel view), while pass rate is conditional on attempting (quality view). Raw counts are always displayed next to rates so small denominators are obvious.

### Modules modified / added

- **`quizService.ts`**: add aggregate read functions for insights. New service-level functions (each documented via its signature, not by file path):
  - Given a quiz, return the distinct number of users who have attempted it.
  - Given a quiz, return the distinct number of users who have at least one passing attempt.
  - Given a course, return the quiz-insight rows (quizId, lessonId, lessonTitle, moduleId, moduleTitle, quizTitle, attempted, passed) in lesson order. This aggregate function exists so the loader does not issue N+1 queries across modules/lessons/attempts.
- **`enrollmentService.ts`**: the existing enrollment-count-for-course function is reused as-is. No new function needed.
- **Course editor route** (`/instructor/:courseId`): the loader additionally calls the new aggregate and returns an `insights` payload shaped as `{ enrolledCount, quizzes: QuizInsightRow[] }`. The component renders a new `<TabsContent value="insights">` section.
- **No new database migration**: all required data lives in `quizAttempts`, `quizzes`, `lessons`, `modules`, and `enrollments`.

### Service interfaces (project convention)

Per the project's CLAUDE.md, any new service function taking more than one same-typed parameter uses an object parameter. Aggregate read functions added here either take a single id (`courseId` or `quizId`) or are callers of those, so no object-parameter refactor is forced, but any new helper that does take multiple same-typed params (e.g. `{ courseId, userId }`) follows the convention.

### Testing

Per CLAUDE.md, service files ending in `-service.ts` (or `Service.ts`, matching the existing convention in this repo) are accompanied by `.test.ts` files. The new aggregate functions are added to `quizService.ts`; a `quizService.test.ts` is added (this file does not currently exist) covering:
  - attempted/passed counts with zero, one, and multiple attempts per user
  - pass rate when nobody passes, when everyone passes, and mixed
  - aggregate returns rows in lesson order and omits lessons without quizzes
  - enrolled=0 and attempted=0 edge cases

### Authorization

- The Insights tab reuses the existing route-level checks in the course editor loader: authenticated user, user is Instructor or Admin, and (unless Admin) the course's `instructorId` matches the current user. No additional auth surface is introduced.
- There is no new API endpoint; data flows through the existing loader.

### UI / layout

- The tab uses the shared `Tabs` primitive already in use on the page, keeping visual consistency.
- Top of the tab: a summary card showing total enrolled, total quizzes in course, course-level completion rate.
- Below: a table with columns — Module, Lesson, Quiz, Attempted (n / enrolled), Completion %, Passed (n / attempted), Pass %.
- Empty states: "No quizzes in this course yet" and "No students enrolled yet" are surfaced explicitly rather than rendering a zero-filled table.
- No charts in v1. The section is structured so charts can be added later without reshuffling the layout.

## Out of Scope

- Aggregating insights across all of an instructor's courses (cross-course dashboard). The tab is per-course by design in v1.
- Time-series / trend charts (completion rate over time, weekly cohorts).
- Per-student drill-downs from the insights view. The existing Students tab already handles individual performance; Insights stays aggregate.
- Per-question difficulty analysis (which questions students get wrong most often).
- Video watch-time, lesson engagement, drop-off funnel, ratings summaries, revenue — these are future sections planned for the same tab but not built now.
- Exporting insights to CSV / PDF.
- Real-time updates or caching layers. The loader computes on request; if performance becomes an issue at scale, a caching or materialized-view strategy can be introduced later.
- Notifications or alerts when a metric crosses a threshold.
- Student-facing visibility of aggregate metrics.

## Further Notes

- The project already surfaces per-student quiz scores in the Students tab. Insights deliberately does not duplicate that — it rolls up the same underlying `quizAttempts` data to a course-wide view.
- The "new view that can grow" requirement is satisfied by placing each metric as a section on a single scrollable tab. Adding a new metric later is additive (one more section, one more loader call), not architectural.
- Completion-rate denominators use total enrollment, not "students who reached the quiz's lesson". This is intentional for v1 because it answers the more urgent instructor question ("how much of my paying audience is actually finishing assessments?"). A future section can add a lesson-reach-adjusted rate if instructors want to separate "didn't engage" from "engaged but didn't complete".
- Percentages are integers in v1. If instructors ask for one decimal place later, that is a trivial change isolated to the formatter.
