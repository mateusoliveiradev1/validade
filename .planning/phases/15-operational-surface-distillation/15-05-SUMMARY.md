---
phase: 15-operational-surface-distillation
plan: "05"
subsystem: mobile-ui
tags: [react-native, shift-close, safe-close, device-readiness, build-readiness]

requires:
  - phase: 15-operational-surface-distillation
    provides: Blocker-only Today readiness and compact central refresh path
provides:
  - Strict shift-close summary before safe or unsafe decisions
  - Domain safe-close blockers for missing/stale central read, sync, build, authorization, and checklist
  - Public-safe mobile close summary for build and account/store/device authorization
affects: [shift-close, ajustes, mobile-release, contracts, domain]

tech-stack:
  added: []
  patterns:
    - `evaluateShiftClose` remains the source of safe-close eligibility
    - Build and authorization facts can block safe close but render only public labels

key-files:
  created: []
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/ShiftCloseScreen.tsx
    - apps/mobile/src/capture/shift-close.test.tsx
    - packages/domain/src/shift-close.ts
    - packages/domain/src/shift-close.test.ts
    - packages/contracts/src/shift-close.test.ts

key-decisions:
  - "Fechamento is stricter than Hoje: quiet healthy diagnostics do not weaken safe-close blockers."
  - "Missing central read fails closed instead of being treated as absent evidence."
  - "Build and authorization blockers use bounded public labels and never expose build URLs, tokens, raw IDs, secrets, or passwords."

patterns-established:
  - "Close summary rows show operational facts before the physical checklist and close actions."
  - "Safe close requires eligible domain evaluation plus prepared central validation availability."

requirements-completed: ["OPS-03", "OPS-04"]

duration: 10 min
completed: 2026-06-30
---

# Phase 15 Plan 05: Shift Close Distillation Summary

**Fechamento do turno now summarizes strict blockers before any safe-close decision and blocks safe close on central, sync, build, authorization, evidence, and checklist gaps.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-30T10:42:00Z
- **Completed:** 2026-06-30T10:52:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `Resumo antes do fechamento seguro` above the physical checklist and close actions.
- Extended `evaluateShiftClose` so missing central read fails closed and build/auth facts can block safe close.
- Passed mobile build and account/store/device authorization facts from `CaptureApp` into `ShiftCloseScreen`.
- Added public-safety assertions so close summary output does not expose private build URLs, tokens, raw device IDs, secrets, or passwords.

## Task Commits

1. **Task 1: Add safe-close summary before close actions** - `69abb85e` (feat)
2. **Task 2: Preserve strict domain blockers for stale central, sync, device, and build** - `021eac41` (feat)
3. **Task 3: Pass build/device facts into shift close and prove fallback behavior** - `00ff1779` (feat)

## Files Created/Modified

- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - Adds close summary rows, stricter safe action availability, build status, and authorization status.
- `apps/mobile/src/capture/CaptureApp.tsx` - Passes resolved build info and derived public authorization status to shift close.
- `apps/mobile/src/capture/shift-close.test.tsx` - Covers summary contents, incompatible build, invalid authorization, and sensitive-marker exclusion.
- `packages/domain/src/shift-close.ts` - Adds build/auth blocker codes and fails closed when central read is missing.
- `packages/domain/src/shift-close.test.ts` - Covers missing/stale central read, critical sync, build update, invalid authorization, and incomplete checklist blockers.
- `packages/contracts/src/shift-close.test.ts` - Covers the new public blocker codes through `ShiftCloseEvaluationSchema`.

## Decisions Made

- Build compatibility is required for safe close when provided by the mobile app; incompatible builds block even without an explicit update flag.
- Missing `buildInfo` or unknown authorization renders as `nao informado` rather than a green proof claim.
- The unsafe handoff form remains available under blockers and continues to avoid resolving tasks or silencing alerts.

## Deviations from Plan

### Auto-fixed Issues

**1. Missing central package could otherwise look locally eligible**
- **Found during:** Task 1 (Add safe-close summary before close actions)
- **Issue:** The previous evaluation could be locally eligible when no central state was passed.
- **Fix:** Safe action now also requires prepared central validation availability; Task 2 made missing central state fail closed in the domain.
- **Files modified:** `apps/mobile/src/capture/ShiftCloseScreen.tsx`, `packages/domain/src/shift-close.ts`
- **Verification:** Mobile, domain, and contract tests passed.
- **Committed in:** `69abb85e`, `021eac41`

**Total deviations:** 1 auto-fixed. **Impact on plan:** Tightened OPS-03 semantics without expanding user-visible scope.

## Issues Encountered

- The first combined domain/contract verification command used `&&` in PowerShell and did not run. The commands were rerun separately and passed.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - passed, 14 files / 145 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 101 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 234 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `cmd /c pnpm.cmd security:evidence` - passed, 422 tracked text files checked.

## Self-Check: PASSED

- Close summary renders active tasks, sync pending/conflict counts, central read status, build status, authorization status, and checklist progress.
- Safe close remains disabled unless strict domain evaluation is eligible and central validation is available.
- Incompatible build and invalid authorization block safe close with public copy.
- Unsafe close handoff remains available under blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 15-06 to reconcile documentation, release truth, and final operational-surface validation.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
