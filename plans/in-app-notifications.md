# Plan: In-App Notifications for Instructors (Enrollment Events)

> Source PRD: `prd/in-app-notifications.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**:
  - `POST /api/notifications/mark-read` (body: `{ notificationId }`)
  - `POST /api/notifications/mark-all-read` (acts on current user)
  - Registered in `app/routes.ts`; handlers live in `app/server/api/`.
- **Schema**: new `notifications` table
  - `id` (pk, auto-increment)
  - `recipientUserId` (fk → users)
  - `type` (text enum, starts with `"enrollment"`, designed to extend)
  - `title` (text)
  - `message` (text)
  - `linkUrl` (text)
  - `isRead` (boolean, default false)
  - `createdAt` (auto-timestamp)
- **Key models / enums**:
  - `Notification` row type exported from schema
  - `NotificationType` enum starting with `"enrollment"`
- **Service layer**: new `app/server/services/notificationService.ts`. Per `CLAUDE.md`, functions with multiple same-typed parameters use object params (not positional). Imports `db` from `~/server/db`.
- **Data flow**: `layout.app.tsx` loader fetches unread count and recent notifications when the current user is an instructor; passes them to `Sidebar`. Mark-as-read actions use `useFetcher` so there's no full page reload.
- **Role gating**: bell icon only renders for instructors; student and admin UIs are untouched.
- **Out of scope (carried from PRD)**: email/SMS/push, real-time delivery, preferences, per-student notifications, dedicated `/notifications` page, deletion, digests.

---

## Phase 1: Tracer bullet — badge shows up on enrollment

**User stories**: 1 (bell + badge), 3 (receive notification on enrollment), 9 (badge updates on navigation), 11 (students don't see), 12 (admins don't see)

### What to build

A minimal end-to-end slice that proves the whole stack works. After a student enrolls in a course, the instructor sees a red unread-count badge on a bell icon in the sidebar on their next page load. No dropdown, no interactions yet — clicking the bell does nothing.

Covers the schema, a subset of the service layer (`createNotification`, `getUnreadCount`), the enrollment integration point, and the layout-loader → sidebar wiring for instructor-only rendering.

### Acceptance criteria

- [ ] `notifications` table and `NotificationType` enum exist; migration applied.
- [ ] `notificationService.createNotification` and `getUnreadCount` are implemented and unit-tested.
- [ ] `enrollmentService.enrollUser()` creates a notification for the course's instructor after a successful enrollment, with the correct `type`, `title`, `message`, and `linkUrl`.
- [ ] Integration test: enrolling a student produces a notification owned by the instructor.
- [ ] The `layout.app.tsx` loader fetches the unread count for instructors (not for students or admins).
- [ ] The sidebar shows a bell icon with a red unread badge for instructors; badge is hidden when count is 0; bell is not rendered for students or admins.
- [ ] `pnpm typecheck` and `pnpm test` pass.

---

## Phase 2: Dropdown with recent notifications

**User stories**: 2 (click bell → dropdown), 4 (notification message format), 6 (unread visually distinct), 10 (empty state)

### What to build

Clicking the bell opens a dropdown showing the 5 most recent notifications for the current instructor. Each row shows the title, message, and a "time ago" marker, with unread rows visually distinct from read rows. If the instructor has no notifications, the dropdown shows a "No notifications" empty state. Still read-only — no mark-as-read or navigation behavior yet.

### Acceptance criteria

- [ ] `notificationService.getNotifications({ userId, limit, offset })` is implemented and tested (ordering by most recent first, respects limit/offset, user-scoped).
- [ ] Layout loader fetches the 5 most recent notifications for instructors in addition to the unread count.
- [ ] Bell icon opens a dropdown positioned next to the sidebar.
- [ ] Dropdown renders up to 5 notifications with title, message, and relative time.
- [ ] Unread notifications are visually distinct from read notifications.
- [ ] Empty state renders a "No notifications" message when the list is empty.
- [ ] `pnpm typecheck` and `pnpm test` pass.

---

## Phase 3: Mark-as-read and click-to-navigate

**User stories**: 5 (navigate to student list), 7 (click marks read), 8 (mark all as read)

### What to build

Clicking a notification marks it as read and navigates to its `linkUrl` (the course's student list). A "Mark all as read" button at the bottom of the dropdown marks every notification read for the current user. Both actions use `useFetcher` so the sidebar and badge re-render without a full page reload on the next navigation.

### Acceptance criteria

- [ ] `notificationService.markAsRead({ notificationId })` and `markAllAsRead({ userId })` are implemented and tested.
- [ ] `POST /api/notifications/mark-read` and `POST /api/notifications/mark-all-read` routes exist and are wired into `app/routes.ts`.
- [ ] Clicking a notification in the dropdown marks it read via the mark-read route and navigates to its `linkUrl`.
- [ ] A "Mark all as read" button in the dropdown calls the mark-all-read route.
- [ ] The unread badge count reflects the updated state after either action.
- [ ] `pnpm typecheck` and `pnpm test` pass.
