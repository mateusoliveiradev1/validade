---
phase: 13-web-operational-navigation-and-readiness-surfaces
plan: "02"
subsystem: web-ui
tags: [react, command-center, operacao, device-readiness, vitest]

requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-01 route foundation and shared Command Center selectors
provides:
  - OperacaoRoute daily safety surface
  - Compact device readiness strip with apto/atencao/bloqueado counts
  - Daily-operation device blocker filtering in the Operacao route
  - Presence and absence tests for daily operation versus rollout diagnostics
affects: [phase-13, operacao-route, web-command-center, daily-device-readiness]

tech-stack:
  added: []
  patterns: [route-specific-command-center-view, daily-diagnostic-separation]

key-files:
  created:
    - apps/web/src/command-center/OperacaoRoute.tsx
  modified:
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center.test.tsx

key-decisions:
  - "Operacao owns the sales-area answer and no longer renders UAT, pilot blocker, build artifact, or push-test timeline details."
  - "Device readiness remains permanently visible in Operacao as counts plus only daily-execution blockers."
  - "Push-only, camera-only, and build-only rollout issues stay out of the daily blocker row unless they affect execution."

patterns-established:
  - "CommandCenter selects OperacaoRoute for activeRoute=operacao while keeping the shared projection load in the host."
  - "Operacao route tests must assert both presence of daily safety facts and absence of rollout diagnostics."

requirements-completed: ["WEB-01", "WEB-02"]

duration: 7 min
completed: 2026-06-29
---

# Phase 13 Plan 02: Operacao Route Summary

**Daily Operacao route with sales-area safety first, compact device readiness, and rollout diagnostics removed from the first scan**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-29T01:58:30Z
- **Completed:** 2026-06-29T02:05:26Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `OperacaoRoute.tsx` as the first route-specific Command Center view.
- Moved the daily header, sales-area verdict, central snapshot, `Por que venceu`, empty state, operational funnel, and audit action into Operacao.
- Added the compact device strip: `Aparelhos: {apto} aptos, {atencao} em atencao, {bloqueado} bloqueados`, with `Abrir Aparelhos`.
- Used the daily-operation blocker helper so push-only readiness warnings remain compact while `missing_first_central_read` becomes a visible daily blocker with `Causa:` and `Agora:`.
- Rewrote the daily test around presence and absence: Operacao keeps daily safety, and omits UAT, pilot blockers, approved APK artifact text, safe push-test action, and push timeline labels.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the Operacao daily safety route** - `2c7ad75a` (feat)
2. **Task 2: Implement daily blocker filtering for the device strip** - `d7290866` (test)
3. **Task 3: Rewrite Operacao tests around presence and absence** - `cea2c6b2` (test)

## Files Created/Modified

- `apps/web/src/command-center/OperacaoRoute.tsx` - Daily safety route with compact device strip and operational funnel.
- `apps/web/src/command-center/CommandCenter.tsx` - Selects OperacaoRoute for the `operacao` route while preserving shared projection loading.
- `apps/web/src/command-center/command-center.test.tsx` - Covers Operacao presence/absence and daily device blocker filtering.

## Decisions Made

- The route split starts with Operacao only; non-Operacao routes continue through the existing projection view until plans 13-03 through 13-05 extract them.
- The daily device strip shows counts for all devices, even when no daily blocker exists.
- `push_required_without_push` does not become a daily blocker row. `missing_first_central_read` does.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion.

## Issues Encountered

- `exactOptionalPropertyTypes` required conditional prop spreading for optional route callbacks and refresh timestamps. Fixed before commit.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files and 35 tests
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed

## Next Phase Readiness

Ready for `13-03`: Aparelhos can now take over the detailed device list and safe push-test action from the legacy all-in-one view.

---
*Phase: 13-web-operational-navigation-and-readiness-surfaces*
*Completed: 2026-06-29*
