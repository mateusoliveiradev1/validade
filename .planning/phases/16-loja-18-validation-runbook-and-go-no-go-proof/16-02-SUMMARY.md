---
phase: 16-loja-18-validation-runbook-and-go-no-go-proof
plan: "02"
subsystem: api
tags: [command-center, uat, central-facts, shift-close]
requires:
  - phase: 16-loja-18-validation-runbook-and-go-no-go-proof
    provides: 16-01 validation contract safety
provides:
  - API derivation of Loja 18 UAT product, lot, terminal resolution, consistency, and safe-close states from central facts
  - Tests proving missing central facts fail closed to pending or blocked states
  - Tests proving shift close does not pass from no-active-task absence alone
affects: [phase-16, command-center-api, validacao]
tech-stack:
  added: []
  patterns: [central-runbook-facts, projection-derived-uat]
key-files:
  created:
    - .planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-02-SUMMARY.md
  modified:
    - apps/api/src/command-center.ts
    - apps/api/src/command-center.test.ts
key-decisions:
  - "Product, lot, and terminal-resolution UAT steps pass from their own central facts, not from a broad operational-facts boolean."
  - "Central blockers can block missing proof, but existing product/lot/resolution facts remain visible even when the store still has active blockers."
  - "Safe close remains blocked until explicit safe-close proof is wired; absence of active tasks is not enough."
patterns-established:
  - "derivePilotRunbookFacts isolates central proof inputs before building UAT rows."
  - "API tests inspect individual UAT steps rather than only aggregate Command Center state."
requirements-completed: ["VAL-01", "VAL-02", "VAL-03", "VAL-04"]
duration: 8min
completed: 2026-07-01
---

# Phase 16 Plan 02: Central Runbook Fact Summary

**Command Center validation rows now advance from specific central facts for product, lot, terminal resolution, consistency, and safe close.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-01T12:06:00Z
- **Completed:** 2026-07-01T12:14:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Replaced broad `hasOperationalFacts` UAT progression with `derivePilotRunbookFacts`.
- Made product, lot, and terminal-resolution UAT rows pass only from their corresponding central facts.
- Kept missing product/lot proof pending when no actionable central blocker exists.
- Blocked terminal resolution and Command Center consistency when active critical tasks or sync conflicts remain.
- Kept `shift_close` out of `passed` unless a future explicit safe-close proof is wired.

## Task Commits

1. **Tasks 1-3: Derive validation runbook from central facts** - `41f61be` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/api/src/command-center.ts` - Adds runbook fact derivation and central-proof UAT state rules.
- `apps/api/src/command-center.test.ts` - Adds focused API tests for product/lot pending states, active critical task blockers, sync consistency blockers, and safe-close proof boundaries.

## Decisions Made

- Product, lot, and resolved-history proof can pass even when central readiness is blocked by separate active work, because those facts are still real central facts.
- Command Center consistency remains stricter: conflicts and central blockers prevent it from passing.
- Safe close is intentionally conservative until Command Center receives an explicit accepted safe-close source.

## Deviations from Plan

None - plan executed as written. The pre-existing approved-build alignment from build `138` to `147` was preserved because it was already present in the same API files before this plan started and matches current release truth.

## Issues Encountered

- The local post-commit push hook still cannot push `main` because `origin/main` is ahead; commits remain local.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/api test` - passed, 12 files / 90 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 103 tests.
- `cmd /c pnpm.cmd security:evidence` - passed, 454 tracked text files scanned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `16-03`: external proof gates can build on the central runbook facts and blocker synthesis.

---
*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Completed: 2026-07-01*
