---
phase: 04-today-task-workflow
plan: "02"
subsystem: mobile-ui
tags: [today-screen, react-native, mobile, tasks, accessibility-copy, vitest]
requires:
  - phase: 04-today-task-workflow
    provides: 04-01 local Today task contracts and repository operations.
provides:
  - Hoje-first mobile entry surface.
  - Sales-area safety header, refresh behavior, empty state, and task sections.
  - Lot-level task rows with action, product, lot, location, due/severity, owner, and reason.
affects: [phase-04-task-resolution, phase-04-a11y-smoke-hardening]
tech-stack:
  added: []
  patterns: [hoje-first-navigation, sectioned-mobile-task-list, resilient-refresh-ui]
key-files:
  created:
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/capture/today-task-fixtures.test.ts
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/App.test.tsx
    - eslint.config.mjs
key-decisions:
  - "Hoje is now the first mobile screen after repository initialization."
  - "Task rows open the related lot detail until Plan 04-03 replaces that placeholder with the resolution panel."
  - "Refresh failures keep the previous task list visible and show operational recovery copy."
patterns-established:
  - "Visible task rows are grouped by operational section order instead of relying on incoming array order."
  - "Future radar attention renders as quiet text, not as an actionable task row."
requirements-completed: [PSH-03, UI-01, UI-02, UI-03]
duration: 10 min
completed: 2026-06-19
---

# Phase 04 Plan 02: Hoje Entry Surface Summary

**Hoje-first React Native task surface with safety verdict, resilient refresh, sectioned rows, and radar future attention**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-19T23:23:30-03:00
- **Completed:** 2026-06-19T23:33:33-03:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `TodayScreen` as the first operational mobile surface after repository initialization.
- Preserved paths to product discovery, lot registration, recent lots, lot detail, and observation flows.
- Added the safety header states, safe empty state, manual refresh, and refresh-failure recovery copy.
- Rendered active tasks by section order: Retirar agora, Conferir na area de venda, Pedir rebaixa, Acompanhar.
- Kept radar as quiet `Atencao futura`, separate from active shift tasks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make Hoje the first operational screen with a stable safety header** - `d35426d` (feat)
2. **Task 2: Render operational task sections, rows, future attention, and task opening** - `0137ed1` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/mobile/src/capture/TodayScreen.tsx` - Hoje screen, safety header, refresh handling, section rendering, task rows, and future attention.
- `apps/mobile/src/capture/today-copy.ts` - Central Hoje labels, section labels, due/severity/reason helpers.
- `apps/mobile/src/capture/CaptureApp.tsx` - Hoje-first routing while keeping capture, recent lots, detail, observation, and barcode paths.
- `apps/mobile/src/capture/today-screen.test.tsx` - Header, empty state, refresh failure, section order, row anatomy, duplicate lot visibility, radar, and open-task callback tests.
- `apps/mobile/src/capture/today-task-fixtures.test.ts` - Fictitious task fixture guard for repeated-product, per-lot visibility.
- `apps/mobile/src/App.test.tsx` - Smoke now asserts Hoje-first entry surface.

## Decisions Made

- Active task rows navigate to lot detail as the temporary Phase 4 resolution placeholder; no weak resolve button was introduced before Plan 04-03.
- The UI groups by the approved section order inside `TodayScreen`, so incoming task order cannot hide a critical operational hierarchy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Normalized test renderer text assertions**
- **Found during:** Task 2
- **Issue:** React Test Renderer split interpolated text into multiple children, so combined row strings were not present in JSON.
- **Fix:** Built task row and future-attention labels as single strings inside the component.
- **Files modified:** `apps/mobile/src/capture/TodayScreen.tsx`, `apps/mobile/src/capture/today-screen.test.tsx`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile test -- today-screen`
- **Committed in:** `0137ed1`

**2. [Rule 3 - Blocking] Added explicit test microtask awaits**
- **Found during:** Task 2
- **Issue:** ESLint rejected async `act` callbacks with no `await`.
- **Fix:** Added explicit microtask waits in App and Today screen tests.
- **Files modified:** `apps/mobile/src/App.test.tsx`, `apps/mobile/src/capture/today-screen.test.tsx`
- **Verification:** `pnpm.cmd lint`
- **Committed in:** `0137ed1`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes improved test fidelity without changing scope.

## Issues Encountered

None remaining.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed, 13 files / 27 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- App` - passed, 13 files / 27 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-fixtures` - passed, 13 files / 27 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - passed, including dependency boundary check for 62 source files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 04-03. The screen can now route active tasks into a real resolution panel while preserving the safety-first entry and lot-detail fallback.

---
*Phase: 04-today-task-workflow*
*Completed: 2026-06-19*
