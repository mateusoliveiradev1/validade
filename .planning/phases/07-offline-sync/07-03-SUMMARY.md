---
phase: 07-offline-sync
plan: "03"
subsystem: mobile-api-sync
tags: [offline-sync, netinfo, sync-engine, hono, idempotency]
requires:
  - phase: 07-offline-sync
    provides: repository outbox/cache/conflict ports from plan 02
provides:
  - Fakeable mobile network state adapter backed by Expo-compatible NetInfo.
  - Mobile sync engine for queue selection, attempts, strict batch transport, ack, retry, and conflict application.
  - Hono `POST /sync/commands` pilot seam with in-memory idempotency, retry, and conflict behavior.
  - Offline sync operations documentation with native verification and pilot limitation notes.
affects: [mobile-ui, api-sync, phase-8-audit, v1-readiness]
tech-stack:
  added:
    - "@react-native-community/netinfo@12.0.1"
  patterns:
    - Network state is only a sync trigger; transport ack is the only path to synced state.
    - API sync transport returns a strict `{ results: SyncTransportResult[] }` envelope for batched commands.
key-files:
  created:
    - apps/mobile/src/capture/network-state.ts
    - apps/mobile/src/capture/sync-engine.ts
    - apps/mobile/src/capture/sync-engine.test.ts
    - apps/api/src/sync.test.ts
    - docs/operations/offline-sync.md
  modified:
    - apps/mobile/package.json
    - pnpm-lock.yaml
    - apps/api/src/index.ts
    - packages/contracts/src/sync.test.ts
key-decisions:
  - "NetInfo is dynamically imported behind network-state.ts so tests can use fakes and production native code stays isolated."
  - "The API sync route returns batched results in a `{ results: [...] }` envelope because the mobile sync engine sends a strict SyncTransportBatch."
patterns-established:
  - "Sync engine flow: read network, read queue, skip offline/degraded automatic sync, mark attempts, send batch, apply strict transport results."
  - "Pilot API seam: parse strict batches, deduplicate by idempotency key, and return ack/retry/conflict without claiming durable central storage."
requirements-completed: [SYN-02, SYN-03]
duration: 8 min
completed: 2026-06-22
---

# Phase 07 Plan 03: Sync Engine And API Seam Summary

**Queued offline commands now have a fakeable mobile sync runner and a contract-tested Hono pilot seam for ack, retry, and explicit conflicts.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-22T02:12:00Z
- **Completed:** 2026-06-22T02:20:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added Expo-compatible `@react-native-community/netinfo@12.0.1` and isolated native connectivity reads behind `network-state.ts`.
- Added `createSyncEngine` to select due pending/failed commands, skip offline/degraded automatic runs, allow manual degraded retry, mark attempts, send strict batches, and apply ack/retry/conflict results through repository ports.
- Added a `POST /sync/commands` Hono seam with injectable in-memory sync service for pilot tests, idempotency dedupe, retry fixtures, and conflict detail generation.
- Added operations documentation for offline-ready criteria, queue retry behavior, idempotency, conflict review, NetInfo limitations, pilot API limitations, and native verification.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fakeable network state and mobile sync engine** - `46c802d` (feat)
2. **Task 2: Add Hono sync endpoint seam and operations documentation** - `4833cb6` (feat)

**Plan metadata:** this docs commit

## Files Created/Modified

- `apps/mobile/package.json` - Adds Expo-compatible NetInfo dependency.
- `pnpm-lock.yaml` - Locks `@react-native-community/netinfo@12.0.1`.
- `apps/mobile/src/capture/network-state.ts` - Normalizes NetInfo snapshots into `online`, `offline`, and `degraded` states with a fake provider for tests.
- `apps/mobile/src/capture/sync-engine.ts` - Orchestrates queue selection, attempts, batch transport, and result application through repository ports.
- `apps/mobile/src/capture/sync-engine.test.ts` - Covers offline/degraded gating, ack, retry failure, conflict application, idempotency reuse, syncing exclusion, and critical-first ordering.
- `apps/api/src/index.ts` - Adds `createApiApp`, injectable sync service, and `POST /sync/commands`.
- `apps/api/src/sync.test.ts` - Covers ack, duplicate idempotency, malformed batch rejection, retry, conflict detail, raw evidence rejection, and health/probe regression.
- `docs/operations/offline-sync.md` - Documents operating rules and current pilot limitations.
- `packages/contracts/src/sync.test.ts` - Adjusts a retry error fixture to remain explicitly fake for data-safety scanning.

## Decisions Made

- Used the official Expo-compatible NetInfo install path and locked the current bundled version, `12.0.1`.
- Kept the sync engine independent from UI and concrete repositories; it consumes only `CaptureRepository`, `NetworkStateProvider`, and `SyncTransport`.
- Kept the API seam in-memory and injectable. It proves contracts and behavior, but deliberately avoids claiming durable central multi-device storage before auth/store infrastructure exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Returned batched transport results in an envelope**
- **Found during:** Task 2 (Add Hono sync endpoint seam and operations documentation)
- **Issue:** The mobile sync engine sends batches and expects multiple transport results, while the plan wording mentioned returning `SyncTransportResultSchema` singular.
- **Fix:** Returned `{ results: SyncTransportResult[] }`, with each result parsed by `SyncTransportResultSchema`.
- **Files modified:** `apps/api/src/index.ts`, `apps/api/src/sync.test.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/api test -- sync` passed.
- **Committed in:** `4833cb6`

**2. [Rule 3 - Blocking] Made retry error fixtures explicitly fake for `security:data`**
- **Found during:** Task 2 verification
- **Issue:** The data scanner flagged generic `rede indisponivel`/`Rede indisponivel` fixture text as possible real operational data.
- **Fix:** Renamed those test strings to include `ficticia`.
- **Files modified:** `apps/mobile/src/capture/sync-engine.test.ts`, `packages/contracts/src/sync.test.ts`
- **Verification:** `pnpm.cmd security:data` passed.
- **Committed in:** `4833cb6`

---

**Total deviations:** 2 auto-fixed (blocking verification/contract clarity)
**Impact on plan:** Behavior remains aligned with the plan; the response envelope is required for batch sync and the fixture wording keeps public-repo safety checks green.

## Issues Encountered

- API typecheck caught exact optional property and union narrowing issues in the in-memory sync service. Fixed by conditionally spreading optional fields and narrowing on `command.payload.kind`.

## User Setup Required

None - `npx.cmd expo install @react-native-community/netinfo` updated `apps/mobile/package.json` and `pnpm-lock.yaml`.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- sync-engine` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed
- `pnpm.cmd --filter @validade-zero/api test -- sync` - passed
- `pnpm.cmd --filter @validade-zero/api test` - passed
- `pnpm.cmd --filter @validade-zero/api typecheck` - passed
- `pnpm.cmd security:data` - passed

## Self-Check: PASSED

- Production NetInfo code is isolated from repository/UI tests.
- Automatic sync skips offline and degraded states unless degraded is manually retried.
- Retry reuses the same idempotency key and payload.
- API conflicts include local action, product, lote, location, local time, and remote change detail.
- Docs explicitly state the API seam is not durable central multi-device storage.

## Next Phase Readiness

Ready for `07-04`: the UI can now consume repository sync metadata and engine/API results to show offline readiness, pending sync, failures, conflicts, and manual retry affordances.

---
*Phase: 07-offline-sync*
*Completed: 2026-06-22*
