---
phase: 11-mobile-visual-polish-and-emulator-validation
plan: "01"
subsystem: mobile-ui
tags:
  - react-native
  - mobile-status
  - prepare-turn
  - hoje
  - accessibility
requires:
  - phase: 10-real-pilot-flow-rebuild
    provides: central prepare-turn truth, sync taxonomy, and Hoje cockpit semantics
provides:
  - Shared typed mobile status vocabulary for critical, warning, neutral, and proven-safe states.
  - Prepare-turn gate polish that keeps local cache visibly non-safe.
  - Hoje first-viewport hierarchy with verdict, central/local/sync state, and next action.
affects:
  - 11-mobile-visual-polish-and-emulator-validation
  - mobile-critical-flow
  - android-validation
tech-stack:
  added: []
  patterns:
    - Local typed status descriptors drive mobile status tone, label, priority, and proof semantics.
    - Synced transport is neutral and distinct from resolved or safe business proof.
key-files:
  created:
    - apps/mobile/src/capture/mobile-status.ts
    - apps/mobile/src/capture/mobile-status.test.ts
  modified:
    - apps/mobile/src/capture/capture-ui.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/prepare-turn.test.tsx
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/capture/today-accessibility.test.tsx
    - apps/mobile/src/App.test.tsx
    - apps/mobile/src/capture/mobile-release-journeys.test.tsx
    - apps/mobile/src/capture/push-alerts.test.tsx
    - apps/mobile/src/capture/task-resolution.test.tsx
key-decisions:
  - "Synced transport uses neutral treatment and isProvenSafe=false; only central operational resolution or safe-close proof can use proven-safe success semantics."
  - "Hoje places central/local/sync state directly under the sales-area verdict before explanatory body copy and actions."
  - "Prepare-turn local-cache fallback remains a secondary action and states that local cache is not a safe central read."
patterns-established:
  - "mobile-status.ts: one typed descriptor vocabulary for labels, tones, priority, surface, and safety proof."
  - "StatusNotice: semantic tone support with title and accessibility role behavior while preserving the legacy error alias."
requirements-completed:
  - P11-POLISH-01
  - P11-STATUS-02
duration: 13 min
completed: 2026-06-28
---

# Phase 11 Plan 01: Shared Mobile Status and Hoje Cockpit Summary

**Typed mobile status vocabulary with prepare-turn gating and Hoje first-viewport central truth hierarchy**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-28T03:35:03Z
- **Completed:** 2026-06-28T03:48:08Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Added `mobile-status.ts` with priority, tone, copy, surface, and `isProvenSafe` semantics for local, pending central, conflict, synced transport, resolved, safe, provider, camera, and prepare blockers.
- Extended `StatusNotice` so mobile screens can render critical, warning, info, neutral, and success notices with visible titles and accessible roles.
- Reworked `Preparar turno` so loading, blocked, local cache, pending central, and review states use the shared status vocabulary without opening ordinary `Hoje` before readiness.
- Reworked the `Hoje` cockpit so the first block shows `Hoje`, the sales-area verdict, central/local/sync state, and then the primary action.

## Task Commits

1. **Task 1: Create the typed mobile status vocabulary** - `ed2d185d` (`feat(11-01): add shared mobile status vocabulary`)
2. **Task 2: Apply final-status treatment to Preparar turno** - `e1d87628` (`feat(11-01): polish prepare-turn gate status`)
3. **Task 3: Polish the Hoje cockpit first viewport** - `d42ff6e1` (`feat(11-01): polish Hoje cockpit status hierarchy`)

## Files Created/Modified

- `apps/mobile/src/capture/mobile-status.ts` - Typed status descriptors, proof flags, and priority sorting.
- `apps/mobile/src/capture/mobile-status.test.ts` - Status proof, ordering, copy, and notice-tone tests.
- `apps/mobile/src/capture/capture-ui.tsx` - `StatusNotice` semantic tone/title/accessibility behavior.
- `apps/mobile/src/capture/CaptureApp.tsx` - Prepare-turn status treatment and local-cache warning copy.
- `apps/mobile/src/capture/TodayScreen.tsx` - First-viewport status hierarchy and neutral synced-transport markers.
- `apps/mobile/src/capture/today-copy.ts` - Phase 11 safe-with-work, empty, pending central, and synced transport copy.
- `apps/mobile/src/capture/*test.tsx` and `apps/mobile/src/App.test.tsx` - Updated expectations for the new truthful mobile copy.

## Decisions Made

- `Sincronizado com a central` remains neutral transport state, not safe/resolved proof.
- `Resolvido com criterio operacional e confirmacao central` and `Area segura com leitura central` are the only descriptor states marked proven safe.
- `Hoje` no longer labels an empty central read as `Area de venda segura`; it uses `Nenhum bloqueio ativo na leitura central`.
- Local cache remains allowed as a secondary fallback but copy explicitly says it is not a safe central read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated dependent tests outside the initial task file list**
- **Found during:** Task 3 (Hoje cockpit polish)
- **Issue:** Shared copy changes broke existing smoke, push, task resolution, and release-journey tests that still expected old safety wording.
- **Fix:** Updated those tests to assert the Phase 11 central-truth copy instead of the previous `Area de venda segura` / `Pendente de sincronizacao` labels.
- **Files modified:** `apps/mobile/src/App.test.tsx`, `apps/mobile/src/capture/mobile-release-journeys.test.tsx`, `apps/mobile/src/capture/push-alerts.test.tsx`, `apps/mobile/src/capture/task-resolution.test.tsx`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile test today-screen today-accessibility task-resolution push-alerts App mobile-release-journeys prepare-turn mobile-status mobile-capture.accessibility`
- **Committed in:** `d42ff6e1`

---

**Total deviations:** 1 auto-fixed (missing dependent test updates).
**Impact on plan:** No production scope expansion; the extra test updates keep the new Phase 11 copy contract coherent across affected mobile coverage.

## Issues Encountered

- The initial `mobile-status.test.ts` used JSX in a `.ts` file; it was corrected to `React.createElement` and wrapped in `act` to match the repo's React 19 test pattern.
- Pre-summary GSD state helpers could not parse the current plan counters; metadata/state updates are handled after the summary exists.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test mobile-status prepare-turn today-screen mobile-capture.accessibility` - PASS, 4 files / 28 tests.
- `pnpm.cmd --filter @validade-zero/mobile test today-screen today-accessibility task-resolution push-alerts App mobile-release-journeys prepare-turn mobile-status mobile-capture.accessibility` - PASS, 9 files / 72 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - PASS.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `11-02`: product search, lot registration, task resolution, sync/conflict, and shift close can reuse the status vocabulary and `StatusNotice` tones without re-deciding proof semantics.

---
*Phase: 11-mobile-visual-polish-and-emulator-validation*
*Completed: 2026-06-28*
