---
phase: 07-offline-sync
plan: "01"
subsystem: domain-contracts
tags: [offline-sync, zod, domain-policy, today-tasks, idempotency]
requires:
  - phase: 06-markdown-rebaixa-workflow
    provides: markdown task and command contracts reused by offline commands
provides:
  - Pure offline cache and sync queue policy helpers.
  - Strict sync command, queue, conflict, cache, and transport schemas.
  - Optional Today task sync metadata for pending, synced, failed, and conflict states.
affects: [offline-sync, mobile-repository, mobile-ui, api-sync, phase-8-audit]
tech-stack:
  added: []
  patterns:
    - Pure domain sync helpers remain free of runtime validation, SQLite, network, or UI dependencies.
    - Sync command contracts reuse existing task and markdown command schemas.
key-files:
  created:
    - packages/domain/src/sync.ts
    - packages/domain/src/sync.test.ts
    - packages/contracts/src/sync.ts
    - packages/contracts/src/sync.test.ts
  modified:
    - packages/domain/src/index.ts
    - packages/contracts/src/tasks.ts
    - packages/contracts/src/tasks.test.ts
    - packages/contracts/src/index.ts
key-decisions:
  - "Today task sync metadata is defined beside TodayTaskRecordSchema to avoid a runtime import cycle while remaining exported from the contracts package."
requirements-completed: [SYN-01, SYN-02, SYN-03]
duration: 5 min
completed: 2026-06-22
---

# Phase 07 Plan 01: Sync Contracts And Pure Offline Policy Summary

**Offline sync vocabulary now has pure domain policy helpers and strict runtime schemas for cache readiness, command outbox, queue summaries, conflicts, and transport outcomes.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-22T01:49:00Z
- **Completed:** 2026-06-22T01:54:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added pure domain vocabulary for offline cache states, command states, command kinds, conflict actions, and urgency ordering.
- Added deterministic policy helpers for cache freshness, critical command urgency, conflict-first queue sorting, discard reason requirements, and qualified safety verdicts.
- Added strict Zod contracts for offline cache status, command envelopes, sync records, queue summaries, conflicts, transport batches, and ack/retry/conflict results.
- Extended Today task records with optional sync metadata while preserving compatibility for non-sync task records.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pure offline sync policy helpers** - `5a8916c` (feat)
2. **Task 2: Add strict sync contracts and Today sync metadata** - `e92932e` (feat)

**Plan metadata:** this docs commit

## Files Created/Modified

- `packages/domain/src/sync.ts` - Pure offline cache, queue ordering, urgency, discard reason, and safety qualifier policy.
- `packages/domain/src/sync.test.ts` - Focused coverage for cache readiness, stale threshold, offline mode, urgency, queue sorting, discard reasons, and safety qualification.
- `packages/domain/src/index.ts` - Exports the new domain sync policy module.
- `packages/contracts/src/sync.ts` - Strict schemas for sync cache, commands, queue summaries, conflicts, transport batches, and transport results.
- `packages/contracts/src/sync.test.ts` - Contract coverage for strict parsing, idempotency keys, conflict details, transport outcomes, and raw evidence/storage rejection.
- `packages/contracts/src/tasks.ts` - Adds optional Today task sync metadata.
- `packages/contracts/src/tasks.test.ts` - Verifies optional sync metadata and malformed sync rejection on Today tasks.
- `packages/contracts/src/index.ts` - Exports sync contracts from the package boundary.

## Decisions Made

- Today task sync metadata lives in `packages/contracts/src/tasks.ts`, next to `TodayTaskRecordSchema`, so `TodayTaskRecordSchema` can include it without creating a circular import between `tasks.ts` and `sync.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Avoided contracts import cycle for Today sync metadata**
- **Found during:** Task 2 (Add strict sync contracts and Today sync metadata)
- **Issue:** Defining `TodayTaskSyncMetadataSchema` in `sync.ts` and importing it into `tasks.ts` would force `sync.ts` to import task command schemas while `tasks.ts` imports back from `sync.ts`.
- **Fix:** Defined the metadata schema beside `TodayTaskRecordSchema`; `sync.ts` imports it for typing integration and the package index exports both modules.
- **Files modified:** `packages/contracts/src/tasks.ts`, `packages/contracts/src/sync.ts`, `packages/contracts/src/index.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/contracts typecheck` passed.
- **Committed in:** `e92932e`

---

**Total deviations:** 1 auto-fixed (bug prevention)
**Impact on plan:** Public contract behavior remains aligned with the plan; the placement prevents an ESM runtime cycle.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- sync` - passed
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed
- `pnpm.cmd --filter @validade-zero/contracts test -- sync` - passed
- `pnpm.cmd --filter @validade-zero/contracts test -- tasks` - passed
- `pnpm.cmd --filter @validade-zero/contracts typecheck` - passed

## Self-Check: PASSED

- Key files created on disk.
- Task commits exist for `07-01`.
- Focused domain and contract verification commands pass.
- Sync contracts reject raw evidence/storage fields and require idempotency/conflict detail.

## Next Phase Readiness

Ready for `07-02`: repository work can now persist offline cache status, idempotent command records, queue summaries, and sync metadata using shared domain policy and runtime contracts.

---
*Phase: 07-offline-sync*
*Completed: 2026-06-22*
