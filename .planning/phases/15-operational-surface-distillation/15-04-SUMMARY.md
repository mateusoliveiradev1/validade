---
phase: 15-operational-surface-distillation
plan: "04"
subsystem: mobile-ui
tags: [react-native, today-readiness, prepare-turn, ajustes, sync, push]

requires:
  - phase: 15-operational-surface-distillation
    provides: Policy-aware lot registration and legacy lot compatibility
provides:
  - First-store empty central read path into lot registration
  - Shared Today readiness classification facts
  - Blocker-only Hoje readiness rendering with compact healthy metadata
affects: [shift-close, ajustes, mobile-release, command-center-readiness]

tech-stack:
  added: []
  patterns:
    - `todayReadinessFactsFor` classifies readiness as compact or blocking for Today
    - Hoje renders active work first and promotes only blockers affecting execution or safe close

key-files:
  created: []
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/ajustes-readiness.ts
    - apps/mobile/src/capture/mobile-status.test.ts
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/capture/mobile-release-journeys.test.tsx
    - apps/mobile/src/capture/prepare-turn.test.tsx
    - apps/mobile/src/App.test.tsx

key-decisions:
  - "A first-store central read with zero facts opens `Registrar lote` instead of a fatal prepare-turn state."
  - "Hoje hides healthy push education by default when there is no active work; Ajustes remains the detailed diagnostic surface."
  - "Readiness blockers do not override active sales-area risk as the primary hero verdict."

patterns-established:
  - "Readiness facts are rendered as compact metadata unless classified as `blocking_for_today`."
  - "Central refresh actions flow from Today back to the existing prepare-turn path."

requirements-completed: ["OPS-01", "OPS-02", "OPS-04"]

duration: 8 min
completed: 2026-06-30
---

# Phase 15 Plan 04: Today Readiness Distillation Summary

**First-store lot guidance and blocker-only Hoje readiness that keeps active work ahead of healthy diagnostics.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-30T10:33:00Z
- **Completed:** 2026-06-30T10:41:14Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Converted empty first-store prepare-turn into `Registrar primeiro lote` with primary `Registrar lote` action.
- Added `todayReadinessFactsFor` to classify central read, sync, push, camera, build, and authorization facts as compact or blocking.
- Updated Hoje to render compact healthy metadata and promote only real blockers such as stale/local central read or critical sync issues.

## Task Commits

1. **Task 1: Convert empty first-store prepare-turn into first-lot guidance** - `a00e205e` (feat)
2. **Task 2: Add Today readiness distillation helper** - `22e3891d` (feat)
3. **Task 3: Render compact healthy readiness and blocker-only Hoje notices** - `bd7af0be` (feat)

## Files Created/Modified

- `apps/mobile/src/capture/CaptureApp.tsx` - Routes first-store and Today central-refresh actions through the existing prepare-turn/discovery flow.
- `apps/mobile/src/capture/TodayScreen.tsx` - Renders readiness blockers and compact metadata while preserving active task priority.
- `apps/mobile/src/capture/ajustes-readiness.ts` - Adds Today readiness fact classification without changing Ajustes detail helpers.
- `apps/mobile/src/capture/mobile-status.test.ts` - Covers compact healthy facts, stale/missing central read, critical sync, and public-safe labels.
- `apps/mobile/src/capture/today-screen.test.tsx` - Covers compact healthy Hoje and stale central read refresh action.
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx` - Covers empty first-store journey into product discovery.
- `apps/mobile/src/capture/prepare-turn.test.tsx` - Updates first-store and local-cache expectations.
- `apps/mobile/src/App.test.tsx` - Updates smoke expectations for compact healthy readiness and critical sync blocker copy.

## Decisions Made

- `Preparar turno` remains available as a secondary retry on first-store setup, while `Registrar lote` is primary.
- Push education remains available for active-work push scenarios but is not shown as a healthy empty-state diagnostic.
- Critical sync blockers are visible, but sales-area risks still keep the hero focused on the immediate task.

## Deviations from Plan

### Auto-fixed Issues

**1. Preserve active-risk hero priority**
- **Found during:** Task 3 (Render compact healthy readiness and blocker-only Hoje notices)
- **Issue:** Initial blocker rendering made sync readiness override active sales-area risk in the hero.
- **Fix:** Kept active sales-area risk as the primary hero verdict while rendering readiness blockers inside the status stack.
- **Files modified:** `apps/mobile/src/capture/TodayScreen.tsx`
- **Verification:** Mobile release and push journey tests passed.
- **Committed in:** `bd7af0be`

**2. Keep local-cache wording explicit**
- **Found during:** Task 3 (Render compact healthy readiness and blocker-only Hoje notices)
- **Issue:** The first Today helper copy lost the previous "Leitura local em uso desde..." clarity.
- **Fix:** Today readiness facts now preserve the local-cache timestamp wording and no-safe-close warning.
- **Files modified:** `apps/mobile/src/capture/ajustes-readiness.ts`
- **Verification:** `today-screen.test.tsx` and `prepare-turn.test.tsx` passed.
- **Committed in:** `bd7af0be`

**Total deviations:** 2 auto-fixed. **Impact on plan:** No scope expansion; both fixes align readiness prominence with the planned task-first behavior.

## Issues Encountered

- Existing push and smoke tests encoded the older expectation that Today always showed push education. The tests were updated so healthy empty Hoje stays compact while active push scenarios remain covered.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 232 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `cmd /c pnpm.cmd security:evidence` - passed, 421 tracked text files checked.

## Self-Check: PASSED

- Empty first-store fixture renders `Registrar lote` and opens product discovery.
- Empty first-store fixture does not use `Turno nao preparado` as the primary state.
- Healthy Hoje does not show full-width push/sync diagnostic cards by default.
- Stale central read renders a prominent blocker with `Atualizar leitura central`.
- Critical sync blockers remain visible, and active task rows continue to render.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 15-05 to apply the same readiness and truth vocabulary to shift close.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
