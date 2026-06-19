---
phase: 03-mobile-lot-capture
plan: "01"
subsystem: mobile-local-storage
tags: [expo-sqlite, zod, mobile, capture, ledger]
requires:
  - phase: 02-domain-and-risk-core
    provides: Product-mode and physical-confirmation vocabularies used by the capture contracts.
provides:
  - Runtime-validated capture contracts for products, lots, locations, and observations.
  - Durable local SQLite ledger with append-only observations and current snapshots.
  - Deterministic in-memory repository adapter for native-free mobile tests.
affects: [mobile-lot-capture-ui, barcode-assistance, offline-sync]
tech-stack:
  added: [expo-sqlite]
  patterns: [mode-discriminated Zod contracts, append-only local observations, repository port with deterministic dependencies]
key-files:
  created:
    - packages/contracts/src/capture.ts
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
  modified:
    - apps/mobile/package.json
    - apps/mobile/app.json
    - eslint.config.mjs
key-decisions:
  - "Capture facts use product-mode and quantity-state discriminants at the persistence boundary."
  - "Corrections append a physical observation and replace only the current snapshot."
  - "Expo SQLite is local durability only; no outbox, remote sync, or task workflow is introduced."
patterns-established:
  - "Create mobile repositories behind a port with injected clock and identifier generator so tests stay deterministic."
  - "Parse capture inputs before every local write and use SQLite bind parameters for every value."
requirements-completed: [CAT-01, CAT-02, LOC-03]
duration: 11 min
completed: 2026-06-19
status: complete
---

# Phase 03 Plan 01: Runtime-validated capture ledger Summary

**Mode-aware Zod contracts and an Expo SQLite ledger now preserve fictitious product, lot, and physical-observation facts on the device without claiming offline synchronization.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-19T16:27:00Z
- **Completed:** 2026-06-19T16:38:30Z
- **Tasks:** 2/2 complete
- **Files modified:** 13

## Accomplishments

- Defined strict product, lot identity, location, and physical-observation schemas using Phase 2 domain discriminants.
- Added the Expo-compatible SQLite dependency and an idempotent local schema for products, lots, observations, and their indexed current snapshots.
- Added a deterministic memory repository and tests that prove generated internal lot IDs, correction history, snapshot updates, and explicit quantity uncertainty.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define mode-aware capture contracts at the mobile persistence boundary** - `4b98d70` (feat)
2. **Task 2: Implement the append-only SQLite capture ledger and deterministic test adapter** - `62f1dfd` (feat)

## Files Created/Modified

- `packages/contracts/src/capture.ts` - Zod schemas and inferred types for all mobile capture facts.
- `apps/mobile/src/capture/repository.ts` - Repository port, parsed input helpers, and read models.
- `apps/mobile/src/capture/memory-repository.ts` - Deterministic adapter used by native-free tests.
- `apps/mobile/src/capture/sqlite-repository.ts` - Parameterized, indexed Expo SQLite ledger and snapshot updates.
- `apps/mobile/src/capture/*.test.ts` - Fictitious contract and repository behavior coverage.
- `apps/mobile/app.json` - Expo SQLite config plugin registered by the compatibility installer.

## Decisions Made

- Used a product-mode discriminated lot union so mandatory validity, inspection, and receiving data cannot disappear into optional fields.
- Made lot identity source explicit (`printed` or `generated_internal`) to prevent an internal ID from masquerading as supplier data.
- Kept local durability separate from Phase 7 sync work: no remote API, outbox, retry queue, or conflict resolver exists in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the Expo SQLite config plugin**

- **Found during:** Task 1 (dependency installation)
- **Issue:** The required Expo compatibility installer added `expo-sqlite` and its necessary native config-plugin entry to `apps/mobile/app.json`.
- **Fix:** Kept the generated plugin entry with the dependency so native builds can include the installed module.
- **Files modified:** `apps/mobile/app.json`, `apps/mobile/package.json`, `pnpm-lock.yaml`
- **Verification:** Mobile and contracts typechecks, focused tests, and lint pass.
- **Committed in:** `4b98d70`

**2. [Rule 1 - Bug] Excluded generated Worker bundles from source linting**

- **Found during:** Task 2 (repository verification)
- **Issue:** Local Wrangler build artifacts under `apps/api/.wrangler/` were treated as authored TypeScript/JavaScript and made the repository lint gate fail.
- **Fix:** Added the generated directory to ESLint ignores; authored source remains type-aware linted.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm.cmd lint` passes with the mobile repository included.
- **Committed in:** `62f1dfd`

---

**Total deviations:** 2 auto-fixed (1 dependency integration, 1 generated-artifact lint guard).
**Impact on plan:** Both changes were required to make the planned Expo dependency and mandated lint gate work; neither expands product scope.

## Issues Encountered

None - all validation gates passed after the generated-artifact lint guard was added.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- capture-contract` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- capture-repository` - passed
- `pnpm.cmd --filter @validade-zero/contracts typecheck` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed
- `pnpm.cmd lint` - passed

## Self-Check: PASSED

The capture contracts, memory adapter, and SQLite implementation exist; every required repository operation is present; all task acceptance checks and plan verification commands pass.

## Next Phase Readiness

The manual product-discovery and lot-registration UI can now create validated products and persist mode-aware lots using the local repository. The next plan must keep barcode lookup optional and retain manual confirmation before any lot form opens.

---
*Phase: 03-mobile-lot-capture*
*Plan: 01*
*Completed: 2026-06-19*
