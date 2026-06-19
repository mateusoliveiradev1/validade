---
phase: 02-domain-and-risk-core
plan: "03"
subsystem: domain
tags: [presence, risk-engine, operational-command, uncertainty, vitest]
requires:
  - phase: 02-domain-and-risk-core
    provides: Formal-validity and FLV risk-window engine from plan 02-02
provides:
  - Physical confirmation status vocabulary and freshness helper
  - Recency-aware `calculateLotRisk` uncertainty for stale or missing physical confirmation
  - Operational command coverage for monitor, request_markdown, withdraw_now, check_presence, and correct_data
  - Conditional resolution traceability for `not_found` and `probably_sold_out`
affects: [phase-02, phase-03, phase-04, phase-08, task-generation, audit]
tech-stack:
  added: []
  patterns:
    - Presence recency uses explicit timestamps and profile max-age configuration.
    - Stale or missing physical confirmation returns blocking `uncertain` with `check_presence`.
    - Conditional physical resolutions add structured reasons without creating workflows or persistence.
key-files:
  created:
    - packages/domain/src/presence.ts
    - packages/domain/src/presence.test.ts
    - packages/domain/src/commands.test.ts
  modified:
    - eslint.config.mjs
    - packages/domain/src/index.ts
    - packages/domain/src/types.ts
    - packages/domain/src/types.test.ts
    - packages/domain/src/profiles.ts
    - packages/domain/src/risk.ts
    - packages/domain/src/risk.test.ts
key-decisions:
  - "Use concrete physical statuses only: present, moved, withdrawn, loss, not_found, and probably_sold_out."
  - "Apply stale/missing presence as a blocking uncertainty only after a concrete risky state is calculated."
  - "Represent not_found and probably_sold_out as conditional traceability through `presence_conditionally_resolved`."
patterns-established:
  - "Presence freshness is profile-driven through `maxPhysicalConfirmationAgeHours`."
  - "Operational command mapping is tested through real domain scenarios rather than a separate lookup table."
requirements-completed: [LOC-04, RSK-01]
duration: 6min
completed: 2026-06-19
status: complete
---

# Phase 02 Plan 03: Physical Presence Uncertainty and Operational Commands Summary

**Recency-aware domain risk with concrete physical confirmations and operational command coverage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-19T09:58:20-03:00
- **Completed:** 2026-06-19T10:04:08-03:00
- **Tasks:** 3 completed
- **Files modified:** 10

## Accomplishments

- Added physical confirmation status vocabulary and freshness classification helpers.
- Added `maxPhysicalConfirmationAgeHours` to category and product profile resolution.
- Integrated stale and missing physical confirmation into `calculateLotRisk` as blocking `uncertain` with `check_presence`.
- Added command-focused tests proving every minimum operational command appears from a real domain scenario.
- Added conditional traceability for `not_found` and `probably_sold_out` without creating tasks, audit persistence, notifications, UI, or API routes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Model concrete physical confirmations and recency profiles** - `98b9b1d` (feat)
2. **Task 2: Integrate stale-presence uncertainty into risk calculation** - `5358b30` (feat)
3. **Task 3: Map every state to operational commands and conditional resolutions** - `a54e2f0` (feat)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `eslint.config.mjs` - Allows `presence.test.ts` and `commands.test.ts` in the typed lint project service.
- `packages/domain/src/index.ts` - Re-exports the presence module.
- `packages/domain/src/types.ts` - Adds presence-related reason codes and max physical confirmation recency profile fields.
- `packages/domain/src/types.test.ts` - Updates reason-code vocabulary expectations.
- `packages/domain/src/profiles.ts` - Resolves category/product `maxPhysicalConfirmationAgeHours` without mutation.
- `packages/domain/src/presence.ts` - Defines physical confirmation statuses and freshness classification.
- `packages/domain/src/presence.test.ts` - Covers status vocabulary, approximate quantity, stale recency, and profile overrides.
- `packages/domain/src/risk.ts` - Applies presence freshness to concrete risky states and conditional resolutions.
- `packages/domain/src/risk.test.ts` - Covers stale/missing physical confirmation and explicit-clock behavior.
- `packages/domain/src/commands.test.ts` - Covers every minimum operational command and conditional presence semantics.

## Decisions Made

- Kept freshness calculation pure by requiring `currentTimestamp` as input.
- Used `presence_missing`, `presence_stale`, and `presence_conditionally_resolved` as structured reason codes for future audit/task layers.
- Let conditional physical outcomes preserve the calculated risk while marking traceability, rather than pretending the lot is permanently safe.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep; no task persistence, audit events, push messages, API routes, or UI files were introduced.

## Issues Encountered

- `exactOptionalPropertyTypes` rejected passing `confirmation: undefined`; the risk engine now omits that optional property when no confirmation exists.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- presence` - passed, 5 files / 34 tests.
- `pnpm.cmd --filter @validade-zero/domain test -- command` - passed, 5 files / 34 tests.
- `pnpm.cmd --filter @validade-zero/domain test` - passed, 5 files / 34 tests.
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed.

## Self-Check: PASSED

- Key files listed in summary exist on disk.
- Commits for `02-03` are present in git history.
- Stale and missing physical confirmation return `uncertain`, `check_presence`, and structured presence reason codes.
- `not_found` and `probably_sold_out` return conditional traceability instead of erasing risk history.
- No persistence, UI, API, push, audit, provider, database, or adapter implementation was added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The risk engine now has recency-aware presence semantics and command coverage for `02-04`, which can harden the scenario matrix, mutation readiness, and boundary verification.

---
*Phase: 02-domain-and-risk-core*
*Completed: 2026-06-19*
