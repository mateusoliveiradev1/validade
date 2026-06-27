---
phase: 10-real-pilot-flow-rebuild
plan: "04"
subsystem: sync
tags: [mobile, api, database, contracts, sync, central-truth, offline]

requires:
  - phase: 10-real-pilot-flow-rebuild
    provides: Central prepare-turn, product/catalog truth, central lot lifecycle, and active task projection.
provides:
  - Central terminal resolution policy for withdrawal, loss, repack, movement, not-found, sold-out, recheck, and markdown stages.
  - API/database sync command application against central active tasks with conflict, retry, idempotency, and resolved-history results.
  - Mobile reconciliation that keeps plain transport acknowledgement separate from central business resolution.
affects: [phase-10, mobile-hoje, api-sync, central-capture, command-center]

tech-stack:
  added: []
  patterns:
    - "SyncTransportResult.ack.centralResult is the business-state carrier; plain ack is only transport."
    - "Repository applySyncCommand owns central task mutation; API sync service only supplies store/device context and retry fallback."

key-files:
  created:
    - .planning/phases/10-real-pilot-flow-rebuild/10-04-SUMMARY.md
  modified:
    - packages/domain/src/tasks.ts
    - packages/domain/src/sync.ts
    - packages/contracts/src/tasks.ts
    - packages/contracts/src/sync.ts
    - packages/database/src/capture-repository.ts
    - apps/api/src/index.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts

key-decisions:
  - "Central accepted terminal outcomes are the only path that closes active risk after sync."
  - "Transport ack and business resolved state remain distinct on API and mobile."
  - "Conflicts and retries keep the active task visible."

patterns-established:
  - "Domain policy rejects incompatible/evidence-missing terminal actions before repository mutation."
  - "Duplicate sync idempotency keys replay stored results instead of duplicating history."
  - "Mobile repositories reconcile central resolved history into resolved local task state."

requirements-completed:
  - LOC-01
  - LOC-02
  - LOC-03
  - RSK-03
  - RSK-04
  - MRK-01
  - MRK-02
  - SYN-01
  - SYN-02
  - SYN-03
  - AUD-01
  - AUD-02
  - UI-01
  - UI-02
  - UI-03
  - UI-04

duration: inline
completed: 2026-06-26
---

# Phase 10 Plan 04 Summary

**Central terminal sync now resolves active tasks only after accepted business results, preserving conflicts, retries, and resolved history.**

## Performance

- **Duration:** Inline continuation
- **Started:** Carried over from 10-04 execution
- **Completed:** 2026-06-26T23:36:48-03:00
- **Tasks:** 3
- **Files modified:** 11 implementation/test files plus this summary

## Accomplishments

- Added pure terminal resolution policy and contracts for accepted resolved history, active-task, conflict, retry, and discarded central sync states.
- Replaced default API sync acknowledgement with central capture application against active tasks, including idempotency, conflicts, resolved task history, and cross-store safe conflict behavior.
- Updated mobile memory/SQLite repositories so plain transport ack keeps Hoje active, while `ack.centralResult.resolved_history` resolves the task and leaves local history/audit context.

## Task Commits

1. **Task 1: Define terminal resolution and sync application policy** - `b76f0bc` (feat)
2. **Task 2: Apply sync commands against central active tasks** - `34d68c7` (feat)
3. **Task 3: Update mobile terminal resolution and conflict/discard UX** - `492ac90` (feat)

## Files Created/Modified

- `packages/domain/src/tasks.ts` - Central terminal outcome policy and compatible action handling.
- `packages/domain/src/sync.ts` - Pure helpers distinguishing active-risk visibility from business resolution.
- `packages/contracts/src/tasks.ts` - Central terminal request and resolved-history contracts.
- `packages/contracts/src/sync.ts` - Central application result payloads on sync acknowledgements.
- `packages/database/src/capture-repository.ts` - Central sync command application, active-task resolution, conflict persistence, and in-memory parity.
- `apps/api/src/index.ts` - Default sync service now calls central capture application and returns business results.
- `apps/mobile/src/capture/memory-repository.ts` - Mobile central-result reconciliation and prepare-turn stale central task cleanup.
- `apps/mobile/src/capture/sqlite-repository.ts` - SQLite parity for central-result reconciliation.
- Tests updated across domain, contracts, database, API, and mobile sync behavior.

## Decisions Made

- Plain `ack` is not enough to hide a local active task; only `centralResult.kind === "resolved_history"` closes it.
- Central sync conflicts are persisted/read through the same prepare-turn conflict path already used by mobile.
- Existing mobile conflict/discard UI already enforced visible conflict review and explicit discard reason, so Task 3 focused on the repository truth boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. Task 3 file scope narrowed to repository reconciliation**
- **Found during:** Task 3 (mobile terminal resolution and conflict/discard UX)
- **Issue:** The listed UI files already had pending/conflict copy, review actions, and discard reason gating. The missing behavior was data-layer reconciliation of central business results.
- **Fix:** Updated memory and SQLite repositories to apply central resolved history and prepare-turn reconciliation instead of duplicating UI copy changes.
- **Files modified:** `apps/mobile/src/capture/memory-repository.ts`, `apps/mobile/src/capture/sqlite-repository.ts`, `apps/mobile/src/capture/offline-sync.test.ts`
- **Verification:** Mobile task-resolution/offline-sync/today-screen tests and typecheck passed.
- **Committed in:** `492ac90`

---

**Total deviations:** 1 auto-fixed scope correction
**Impact on plan:** No product scope reduction; the acceptance criteria are covered at the truth boundary that controls Hoje visibility.

## Issues Encountered

- TypeScript exact optional property checks required narrowing optional evidence/destination fields before calling the domain policy.
- Existing STATE helper had previously failed to parse this repository state file, so state will be updated manually and validated.
- Migration check was explicit because 10-04 started writing central sync receipts/conflicts. No new migration was required: `packages/database/drizzle/0006_phase_10_central_capture.sql` and `packages/database/src/schema.ts` already define `central_sync_commands`, `central_sync_conflicts`, `central_projected_tasks`, and the `resolved` central sync/task states used by this plan.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- tasks sync markdown`
- `pnpm.cmd --filter @validade-zero/domain typecheck`
- `pnpm.cmd --filter @validade-zero/contracts test -- tasks sync markdown`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/database test -- repositories`
- `pnpm.cmd --filter @validade-zero/database typecheck`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture sync authorization`
- `pnpm.cmd --filter @validade-zero/api typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution offline-sync today-screen`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd exec prettier --check ...`

## Next Phase Readiness

10-05 can consume central active/resolved/conflict state for the Command Center and escalation audience. The remaining work is web/leadership projection and push/escalation central audience, not terminal sync semantics.

---
*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-26*
