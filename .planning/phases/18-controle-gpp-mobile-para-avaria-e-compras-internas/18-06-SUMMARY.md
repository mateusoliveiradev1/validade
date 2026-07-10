---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
plan: "06"
subsystem: mobile-gpp
tags: [react-native, gpp, offline-queue, conflict, uat]

requires:
  - phase: 18-05
    provides: GPP pending/conflict UI, local discard persistence, and UAT evidence
provides:
  - Route-level justified GPP conflict discard wired to the capture repository
  - Active-queue refresh after device-local discard
  - Routed regression covering persistence, removal, and absence of central mutation
affects: [phase-18-verification, phase-19-hoje-gpp-integration]

tech-stack:
  added: []
  patterns: [defensive-route-handler, local-conflict-discard, repository-refresh-after-mutation]

key-files:
  created: []
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/mobile-gpp-navigation.test.tsx
    - .planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-UAT.md

key-decisions:
  - "Conflict discard remains device-local and never calls the central GPP client."
  - "The route trims and defensively ignores empty justification before repository mutation."
  - "Build 170 remains installed and untouched; native proof of the new code waits for a deliberate later build."

patterns-established:
  - "Route-owned mutation: persist through CaptureRepository, then refresh route projections from repository truth."
  - "Discard auditability: retain discarded record with justification and timestamp while excluding it from the active queue."

requirements-completed: [GPP-08]

duration: 10 min
completed: 2026-07-10
---

# Phase 18 Plan 06: Justified GPP Conflict Discard Summary

**CaptureApp now completes the justified local-conflict discard path, persists its audit fields, refreshes the active queue, and never converts discard into central success.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-10T10:15:59Z
- **Completed:** 2026-07-10T10:26:23Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added a defensive route-level `onDiscardConflict` handler that trims justification, persists `discardedAt`, and refreshes GPP projections.
- Added an integration regression that seeds a central conflict, enters a reason, discards through the routed screen, and verifies the active conflict disappears while the discarded record remains auditable.
- Proved the discard path does not call either central GPP mutation method.
- Updated Test 5 in `18-UAT.md` with the fixed-path evidence and the explicit build 170 boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire justified conflict discard through the repository** — `0849a02` (`fix`)

## Files Created/Modified

- `apps/mobile/src/capture/CaptureApp.tsx` — persists justified conflict discard locally and refreshes the GPP lists.
- `apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` — proves route wiring, persistence, active-row removal, and absence of central mutation.
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-UAT.md` — records Test 5 resolution without claiming the installed build 170 contains the fix.

## Verification

- `pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-pending-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/gpp-offline-queue.test.ts` — passed, 3 files / 11 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` — passed.
- `pnpm.cmd exec prettier --check apps/mobile/src/capture/CaptureApp.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` — passed.
- Acceptance criteria — all passed: non-optional route handler, blank-reason defense, discarded-state persistence, removal from active queue/render, and no central GPP call.

## Decisions Made

- Kept discard device-local because it resolves a local retry/conflict record, not a central GPP business fact.
- Refreshed both pending and sent projections from repository truth after the mutation instead of manipulating the rendered array optimistically.
- Preserved the installed build 170. Starting the AVD was safe, but installing a new bundle solely for this retest would violate the deliberate-build boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Captured same-scope GPP route state needed by the routed regression**
- **Found during:** Task 1
- **Issue:** The previous UAT session had valid GPP list/sync route wiring in the working tree that was not yet part of the repository snapshot used by the new handler.
- **Fix:** Included only the GPP list/sync hunks required for a coherent routed discard path; existing visual session-header, timestamp-formatting, and styling hunks remained unstaged.
- **Files modified:** `apps/mobile/src/capture/CaptureApp.tsx`, `apps/mobile/src/capture/mobile-gpp-navigation.test.tsx`
- **Verification:** focused tests, mobile typecheck, staged diff review, and Prettier check passed.
- **Committed in:** `0849a02`

---

**Total deviations:** 1 auto-fixed blocking prerequisite.
**Impact on plan:** The commit remains within Phase 18 GPP pending/conflict behavior and leaves unrelated visual work untouched.

## Issues Encountered

- The Android AVD was initially stopped and was started successfully. Its installed package is build 170, so it was not overwritten with unapproved code. The exact routed behavior is covered by the new integration regression; installed post-170 proof remains a deliberate later release check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 18-06 is complete and ready for `$gsd-verify-work 18`.
- Phase 19 context exists, but its planning/execution must continue to respect the Phase 18 verification result and the required Phase 19 UI-spec gate.

## Self-Check: PASSED

- `18-06-SUMMARY.md` exists.
- Task commit `0849a02` exists.
- All task acceptance criteria and plan verification commands passed.
- UAT Test 5 is resolved with an explicit installed-build boundary.

---
*Phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas*
*Completed: 2026-07-10*
