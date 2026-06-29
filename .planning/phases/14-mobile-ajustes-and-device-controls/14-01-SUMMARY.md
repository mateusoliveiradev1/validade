---
phase: 14-mobile-ajustes-and-device-controls
plan: "01"
subsystem: mobile-ui
tags: [react-native, auth-shell, route-stack, ajustes, testing]
requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: "Readiness surfaces and operational truth boundaries mirrored by mobile Ajustes"
provides:
  - "Authenticated mobile session bar with a single Ajustes entry"
  - "Ajustes route in the CaptureApp stack with back/return preservation"
  - "Initial calm device-readiness shell for account/store, push, sync, build, and privacy controls"
affects: [phase-14, mobile-ajustes, auth-gate, capture-route-stack]
tech-stack:
  added: []
  patterns:
    - "AuthGate owns session authority while CaptureApp owns authenticated operational navigation"
    - "Ajustes opens as a route-stack entry instead of replacing Hoje or task state"
key-files:
  created:
    - apps/mobile/src/capture/AjustesScreen.tsx
  modified:
    - apps/mobile/App.tsx
    - apps/mobile/src/auth/AuthGate.tsx
    - apps/mobile/src/auth/auth-flow.test.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/mobile-release-journeys.test.tsx
key-decisions:
  - "AuthGate now passes privacy/logout callbacks to authenticated children instead of rendering separate ready-shell quick actions."
  - "CaptureApp owns the visible session bar and pushes a settings route so Ajustes preserves operational route stack state."
patterns-established:
  - "Authenticated controls are passed as typed callbacks, keeping privacy/logout behavior in AuthGate."
  - "Route-level mobile tests prove Ajustes can open from Hoje and task resolution and return without losing context."
requirements-completed: ["SET-01"]
duration: 25min
completed: 2026-06-29
---

# Phase 14 Plan 01: Ajustes Route Foundation Summary

**Mobile Ajustes route foundation with authenticated session callbacks, a single settings entry, and route-preservation tests**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-29T03:28:12Z
- **Completed:** 2026-06-29T03:38:45Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Moved visible ready-shell controls out of `AuthGate` while preserving privacy and logout authority there.
- Added the `settings` route to `CaptureApp` with a session bar action labelled `Ajustes` and accessibility label `Abrir Ajustes do aparelho`.
- Created the initial `AjustesScreen` shell with account/store context and readiness cards.
- Added mobile journey tests proving Ajustes opens from Hoje and task resolution, then returns to the previous route.

## Task Commits

Each task was committed as part of one coupled route-foundation implementation:

1. **Task 1: Refactor authenticated shell callbacks for Ajustes** - `8ed2088` (feat)
2. **Task 2: Add Ajustes route and session-bar entry in CaptureApp** - `8ed2088` (feat)
3. **Task 3: Prove route preservation and Android back return** - `8ed2088` (feat)

**Plan metadata:** pending in this commit.

## Files Created/Modified

- `apps/mobile/src/capture/AjustesScreen.tsx` - Initial Ajustes shell and readiness summary.
- `apps/mobile/src/capture/CaptureApp.tsx` - Session bar, `settings` route, and route-stack integration.
- `apps/mobile/src/auth/AuthGate.tsx` - Typed ready-session callbacks for privacy and logout.
- `apps/mobile/App.tsx` - Passes active session and callbacks into `CaptureApp`.
- `apps/mobile/src/auth/auth-flow.test.tsx` - Callback-path auth fixture keeps privacy/logout covered.
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx` - Route-level Ajustes tests.

## Decisions Made

- Kept `AuthGate` as the owner of `PrivacyCenterScreen` and `authClient.logout()`, with typed callbacks passed to the authenticated child.
- Put the visible `Ajustes` action in `CaptureApp` so the action can push onto the existing route stack and return cleanly.

## Deviations from Plan

None - plan executed as written, with the three tasks committed together because the AuthGate callback change and CaptureApp route props are compile-time coupled.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion; SET-01 is covered by focused tests.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 35 files / 186 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## Next Phase Readiness

Ready for `14-02`: push and reminder controls can now move into the Ajustes route without adding more session-bar actions or resetting operational work.

---
*Phase: 14-mobile-ajustes-and-device-controls*
*Completed: 2026-06-29*
