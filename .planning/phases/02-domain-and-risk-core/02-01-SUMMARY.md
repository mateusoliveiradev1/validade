---
phase: 02-domain-and-risk-core
plan: "01"
subsystem: domain
tags: [typescript, vitest, product-mode, rule-profile, domain]
requires:
  - phase: 01-engineering-foundation
    provides: pnpm/Turborepo workspace, strict TypeScript, Vitest baseline, and protected domain package boundary
provides:
  - Domain Vitest project wired into the root test matrix
  - Product-mode vocabulary for formal validity, FLV inspection, and receiving-monitored items
  - Default 60 / 15 / 3 / 0 rule windows and profile override resolution
  - Tested discriminated domain shapes for product and lot inputs
affects: [phase-02, phase-03, risk-engine, mobile-lot-capture]
tech-stack:
  added: []
  patterns:
    - Domain tests run as a named root Vitest project and through the package script.
    - Product and lot models use discriminated unions instead of ambiguous optional date bags.
    - Rule profile resolution merges category defaults with product overrides without mutating inputs.
key-files:
  created:
    - packages/domain/src/types.ts
    - packages/domain/src/profiles.ts
    - packages/domain/src/types.test.ts
    - packages/domain/src/profiles.test.ts
  modified:
    - vitest.config.ts
    - eslint.config.mjs
    - packages/domain/package.json
    - packages/domain/tsconfig.json
    - packages/domain/src/index.ts
    - pnpm-lock.yaml
key-decisions:
  - "Keep domain vocabulary as exported const arrays plus TypeScript unions so runtime tests and future UI/API code share stable identifiers."
  - "Keep the public domain boundary marker while replacing the Phase 1 placeholder status with active Phase 2 vocabulary exports."
patterns-established:
  - "Domain package test scripts call the root Vitest matrix with `--project domain`."
  - "Profile helpers return fresh merged objects rather than mutating category or product profile inputs."
requirements-completed: [CAT-04, LOC-04]
duration: 7min
completed: 2026-06-19
status: complete
---

# Phase 02 Plan 01: Domain Test Harness and Product/Rule Vocabulary Summary

**Domain Vitest harness with tested product-mode unions and category-first rule profiles**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-19T09:44:00-03:00
- **Completed:** 2026-06-19T09:51:01-03:00
- **Tasks:** 2 completed
- **Files modified:** 10

## Accomplishments

- Added the `domain` Vitest project to the root test matrix and replaced the placeholder domain package test script with a real command.
- Added stable exported product modes, risk states, operational commands, reason codes, product definitions, lot inputs, and risk assessment types.
- Added `DEFAULT_RISK_WINDOWS`, `DEFAULT_RULE_PROFILE`, and `resolveRuleProfile` with tests proving product overrides do not mutate category defaults.
- Preserved the pure domain boundary export while re-exporting the new public types and helpers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable real domain unit tests in the monorepo** - `ff47c00` (feat)
2. **Task 2: Define product modes, rule profiles, and missing-data vocabulary with tests first** - `f32d7ec` (feat)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `vitest.config.ts` - Adds the named `domain` test project rooted at `packages/domain`.
- `eslint.config.mjs` - Allows the two new domain test files in the typed lint project service.
- `packages/domain/package.json` - Replaces the placeholder test script and adds the local Vitest dev dependency.
- `packages/domain/tsconfig.json` - Excludes `src/**/*.test.ts` from build/typecheck output.
- `packages/domain/src/index.ts` - Preserves the domain boundary marker and re-exports public domain modules.
- `packages/domain/src/types.ts` - Defines product modes, risk states, commands, reason codes, rule profile shapes, product definitions, lot inputs, and risk assessment types.
- `packages/domain/src/profiles.ts` - Defines default risk windows, a default profile, and category/product profile resolution.
- `packages/domain/src/types.test.ts` - Proves the locked vocabulary and discriminated product/lot shapes.
- `packages/domain/src/profiles.test.ts` - Proves default windows and immutable product override resolution.
- `pnpm-lock.yaml` - Records the domain package's Vitest dev dependency metadata.

## Decisions Made

- Kept `PRODUCT_MODES`, `RISK_STATES`, `OPERATIONAL_COMMANDS`, and `RISK_REASON_CODES` as exported const arrays so tests can assert the runtime vocabulary exactly.
- Modeled formal-validity, FLV inspection, and receiving-monitored lots as discriminated unions with different required fields.
- Used `pnpm.cmd` for local verification because PowerShell blocks npm/pnpm `.ps1` shims on this machine.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep; implementation stayed inside the pure domain package boundary.

## Issues Encountered

- PowerShell blocks `pnpm.ps1`; verification used `pnpm.cmd`.
- `pnpm test -- --project domain` on this Windows shell forwarded the extra separator literally and ran the full suite. The explicit filtered equivalent `pnpm.cmd test --project domain` was run and passed.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test` - passed, 2 files / 6 tests.
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed.
- `pnpm.cmd test -- --project domain` - passed, but executed the full suite because of Windows argument forwarding.
- `pnpm.cmd test --project domain` - passed, 2 files / 6 tests.

## Self-Check: PASSED

- Key files listed in summary exist on disk.
- Commits for `02-01` are present in git history.
- Product modes include exactly `formal_validity`, `flv_inspection`, and `receiving_monitored`.
- Default risk windows are 60 / 15 / 3 / 0 days.
- No UI, database, provider, adapter, app, or persistence imports were added to `packages/domain`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The domain package now has a real test harness and stable product/rule vocabulary for `02-02`, which can implement formal-validity and FLV risk-window calculation on top of these types.

---
*Phase: 02-domain-and-risk-core*
*Completed: 2026-06-19*
