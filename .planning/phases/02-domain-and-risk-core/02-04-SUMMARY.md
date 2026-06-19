---
phase: 02-domain-and-risk-core
plan: "04"
subsystem: testing
tags: [scenario-matrix, mutation, stryker, boundary-check, domain]
requires:
  - phase: 02-domain-and-risk-core
    provides: Completed domain risk engine, presence uncertainty, and command mapping from plans 02-01 through 02-03
provides:
  - Phase 2 requirement and decision scenario matrix
  - Testing strategy documentation for domain rules and mutation readiness
  - Working Stryker Vitest runner configuration
  - Full final verification evidence for domain tests, typecheck, lint, mutation, and `pnpm check`
affects: [phase-02, phase-03, testing, ci, mutation-readiness]
tech-stack:
  added: []
  patterns:
    - Scenario matrices cite requirements/decisions in test labels.
    - Stryker must explicitly load `@stryker-mutator/vitest-runner`.
    - Generated `.stryker-tmp/` artifacts are ignored by Git and ESLint.
key-files:
  created:
    - packages/domain/src/risk.scenarios.test.ts
    - .planning/phases/02-domain-and-risk-core/02-04-SUMMARY.md
  modified:
    - .gitignore
    - eslint.config.mjs
    - stryker.config.json
    - docs/testing/strategy.md
    - packages/domain/src/types.ts
    - packages/domain/src/types.test.ts
    - packages/domain/src/profiles.test.ts
    - packages/domain/src/presence.test.ts
patterns-established:
  - "Phase-level scenario tests use structured `state`, `command`, and reason-code assertions instead of UI copy."
  - "Mutation output is accepted only with the exact command result recorded, including surviving mutants."
  - "Full `pnpm check` is run after mutation because Stryker leaves generated sandbox artifacts."
key-decisions:
  - "Fix Stryker config by explicitly loading `@stryker-mutator/vitest-runner` rather than treating mutation as unavailable."
  - "Ignore `.stryker-tmp/` in Git and ESLint because mutation creates instrumented sandbox files that must not affect normal lint/check gates."
requirements-completed: [CAT-04, LOC-04, RSK-01, RSK-02]
duration: 5min
completed: 2026-06-19
status: complete
---

# Phase 02 Plan 04: Scenario Matrix, Mutation Readiness, and Boundary Verification Summary

**Phase 2 domain scenario matrix with mutation-ready Stryker execution and full quality-gate evidence**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-19T10:05:20-03:00
- **Completed:** 2026-06-19T10:10:22-03:00
- **Tasks:** 3 completed
- **Files modified:** 8

## Accomplishments

- Added a table-driven Phase 2 scenario matrix covering CAT-04, LOC-04, RSK-01, RSK-02, D-07, and D-13.
- Updated testing docs to describe the domain test command and Stryker mutation surface honestly.
- Fixed Stryker plugin loading so `pnpm test:mutation` runs with the Vitest runner.
- Added `.stryker-tmp/` ignores so generated mutation sandboxes do not break normal lint/check workflows.
- Ran and recorded final domain, mutation, lint, and full-suite verification.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a Phase 2 decision and requirement scenario matrix** - `741f3a2` (test)
2. **Task 2: Update testing docs for Phase 2 domain rules and mutation** - `2e2fe63` (docs)
3. **Task 3: Run final domain, mutation, boundary, and full-suite verification** - `2679700` (chore)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `packages/domain/src/risk.scenarios.test.ts` - Scenario matrix for Phase 2 decisions and requirements.
- `docs/testing/strategy.md` - Adds Phase 2 domain and mutation verification guidance.
- `stryker.config.json` - Loads `@stryker-mutator/vitest-runner` explicitly.
- `.gitignore` - Ignores `.stryker-tmp/` generated mutation sandboxes.
- `eslint.config.mjs` - Ignores `.stryker-tmp/**` and allows the scenario test file in typed lint.
- `packages/domain/src/types.ts` - Prettier formatting only.
- `packages/domain/src/types.test.ts` - Prettier formatting only.
- `packages/domain/src/profiles.test.ts` - Prettier formatting only.
- `packages/domain/src/presence.test.ts` - Prettier formatting only.

## Decisions Made

- Treated the first Stryker failure as a tooling gap and fixed config because the runner dependency was already installed.
- Kept mutation thresholds unchanged at zero and recorded the actual score/survivors instead of overstating mutation quality.
- Used the filtered Windows-friendly command `pnpm.cmd test --project domain` in addition to the literal planned command, because `pnpm.cmd test -- --project domain` forwards the separator literally on this shell.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stryker Vitest runner installed but not loaded**
- **Found during:** Task 3 (final mutation verification)
- **Issue:** `pnpm test:mutation` failed with `Cannot find TestRunner plugin "vitest"` and warned that the `vitest` config option was unknown.
- **Fix:** Added `"plugins": ["@stryker-mutator/vitest-runner"]` to `stryker.config.json`.
- **Files modified:** `stryker.config.json`
- **Verification:** `pnpm.cmd test:mutation` completed successfully after the config fix.
- **Committed in:** `2679700`

**2. [Rule 3 - Blocking] Stryker sandbox broke normal lint/check gates**
- **Found during:** Task 3 (`pnpm check`)
- **Issue:** `.stryker-tmp/` generated instrumented files with `@ts-nocheck` and long nested paths; ESLint tried to parse them.
- **Fix:** Added `.stryker-tmp/` to `.gitignore` and `**/.stryker-tmp/**` to ESLint ignores.
- **Files modified:** `.gitignore`, `eslint.config.mjs`
- **Verification:** `pnpm.cmd check` passed after the ignore fix.
- **Committed in:** `2679700`

---

**Total deviations:** 2 auto-fixed (2 blocking/tooling).
**Impact on plan:** Both fixes support the planned verification surface; no product scope or runtime behavior changed.

## Issues Encountered

- `pnpm.cmd test -- --project domain` passed but ran the full suite on Windows because the extra `--` was forwarded literally. `pnpm.cmd test --project domain` was run afterward and passed the filtered domain suite.
- Mutation completed with surviving mutants. Thresholds are currently zero, so this is not blocking, but future hardening should review survivors in critical domain branches.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- scenarios` - passed, 6 files / 48 tests.
- `pnpm.cmd --filter @validade-zero/domain test` - passed, 6 files / 48 tests.
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed.
- `pnpm.cmd test -- --project domain` - passed, 11 files / 57 tests, but executed the full suite due Windows argument forwarding.
- `pnpm.cmd test --project domain` - passed, 6 files / 48 tests.
- `pnpm.cmd lint` - passed, including dependency boundary check for 27 source files.
- `pnpm.cmd test:mutation` - passed after config fix: 253 mutants, total score 73.91%, domain score 82.38%, 187 killed, 42 survived, 24 no coverage, threshold 0.
- `pnpm.cmd check` - passed after formatting and `.stryker-tmp/` ignore fixes.

## Self-Check: PASSED

- Key files listed in summary exist on disk.
- Commits for `02-04` are present in git history.
- Scenario labels include CAT-04, LOC-04, RSK-01, RSK-02, D-07, and D-13.
- Domain boundary verification passed with no UI, app, provider, database, or adapter imports.
- Mutation command result and survivors were recorded explicitly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 2 domain rules are ready for phase-level verification and then Phase 3 mobile lot capture can consume the tested domain vocabulary, risk states, commands, and presence semantics.

---
*Phase: 02-domain-and-risk-core*
*Completed: 2026-06-19*
