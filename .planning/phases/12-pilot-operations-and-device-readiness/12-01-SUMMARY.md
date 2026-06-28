---
phase: 12-pilot-operations-and-device-readiness
plan: "01"
subsystem: api-database-web-contracts
tags: [command-center, device-readiness, postgres, zod, react]
requires:
  - phase: 11-mobile-visual-polish-and-emulator-validation
    provides: "Truthful Android/provider/camera blocker semantics and mobile status vocabulary."
provides:
  - "Public-safe pilot device readiness contracts with Apto, Atencao, and Bloqueado verdicts."
  - "Store-scoped device readiness persistence on central_device_snapshots."
  - "Command Center Aparelhos do piloto panel with cause and next action per device."
affects: [phase-12, command-center, pilot-uat, push-readiness, release-readiness]
tech-stack:
  added: []
  patterns:
    - "Device readiness is projected from central snapshots, not a separate truth island."
    - "Public device surfaces expose masked IDs and operational labels, never raw tokens."
key-files:
  created:
    - packages/database/drizzle/0013_phase_12_device_readiness.sql
  modified:
    - packages/contracts/src/capture.ts
    - packages/contracts/src/command-center.ts
    - packages/contracts/src/command-center.test.ts
    - packages/database/src/schema.ts
    - packages/database/src/capture-repository.ts
    - packages/database/src/repositories.test.ts
    - apps/api/src/command-center.ts
    - apps/api/src/command-center.test.ts
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center.test.tsx
key-decisions:
  - "Per-device readiness uses Apto, Atencao, and Bloqueado as operator-facing verdicts."
  - "central_device_snapshots remains the persistence anchor for device readiness."
  - "Last foreground, last sync, and last central read are displayed as timestamp facts, not live presence."
patterns-established:
  - "Readiness blockers carry code, detail, severity, and nextAction for operational follow-up."
  - "Command Center device rows sort Bloqueado, then Atencao, then Apto."
requirements-completed: [P12-DEVICE-01, P12-OPS-05]
duration: 24 min
completed: 2026-06-28
---

# Phase 12 Plan 01: Device Readiness Model and Command Center Panel Summary

**Store-scoped pilot device readiness now flows from central snapshots into API and web with public-safe labels, blocker causes, and next actions.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-28T14:22:40Z
- **Completed:** 2026-06-28T14:46:08Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added runtime contracts for `apto`, `atencao`, and `bloqueado` device verdicts, permission/provider state, blockers, masked device debug strings, and next actions.
- Extended central device snapshots and repository projection so device readiness is durable, store-scoped, and derived from central read/sync/permission facts.
- Added the Command Center `Aparelhos do piloto` panel with blocked devices first, PT-BR operational copy, and no raw token/device identifier exposure.

## Task Commits

1. **Task 1: Define device readiness contracts and blocker taxonomy** - `0bcd763a`
2. **Task 2: Persist and project readiness from central device snapshots** - `3118664b`
3. **Task 3: Render the Command Center device readiness panel** - `988c546c`

## Files Created/Modified

- `packages/contracts/src/command-center.ts` - Device readiness, blocker, permission, provider, and projection schemas.
- `packages/contracts/src/capture.ts` - Sanitized device telemetry fields for prepare-turn request/response snapshots.
- `packages/database/drizzle/0013_phase_12_device_readiness.sql` - Idempotent migration for public-safe readiness metadata and indexes.
- `packages/database/src/capture-repository.ts` - Snapshot write/read path plus readiness verdict/blocker synthesis.
- `apps/api/src/command-center.ts` - Capture-backed projection now includes store-scoped device readiness.
- `apps/web/src/command-center/CommandCenter.tsx` - Operational device readiness panel.

## Decisions Made

- Device readiness stays attached to `central_device_snapshots` so the Command Center does not create a second truth source.
- A device with no first central read is blocked even if it has opened the app; foreground/sync timestamps are not safety proof.
- Push can be `Atencao` when remote push is not the current proof target, but becomes `Bloqueado` when remote push is required.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial contract test edit had a malformed `expect(...)` parenthesis. Fixed immediately and re-ran the contract gate successfully.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center capture` - 11 files, 92 tests passed.
- `pnpm.cmd --filter @validade-zero/database test -- repositories health` - 2 files, 43 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center` - 12 files, 77 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` - 9 files, 31 tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 12-02 safe push-test command and provider outcome timeline. Device rows can already represent push permission/provider gaps without treating push as task resolution.

---
*Phase: 12-pilot-operations-and-device-readiness*
*Completed: 2026-06-28*
