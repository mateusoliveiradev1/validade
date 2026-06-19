---
phase: 02-domain-and-risk-core
plan: "02"
subsystem: domain
tags: [risk-engine, vitest, formal-validity, flv, rule-profile]
requires:
  - phase: 02-domain-and-risk-core
    provides: Domain test harness, product modes, rule profiles, and default risk windows from plan 02-01
provides:
  - Pure `calculateLotRisk` risk-window engine
  - Formal-validity risk states for safe, radar, markdown_due, critical, and expired windows
  - FLV quality-window risk states from direct due dates or received-date plus quality window
  - Missing-data uncertainty with `correct_data` command and structured reason codes
  - Product override behavior for configurable risk windows
affects: [phase-02, phase-03, phase-04, risk-engine, task-generation]
tech-stack:
  added: []
  patterns:
    - Risk calculations accept explicit current dates for deterministic tests.
    - Domain rules return state, command, and structured reasons without UI copy.
    - Product overrides flow through the shared profile resolver before calculation.
key-files:
  created:
    - packages/domain/src/risk.ts
    - packages/domain/src/risk.test.ts
  modified:
    - eslint.config.mjs
    - packages/domain/src/index.ts
    - packages/domain/src/types.ts
    - packages/domain/src/types.test.ts
key-decisions:
  - "Use `expiresAt`, `receivedAt`, and `qualityInspectionDueAt` as risk-engine date field names for ISO-date inputs."
  - "Treat date equality as not expired: a lot due today is critical, while dates before the current date are expired."
  - "Use existing structured reason codes for FLV quality-window results until future UI copy maps them to Portuguese labels."
patterns-established:
  - "Risk results are pure objects with `state`, `command`, and `reasons`."
  - "Window evaluation is shared between formal validity and FLV due-date calculations."
  - "Missing essential data returns `uncertain` instead of throwing or silently marking safe."
requirements-completed: [CAT-04, RSK-01, RSK-02]
duration: 5min
completed: 2026-06-19
status: complete
---

# Phase 02 Plan 02: Formal-Validity and FLV Risk-Window Engine Summary

**Pure domain risk engine for formal expiry, FLV quality windows, uncertainty, and product overrides**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-19T09:53:30-03:00
- **Completed:** 2026-06-19T09:58:16-03:00
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added `calculateLotRisk` and `compareRiskSeverity` in the pure domain package.
- Covered formal-validity windows for safe, radar, markdown_due, critical, expired, and due-today behavior.
- Added FLV quality-window support from `qualityInspectionDueAt` or `receivedAt` plus `qualityWindowDays`.
- Added uncertainty handling for missing formal expiry and missing FLV quality-window inputs.
- Proved expired state dominates markdown/lower states and product-level `markdownDays` overrides category defaults without mutation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add TDD coverage for formal-validity risk windows** - `ccce21c` (feat)
2. **Task 2: Add FLV quality-window and missing-data uncertainty rules** - `d1252f7` (feat)
3. **Task 3: Prove severity precedence and product override behavior** - `abd1e14` (test)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `eslint.config.mjs` - Allows `packages/domain/src/risk.test.ts` in the typed lint project service.
- `packages/domain/src/index.ts` - Re-exports the risk engine from the public domain boundary.
- `packages/domain/src/types.ts` - Adds optional `qualityWindowDays` profile support and aligns lot date names to `expiresAt`/`receivedAt`.
- `packages/domain/src/types.test.ts` - Updates vocabulary tests for the aligned date-field names.
- `packages/domain/src/risk.ts` - Implements pure window risk calculation, FLV quality due-date derivation, uncertainty, and severity comparison.
- `packages/domain/src/risk.test.ts` - Covers formal windows, FLV windows, missing data, precedence, and product overrides.

## Decisions Made

- Used explicit ISO date-only strings and injected `currentDate` instead of reading the system clock.
- Kept `uncertain` as a normal domain result for missing required data so future task flows can direct correction.
- Reused the same window evaluator for formal expiry and FLV quality due dates to keep severity behavior consistent.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep; implementation stayed in `packages/domain` and remained provider/UI/database-free.

## Issues Encountered

None.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- risk` - passed, 3 files / 19 tests.
- `pnpm.cmd --filter @validade-zero/domain test` - passed, 3 files / 19 tests.
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed.
- `pnpm.cmd lint` - passed, including dependency boundary check for 23 source files.

## Self-Check: PASSED

- Key files listed in summary exist on disk.
- Commits for `02-02` are present in git history.
- Tests include the explicit current date `2026-06-19`.
- Missing formal expiry and missing FLV quality-window inputs return `uncertain` with `correct_data`.
- No Zod, Hono, Drizzle, React, Expo, adapters, provider SDKs, app imports, or persistence dependencies were added to `packages/domain`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Risk-window calculation is ready for `02-03`, which can add physical-presence recency and operational command mapping on top of the existing result shape.

---
*Phase: 02-domain-and-risk-core*
*Completed: 2026-06-19*
