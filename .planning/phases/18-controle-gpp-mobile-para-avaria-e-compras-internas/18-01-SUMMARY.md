---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
plan: "01"
subsystem: mobile
tags: [gpp, offline, sqlite, contracts, idempotency]
requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    provides: GPP central mutation endpoints and contracts
provides:
  - Mobile GPP central client for avaria and purchase creation
  - GPP copy constants including local pending language
  - Dedicated local pending GPP queue contract
  - In-memory and SQLite persistence for GPP pending records
affects:
  - 18-02 mobile GPP navigation
  - 18-03 mobile avaria flow
  - 18-04 mobile purchase and pending surfaces
  - 18-05 retry and conflict closeout
tech-stack:
  added: []
  patterns: [contract-backed client, local pending queue, idempotency-key dedupe]
key-files:
  created:
    - apps/mobile/src/capture/gpp-copy.ts
    - apps/mobile/src/capture/gpp-client.ts
    - apps/mobile/src/capture/gpp-offline-queue.ts
    - apps/mobile/src/capture/gpp-client.test.ts
    - apps/mobile/src/capture/gpp-offline-queue.test.ts
  modified:
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
key-decisions:
  - "Central rejections stay central failures; only transport errors become local pending candidates."
  - "GPP pending records use a dedicated queue instead of Today offline commands."
patterns-established:
  - "Mobile GPP writes parse request and response contracts before presenting success."
  - "GPP local pending persistence deduplicates by idempotency key and keeps reviewable conflict/discard metadata."
requirements-completed: ["GPP-08"]
duration: 22min
completed: 2026-07-03
---

# Phase 18 Plan 01: GPP Mobile Client and Pending Queue Summary

Contract-backed GPP mobile writes with central-first acknowledgement, explicit offline-pending classification, and durable idempotent pending records.

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-03T01:08:00-03:00
- **Completed:** 2026-07-03T01:30:00-03:00
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments

- Added `createFetchGppClient` with `createGppAvaria` and `createGppPurchaseRequest`, backed by Phase 17 GPP contract schemas.
- Preserved truth boundaries: `central_confirmed` and `replayed` are success; validation, authorization, feature-disabled, and business-rule failures remain central failures.
- Added GPP local pending records with `Pendente neste aparelho`, idempotency key dedupe, retry attempt metadata, central confirmation, conflict, and discard justification states.
- Implemented the pending queue in both memory and SQLite repositories without weakening existing Today/offline sync contracts.

## Task Commits

1. **Tasks 1-2: GPP mobile copy, client, and failure classifier** - `8b2a01c5`
2. **Tasks 3-4: GPP pending queue repository and persistence** - `f61cd751`

**Plan metadata:** committed with this summary

## Files Created/Modified

- `apps/mobile/src/capture/gpp-copy.ts` - GPP user-facing copy constants, including exact local pending copy.
- `apps/mobile/src/capture/gpp-client.ts` - Contract-backed central create client and failure classifier.
- `apps/mobile/src/capture/gpp-offline-queue.ts` - Dedicated GPP pending record model and helpers.
- `apps/mobile/src/capture/repository.ts` - Capture repository methods for the GPP pending queue.
- `apps/mobile/src/capture/memory-repository.ts` - In-memory pending queue implementation.
- `apps/mobile/src/capture/sqlite-repository.ts` - Durable SQLite pending queue implementation and table.
- `apps/mobile/src/capture/gpp-client.test.ts` - Central success/failure/offline classification coverage.
- `apps/mobile/src/capture/gpp-offline-queue.test.ts` - Pending queue idempotency and state transition coverage.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-client gpp-offline-queue` - passed, 40 files / 298 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

- Test fixtures initially included a purchase `description` field that the central contract correctly rejects. Fixed the fixture to preserve the existing `GppPurchaseProductDraftSchema` boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-02. The next mobile GPP navigation work can call the new central client and save local pending records only after real transport failure.

---

*Phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas*
*Completed: 2026-07-03*
