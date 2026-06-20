---
phase: 05-push-and-escalation
plan: "03"
subsystem: mobile-ui
tags: [hoje, push, escalation, react-native, accessibility]
requires:
  - phase: 05-push-and-escalation
    provides: Plan 05-02 mobile alert repository operations and push channel adapter.
provides:
  - Push permission education and channel notices below the Hoje safety verdict.
  - Per-task alert status, escalation acknowledgement, and leadership receipt feedback.
  - Safe push-open routing to current task or explicit Hoje fallback banners.
affects: [mobile-smoke, native-push, phase-05-verification]
tech-stack:
  added: []
  patterns:
    - Alert UI is subordinate to the existing Hoje safety/task flow.
    - Push responses are resolved through repository intent checks before navigation.
key-files:
  created:
    - apps/mobile/src/capture/push-alerts.test.tsx
  modified:
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/App.test.tsx
    - apps/mobile/src/capture/today-screen.test.tsx
key-decisions:
  - "Alert channel state appears below the sales-area safety verdict and never above it."
  - "Leadership acknowledgement is inline state feedback and never calls task resolution."
  - "Malformed or stale push payloads route back to Hoje instead of opening stale task details."
patterns-established:
  - "Use repository alert state as the UI source for per-task reminder/escalation copy."
  - "Use injected PushAlertChannel in CaptureApp tests to avoid native notification modules."
requirements-completed: [RSK-05, PSH-01, PSH-02, PSH-05]
duration: 20 min
completed: 2026-06-20
---

# Phase 05 Plan 03: Hoje Push Alert UX Summary

**Hoje now shows push channel confidence, task-level alert pressure, leadership receipt, and safe push-tap fallback without replacing physical task resolution**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-20T13:05:30-03:00
- **Completed:** 2026-06-20T13:25:30-03:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added the Phase 5 push permission copy and channel notices directly below the safety header.
- Added task alert status lines for active, next reminder, pending, failed, escalated, and acknowledged states.
- Added inline leadership acknowledgement with receipt copy while keeping the task visible and unresolved.
- Wired notification response routing in `CaptureApp` so current tasks open safely and stale/resolved/missing payloads return to Hoje with explicit banners.

## Task Commits

The UI work was committed as one cohesive implementation because all three planned tasks shared the same component/test surface:

1. **Tasks 1-3: Hoje push alert UX, escalation acknowledgement, and push-open fallback** - `854ee17` (feat)

**Plan metadata:** pending in this commit.

## Files Created/Modified

- `apps/mobile/src/capture/TodayScreen.tsx` - Permission card, channel notices, task alert status, acknowledgement panel, and fallback notices.
- `apps/mobile/src/capture/CaptureApp.tsx` - Injected push channel and notification-response routing through repository intent checks.
- `apps/mobile/src/capture/today-copy.ts` - Phase 5 operational copy for push, escalation, acknowledgement, and fallback states.
- `apps/mobile/src/capture/push-alerts.test.tsx` - Coverage for permission flow, channel states, retry pending, acknowledgement, current-task routing, stale/resolved/missing fallback, malformed payloads, and manual opening.
- `apps/mobile/src/App.test.tsx` - Native notification mocks and smoke expectation for the alert CTA.
- `apps/mobile/src/capture/today-screen.test.tsx` - Repository mock updated for alert operations.

## Decisions Made

- Kept the product register restrained: no notification center, dashboard, modal-first acknowledgement, or lock-screen resolution.
- Kept warning/critical treatment semantic: regular reminders use quiet metadata/warning treatment, while escalation uses critical emphasis.
- Used explicit fallback copy in Hoje for stale/resolved/missing notification payloads.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Combined tightly coupled UI tasks into one commit**
- **Found during:** Plan 05-03 implementation
- **Issue:** Permission notices, per-task alert status, acknowledgement, and push-open fallback all touched `TodayScreen`, `CaptureApp`, and `push-alerts.test.tsx`; partial commits would have left transient broken UI/tests.
- **Fix:** Implemented and verified the cohesive UI slice, then committed it atomically.
- **Files modified:** `TodayScreen.tsx`, `CaptureApp.tsx`, `today-copy.ts`, `push-alerts.test.tsx`, related tests.
- **Verification:** All Plan 05-03 focused tests and mobile typecheck passed.
- **Committed in:** `854ee17`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The delivered behavior matches all planned tasks; only commit granularity changed.

## Issues Encountered

- `exactOptionalPropertyTypes` required explicit `| undefined` on optional UI props that are passed through React as values.
- `push-alerts.test.tsx` needed native module mocks because importing `CaptureApp` loads screens that reference SQLite, camera, and datetimepicker modules.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- push-alerts` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test -- App` - passed.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## User Setup Required

None - no additional setup beyond `05-USER-SETUP.md`.

## Next Phase Readiness

The API/provider/cron seam can now dispatch into a mobile workflow that already has channel state, alert state, acknowledgement, and safe push-open behavior.

---
*Phase: 05-push-and-escalation*
*Completed: 2026-06-20*
