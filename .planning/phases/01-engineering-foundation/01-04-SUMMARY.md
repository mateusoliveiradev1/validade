---
phase: 01-engineering-foundation
plan: "04"
subsystem: testing
tags: [vitest, playwright, maestro, stryker, fixtures, smoke]
requires:
  - phase: 01-engineering-foundation
    provides: API, web, mobile, lint, env, secret, and data safety gates from 01-01 through 01-03
provides:
  - Root Vitest project matrix for package and app smoke tests
  - Playwright web smoke entrypoint
  - Maestro mobile smoke flow contract
  - Stryker mutation-testing entrypoint for future critical domain rules
  - Safe fictitious Portuguese-BR fixtures for future tests
  - Testing strategy documentation for CI-safe and local setup commands
affects: [phase-01, phase-02, tests, ci, fixtures, security]
tech-stack:
  added: [playwright, stryker, vitest-coverage-v8]
  patterns:
    - Root `pnpm test` owns the current Vitest project matrix.
    - `pnpm check` stays CI-safe and excludes browser/emulator/mutation commands that need local setup.
    - Test fixtures must be fictitious and explicitly marked before they enter the public repo.
key-files:
  created:
    - vitest.config.ts
    - playwright.config.ts
    - apps/web/e2e/smoke.spec.ts
    - .maestro/smoke.yaml
    - stryker.config.json
    - docs/testing/strategy.md
    - packages/test-utils/src/fixtures.ts
    - packages/test-utils/src/fixtures.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - turbo.json
    - packages/test-utils/src/index.ts
    - packages/test-utils/package.json
    - packages/test-utils/tsconfig.json
    - eslint.config.mjs
key-decisions:
  - "Keep `pnpm check` focused on deterministic CI-safe commands while documenting Playwright, Maestro, and Stryker as local or later-release gates."
  - "Set Stryker thresholds to zero in Phase 1 because mutation enforcement starts when critical domain rules exist in Phase 2."
  - "Require `FICTICIO` or `EXEMPLO` markers in operational fixture strings so public-repo examples cannot look like real store data."
patterns-established:
  - "Add future tests to the root Vitest project matrix instead of scattering incompatible runners."
  - "Extend `@validade-zero/test-utils` fixtures before introducing ad-hoc sample data."
requirements-completed: [FND-03, FND-04, AUD-04]
duration: 10min
completed: 2026-06-19
status: complete
---

# Phase 01 Plan 04: Test Pyramid, Safe Fixtures, and Smoke Coverage Summary

**Vitest, Playwright, Maestro, Stryker, and fictitious fixtures establish the Phase 1 testing baseline without fake business coverage**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-19T00:34:32-03:00
- **Completed:** 2026-06-19T00:44:32-03:00
- **Tasks:** 3 completed
- **Files modified:** 11

## Accomplishments

- Added a root Vitest project matrix for API, web, mobile, config, and test-utils tests.
- Wired `pnpm test`, `pnpm test:smoke`, and aggregate `pnpm check` around current CI-safe gates.
- Added Playwright, Maestro, and Stryker command surfaces without making browser, emulator, or mutation prerequisites mandatory for the baseline check.
- Added Portuguese-BR fictitious fixtures for store, user, product, lot, and evidence examples.
- Added fixture tests and data-safety coverage so future phases extend fake data instead of using real operational examples.
- Documented the testing pyramid, current command split, and future E2E matrix.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Vitest projects and smoke commands** - `a8b8373` (feat)
2. **Task 2: Add web E2E, mobile smoke, and mutation-ready entries** - `1d589b8` (feat)
3. **Task 3 RED: Add fictitious fixture tests** - `54bce5f` (test)
4. **Task 3 GREEN: Add safe fictitious fixtures** - `4cd938c` (feat)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `vitest.config.ts` - Root Vitest project matrix for current app and package tests.
- `playwright.config.ts` - Web smoke E2E configuration with Vite web server startup.
- `apps/web/e2e/smoke.spec.ts` - Web smoke check for the current Validade Zero surface and API verification copy.
- `.maestro/smoke.yaml` - Mobile smoke flow contract for Expo text currently shipped by the app.
- `stryker.config.json` - Mutation entrypoint reserved for future critical domain rules.
- `docs/testing/strategy.md` - CI-safe commands, local setup commands, future E2E matrix, and fixture rules.
- `packages/test-utils/src/fixtures.ts` - Store, user, product, lot, and evidence fixtures marked as fictitious.
- `packages/test-utils/src/fixtures.test.ts` - Fixture marker and data-safety regression tests.
- `packages/test-utils/src/index.ts` - Re-export for shared test fixtures.

## Decisions Made

- Kept the Phase 1 testing baseline honest: smoke and fixture safety only, no pretend coverage for unbuilt business flows.
- Kept browser, emulator, and mutation commands available but outside `pnpm check` until the required local setup and critical rules exist.
- Used explicit `FICTICIO` and `EXEMPLO` markers in every operational fixture string that could be mistaken for real data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Package-local Vitest scripts needed root config access**
- **Found during:** Task 1 verification
- **Issue:** Package scripts executed from package directories could not consistently find the root Vitest project config.
- **Fix:** Updated package test scripts to invoke Vitest from the monorepo root with the explicit root config.
- **Files modified:** package manifests for testable packages.
- **Verification:** `pnpm.cmd test` and `pnpm.cmd test:smoke` passed.
- **Committed in:** `a8b8373`

**2. [Rule 3 - Blocking] Type-aware ESLint needed one more default-project allowance**
- **Found during:** Task 3 verification
- **Issue:** The new fixture test lived outside runtime tsconfigs, as intended, but type-aware ESLint needed explicit allowance for that file.
- **Fix:** Added the fixture test to ESLint default-project allowances and raised the configured cap.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm.cmd lint` passed as part of `pnpm.cmd check`.
- **Committed in:** `4cd938c`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes preserve the intended test architecture and keep runtime tsconfigs separate from test compilation.

## Issues Encountered

- Stryker is present but not enforced yet because the repo does not have Phase 2 critical domain rules. The documentation and config make this explicit.
- Playwright and Maestro commands are intentionally setup-dependent and kept outside the deterministic `pnpm check` baseline.

## Verification

- `pnpm.cmd test` - passed.
- `pnpm.cmd test:smoke` - passed.
- `pnpm.cmd --filter @validade-zero/test-utils test` - passed.
- `pnpm.cmd security:data` - passed.
- `pnpm.cmd check` - passed.

## Self-Check: PASSED

- Summary key files exist on disk.
- Commits for `01-04` are present in git history.
- Root `pnpm check` validates typecheck, lint, format, unit tests, smoke tests, build, and security gates.
- Fixtures are fake-only and pass both unit and data-safety checks.

## User Setup Required

None for CI-safe baseline. Local Playwright browser install, Maestro device/emulator setup, and mutation runtime setup are documented for optional local runs.

## Next Phase Readiness

The repo now has a runnable quality and testing baseline for `01-05` to wire into CI, security documentation, README, and threat-model review.

---
*Phase: 01-engineering-foundation*
*Completed: 2026-06-19*
