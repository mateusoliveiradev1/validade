---
phase: 04-today-task-workflow
plan: "01"
subsystem: domain-contracts-mobile-storage
tags: [today-tasks, risk, zod, sqlite, mobile-repository, vitest]
requires:
  - phase: 02-domain-and-risk-core
    provides: RiskAssessment, risk states, product rule profiles, and physical-presence uncertainty.
  - phase: 03-mobile-lot-capture
    provides: Local product, lot, observation, memory, and SQLite capture repository.
provides:
  - Pure Today task derivation and compatible resolution vocabulary.
  - Strict task, resolution, refresh, future-attention, and evidence metadata contracts.
  - Local memory and SQLite task refresh, persistence, resolution, and future-attention reads.
affects: [phase-04-today-screen, phase-04-task-resolution, phase-05-push-escalation]
tech-stack:
  added: []
  patterns: [pure-domain-task-derivation, strict-zod-task-boundary, local-sqlite-task-storage]
key-files:
  created:
    - packages/domain/src/tasks.ts
    - packages/domain/src/tasks.test.ts
    - packages/contracts/src/tasks.ts
    - packages/contracts/src/tasks.test.ts
    - apps/mobile/src/capture/today-task-repository.test.ts
  modified:
    - packages/domain/src/index.ts
    - packages/contracts/src/index.ts
    - packages/contracts/package.json
    - packages/contracts/tsconfig.json
    - vitest.config.ts
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - eslint.config.mjs
key-decisions:
  - "Today task derivation stays pure and consumes RiskAssessment instead of duplicating risk rules in mobile code."
  - "Radar is modeled as future attention, not an active shift task."
  - "Evidence remains local UX/contract metadata only; no binary image, R2 key, sync, audit, or push scope was added."
patterns-established:
  - "Active task identity uses lotId:riskState:requiredResolution:recheckParentId to keep refresh idempotent."
  - "Repository task boundaries parse commands and records through Zod before local mutation."
requirements-completed: [RSK-03, RSK-04]
duration: 10 min
completed: 2026-06-19
---

# Phase 04 Plan 01: Today Task Foundation Summary

**Local Today task layer that turns lot risk snapshots into typed, persistent, idempotent shift work**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-19T23:13:00-03:00
- **Completed:** 2026-06-19T23:23:14-03:00
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added pure domain task derivation for actionable states, radar future attention, sales-area priority, due buckets, and compatible action checks.
- Added strict Zod contracts for Today task records, refresh metadata, resolution commands, and photo/no-photo evidence metadata without real evidence storage.
- Extended the mobile repository boundary, memory adapter, and SQLite adapter with local task refresh, active listing, future attention, resolution, and task lookup.
- Added focused domain, contract, and mobile repository tests using fictitious data.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define pure Today task derivation and runtime task contracts** - `7f4edd5` (feat)
2. **Task 2: Persist and refresh active Today tasks from local lot snapshots** - `dfa5924` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `packages/domain/src/tasks.ts` - Pure Today task derivation, priority, due, section, and compatible action vocabulary.
- `packages/contracts/src/tasks.ts` - Runtime schemas for task records, refresh, resolution commands, and evidence prompt metadata.
- `apps/mobile/src/capture/repository.ts` - Today task repository port and shared task derivation helpers over capture lot details.
- `apps/mobile/src/capture/memory-repository.ts` - Deterministic in-memory task refresh, listing, resolution, and future-attention behavior.
- `apps/mobile/src/capture/sqlite-repository.ts` - Local task tables, indexes, refresh upsert, resolution, and future-attention storage.
- `apps/mobile/src/capture/today-task-repository.test.ts` - Active filtering, idempotent refresh, priority, radar separation, resolution preservation, and SQLite scope tests.

## Decisions Made

- Active tasks are not recreated after a local resolution for the same active key; resolution state and history remain preserved across refreshes.
- SQLite stores only operational task fields and metadata. It does not add remote API, sync outbox, push, R2, audit storage, roles, or shift close scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleaned optional contract values before domain calls**
- **Found during:** Task 2
- **Issue:** `exactOptionalPropertyTypes` rejected contract objects that could contain optional fields as `undefined`.
- **Fix:** Added conversion helpers that emit only defined risk windows, product overrides, and category profile fields before calling domain functions.
- **Files modified:** `apps/mobile/src/capture/repository.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck`
- **Committed in:** `dfa5924`

**2. [Rule 3 - Blocking] Excluded contract tests from package typecheck build**
- **Found during:** Task 1
- **Issue:** The contracts package typecheck included Vitest test files and pulled runtime test globals outside the package build target.
- **Fix:** Added a real contracts Vitest project and excluded `src/**/*.test.ts` from `packages/contracts/tsconfig.json`.
- **Files modified:** `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `vitest.config.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/contracts test -- tasks` and `pnpm.cmd --filter @validade-zero/contracts typecheck`
- **Committed in:** `7f4edd5`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required for strict type safety and package verification. No scope expansion.

## Issues Encountered

None remaining.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- tasks` - passed, 7 files / 58 tests.
- `pnpm.cmd --filter @validade-zero/contracts test -- tasks` - passed, 1 file / 4 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` - passed, 11 files / 21 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - passed, including dependency boundary check for 58 source files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 04-02. The Hoje screen can consume `refreshTodayTasks`, `listActiveTodayTasks`, `listFutureAttention`, and `loadTodayTask` through the repository port.

---
*Phase: 04-today-task-workflow*
*Completed: 2026-06-19*
