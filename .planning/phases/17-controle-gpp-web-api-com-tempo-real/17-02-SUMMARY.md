---
phase: 17-controle-gpp-web-api-com-tempo-real
plan: "02"
subsystem: gpp-persistence-repository
tags: [gpp, database, drizzle, repository, idempotency, audit]
requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    plan: "01"
    provides: GPP role, feature flag, and strict GPP contracts
provides:
  - Additive GPP Postgres schema and migration
  - Store-scoped avaria, movement, purchase, and mutation receipt tables
  - In-memory GPP repository for deterministic API tests
  - Neon/query-backed GPP repository adapter
  - Audit-ready GPP mutation result shape with previous/next public state
  - Zero-capable GPP balance quantities while keeping input quantities positive
affects: [phase-17, gpp-api, database, contracts, audit, authorization]
tech-stack:
  added: []
  patterns: [additive-migration, store-scoped-sql, idempotency-receipts, audit-ready-repository-results]
key-files:
  created:
    - packages/database/drizzle/0018_phase_17_gpp_control.sql
    - packages/database/src/gpp-repository.ts
    - .planning/phases/17-controle-gpp-web-api-com-tempo-real/17-02-SUMMARY.md
  modified:
    - packages/database/src/schema.ts
    - packages/database/src/schema.test.ts
    - packages/database/src/index.ts
    - packages/database/package.json
    - packages/database/src/membership-repository.ts
    - packages/database/src/repositories.test.ts
    - packages/contracts/src/gpp.ts
    - packages/contracts/src/gpp.test.ts
key-decisions:
  - "GPP persistence is additive: current mobile/capture/sync tables remain untouched except safe enum expansion."
  - "Avaria is the central GPP fact; movements consume saldo and compras internas remain a separate request model."
  - "Repository mutation results return audit context instead of appending audit events directly."
  - "Balances may reach zero after baixa, but movement/input quantities remain strictly positive."
patterns-established:
  - "Every SQL GPP path uses store predicates and checks idempotency receipts before mutation."
  - "Lifecycle transitions reject movement above saldo, direct edit after baixa, and baixa of unresolved divergences."
  - "Replayed mutations return the original mutation response with `replayed: true`."
requirements-completed: ["GPP-02", "GPP-03", "GPP-05"]
duration: 22min
completed: 2026-07-02
---

# Phase 17 Plan 02: GPP Persistence And Repository Summary

**GPP now has additive central persistence plus deterministic repository behavior for API wiring.**

## Performance

- **Duration:** 22 min
- **Completed:** 2026-07-02
- **Tasks:** 4
- **Files modified:** 10 before this summary

## Accomplishments

- Added migration `0018_phase_17_gpp_control.sql` with GPP enum values, avaria entries, linked movements, purchase requests, mutation receipts, store indexes, status indexes, product-code indexes, and idempotency uniqueness.
- Added Drizzle schema coverage for GPP tables and safety tests proving the migration does not rewrite current central lot or sync command tables.
- Implemented `GppRepository`, `createInMemoryGppRepository`, `createGppRepositoryFromQuery`, and `createNeonGppRepository`.
- Added central saldo calculation and lifecycle protections for movement, divergence, correction/review, baixa, cancel, estorno, and administrative correction.
- Kept compras internas separate from avaria queue behavior and status tables.
- Added audit-ready mutation results containing target, action, summary, previous/next public state, sector/product details, idempotency key, and replay state.
- Updated contracts so `balanceQuantity` and `remainingBalance` may be zero after baixa without allowing zero movement quantities.

## Task Commits

1. **Task 1: Add additive Drizzle schema and migration** - `ea37f95a` (feat)
2. **Tasks 2-4: Add GPP repository behavior, SQL adapter, and audit-ready mutation results** - `3cb89181` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `packages/database/drizzle/0018_phase_17_gpp_control.sql` - Additive SQL migration for GPP central tables, enums, indexes, comments, and idempotency receipts.
- `packages/database/src/schema.ts` - Adds GPP Drizzle enums/tables and extends role/audit enum source.
- `packages/database/src/schema.test.ts` - Verifies GPP table/index/migration safety.
- `packages/database/src/gpp-repository.ts` - Adds in-memory and SQL-backed GPP repository implementations.
- `packages/database/src/repositories.test.ts` - Covers grouping, saldo rejection, post-baixa edit rejection, purchase separation, SQL store predicates, idempotency ordering, and guarded updates.
- `packages/database/src/index.ts` and `packages/database/package.json` - Export the GPP repository.
- `packages/database/src/membership-repository.ts` - Allows persisted membership mutation receipts to hydrate the new `gpp` role.
- `packages/contracts/src/gpp.ts` and `packages/contracts/src/gpp.test.ts` - Split positive quantities from zero-capable balances.

## Decisions Made

- GPP queue groups are actionable records only; zero-balance finalized/admin records do not remain in the grouped queue projection.
- The database repository returns audit-ready facts but does not append audit events, preserving the existing API-owned audit pattern.
- The SQL adapter uses idempotency receipt lookup before mutation and stores replayable public mutation results.
- The repository package gets an explicit `./gpp-repository` export to match existing repository subpath conventions.

## Deviations from Plan

- Tasks 2, 3, and 4 were committed together because the repository interface, SQL adapter, and audit-ready result shape share the same exported types and tests.
- `packages/contracts/src/gpp.ts` was also updated in this plan to represent zero remaining balances after baixa correctly.
- `packages/database/drizzle/meta/_journal.json` was not changed because the migration was handwritten and no Drizzle snapshot metadata was generated in this repository pattern.

## Issues Encountered

- Baixa exposed a contract gap: `remainingBalance` and `balanceQuantity` need to allow zero while operational quantities stay positive.
- Queue grouping initially included an administrative zero-balance avaria; the projection now filters grouped queue entries to positive saldo.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/database test` - passed, 2 files / 62 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/database typecheck` - passed.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 12 files / 113 tests.
- `cmd /c pnpm.cmd exec prettier --check packages/contracts/src/gpp.ts packages/contracts/src/gpp.test.ts packages/database/package.json packages/database/src/index.ts packages/database/src/membership-repository.ts packages/database/src/repositories.test.ts packages/database/src/gpp-repository.ts` - passed.

## User Setup Required

None.

## Next Phase Readiness

Plan 17-03 can wire API routes against the exported GPP repository with central lifecycle enforcement, store-scoped SQL behavior, and audit-ready mutation results already available.

---
*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Completed: 2026-07-02*
