---
phase: 07-offline-sync
plan: "02"
subsystem: mobile-repository
tags: [offline-sync, sqlite, outbox, today-tasks, conflict-resolution]
requires:
  - phase: 07-offline-sync
    provides: strict sync contracts and pure offline policy from plan 01
provides:
  - Mobile repository port methods for offline cache, sync queue, command attempts, transport results, and conflict resolution.
  - Memory repository behavior for cached Hoje metadata, idempotent offline commands, pending task metadata, and conflict summaries.
  - SQLite persistence for offline cache status, sync command outbox, conflicts, and Today task sync metadata.
affects: [mobile-ui, today-screen, api-sync, phase-8-audit]
tech-stack:
  added: []
  patterns:
    - Repository adapters validate offline sync payloads through shared contracts before storing or returning state.
    - SQLite outbox mutations use transactions and write the command before updating local Today task projections.
key-files:
  created:
    - apps/mobile/src/capture/offline-sync.test.ts
  modified:
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/sqlite-migrations.ts
    - packages/contracts/src/sync.ts
    - packages/contracts/src/sync.test.ts
key-decisions:
  - "Today task rows store optional sync metadata in sync_json so listActiveTodayTasks and loadTodayTask can expose pending, failed, synced, and conflict states without UI-specific joins."
  - "SQLite sync persistence stores command/evidence metadata only; raw evidence binaries and remote object storage remain outside Phase 7 local sync tables."
patterns-established:
  - "Offline repository lifecycle: save command transactionally, attach local sync metadata, mark attempts, then apply ack/retry/conflict transport results."
  - "Conflict review visibility: sync_conflicts rows and task sync metadata keep critical conflicts visible until an explicit resolution action."
requirements-completed: [SYN-01, SYN-02, SYN-03]
duration: 17 min
completed: 2026-06-22
---

# Phase 07 Plan 02: Mobile Offline Repository Summary

**Mobile Hoje now has a validated offline cache/outbox layer with memory and SQLite adapters that keep pending and conflict work visible until sync acknowledgement.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-22T01:55:00Z
- **Completed:** 2026-06-22T02:12:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Extended `CaptureRepository` with offline cache status, sync queue summary, offline command save, sync attempt, transport result, and conflict resolution methods.
- Added memory adapter behavior for cache freshness, idempotent offline command records, retry attempt reuse, pending task metadata, and urgency/conflict queue summaries.
- Added SQLite tables, indexes, mappers, migrations, and transactional methods for cache status, command outbox, conflicts, and `TodayTaskRecord.sync`.
- Added focused offline sync coverage for cache readiness/staleness, all supported offline actions, retry stability, critical pending visibility, conflict summaries, SQLite source guards, and idempotent sync-column migration.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add repository port and memory offline behavior** - `9c1f595` (feat)
2. **Task 2: Persist outbox, cache status, conflicts, and local projections in SQLite** - `3ff090f` (feat)

**Plan metadata:** this docs commit

## Files Created/Modified

- `apps/mobile/src/capture/repository.ts` - Adds sync/offline repository methods and parse helpers at the capture boundary.
- `apps/mobile/src/capture/memory-repository.ts` - Implements cache metadata, offline command save, retries, transport outcomes, conflicts, and task sync metadata in memory.
- `apps/mobile/src/capture/sqlite-repository.ts` - Persists offline cache status, sync commands, conflicts, and Today task sync metadata with transactional state changes.
- `apps/mobile/src/capture/sqlite-migrations.ts` - Adds reusable column migration helper and idempotent `sync_json` migration.
- `apps/mobile/src/capture/offline-sync.test.ts` - Covers memory behavior, SQLite persistence source guards, and sync metadata migration.
- `packages/contracts/src/sync.ts` - Extends queue summary contract with explicit critical-conflict visibility.
- `packages/contracts/src/sync.test.ts` - Verifies the updated queue summary contract.

## Decisions Made

- Stored task sync metadata in `today_tasks.sync_json` because Hoje needs pending/conflict markers directly from the existing task repository methods.
- Kept raw evidence/storage data out of local sync persistence. Offline commands preserve command metadata and evidence prompts, but not binary payloads or remote storage keys.
- Used stable idempotency keys derived from command kind, target task/workflow/lot, action, and occurrence timestamp so retries reuse the same command row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `hasCriticalConflict` to the queue summary contract**
- **Found during:** Task 1 (Add repository port and memory offline behavior)
- **Issue:** The plan required `SyncQueueSummary` to expose `hasCriticalConflict`, but the plan 01 contract did not include that field.
- **Fix:** Added `hasCriticalConflict` to `SyncQueueSummarySchema` and its contract tests before repository adapters consumed it.
- **Files modified:** `packages/contracts/src/sync.ts`, `packages/contracts/src/sync.test.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/contracts test -- sync` and `pnpm.cmd --filter @validade-zero/contracts typecheck` passed before the Task 1 commit.
- **Committed in:** `9c1f595`

---

**Total deviations:** 1 auto-fixed (blocking contract dependency)
**Impact on plan:** Required for the planned queue API; no scope expansion beyond 07-02.

## Issues Encountered

- Mobile typecheck initially failed after Task 1 because the SQLite adapter had not implemented the newly required repository methods yet. This was expected between tasks and was resolved by Task 2.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- markdown-workflow` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- alert` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed

## Self-Check: PASSED

- Repository port methods exist in both memory and SQLite adapters.
- SQLite schema includes offline cache, sync command, and sync conflict storage plus required indexes.
- Local save writes a command before task sync metadata, and transport ack/retry/conflict paths update command and task state.
- Source guards confirm Phase 7 sync persistence does not store raw evidence binaries or remote object storage keys.

## Next Phase Readiness

Ready for `07-03`: connectivity, sync engine, and transport seams can now consume the repository outbox and apply ack/retry/conflict results through stable adapter methods.

---
*Phase: 07-offline-sync*
*Completed: 2026-06-22*
