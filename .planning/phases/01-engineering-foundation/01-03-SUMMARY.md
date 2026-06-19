---
phase: 01-engineering-foundation
plan: "03"
subsystem: quality
tags: [eslint, prettier, secretlint, env, boundaries, security]
requires:
  - phase: 01-engineering-foundation
    provides: App and package skeletons from 01-01 and 01-02
provides:
  - Typed ESLint gate with project service
  - Prettier format gate
  - Dependency-boundary scanner
  - Safe `.env.example` parser and validation tests
  - Secretlint and real-data safety scripts
affects: [phase-01, ci, security, packages, apps]
tech-stack:
  added: [eslint, typescript-eslint, prettier, secretlint]
  patterns:
    - Runtime tsconfigs exclude tests; Vitest owns test compilation.
    - Root quality scripts are blocking gates.
    - Public repo safety checks avoid live-looking provider examples.
key-files:
  created:
    - eslint.config.mjs
    - prettier.config.cjs
    - .prettierignore
    - .gitignore
    - .env.example
    - .secretlintrc.json
    - scripts/check-boundaries.mjs
    - scripts/check-env-example.mjs
    - scripts/check-no-real-data.mjs
    - packages/config/src/index.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - packages/config/src/index.ts
    - packages/config/tsconfig.json
    - packages/adapters/src/index.ts
key-decisions:
  - "Use pnpm-workspace.yaml onlyBuiltDependencies plus approve-builds for native tool dependencies."
  - "Represent NEON_DATABASE_URL as a non-URL placeholder in .env.example so secret scanners do not accept connection-string-shaped examples."
patterns-established:
  - "Root `pnpm lint` runs ESLint plus dependency boundary validation."
  - "Root `pnpm security` runs env, secret, data, and package-level security gates."
requirements-completed: [FND-02, FND-03, FND-04, AUD-04]
duration: 10min
completed: 2026-06-19
status: complete
---

# Phase 01 Plan 03: Strict Typing, Linting, Env Safety, and Repo Guards Summary

**Blocking quality and public-repo safety gates for lint, format, env examples, secrets, and dependency boundaries**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-19T00:23:40-03:00
- **Completed:** 2026-06-19T00:33:41-03:00
- **Tasks:** 2 completed
- **Files modified:** 13

## Accomplishments

- Added ESLint flat config with typescript-eslint project service and `no-explicit-any` enforcement.
- Added a custom dependency-boundary scanner that protects `packages/domain` from app, UI, provider, database, and adapter imports.
- Added Prettier config and ignore coverage for generated outputs, GSD internals, and dependencies.
- Added `.gitignore` coverage for env files, generated output, mobile/native caches, test reports, and evidence/media artifacts.
- Added `.env.example`, config parser tests, Secretlint config, env parity check, and real-data safety scanner.
- Wired root scripts for `lint`, `format:check`, `security:env`, `security:secrets`, `security:data`, and aggregate `security`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add typed linting, formatting, and dependency boundaries** - `d033650` (feat)
2. **Task 2 RED: Add environment validation and public-repo safety checks** - `3cdc8c7` (test)
3. **Task 2 GREEN: Add environment validation and public-repo safety checks** - `51be425` (feat)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `eslint.config.mjs` - Type-aware lint config, no-explicit-any gate, test override, and domain import restrictions.
- `scripts/check-boundaries.mjs` - Path-aware import scanner for app/package boundaries.
- `prettier.config.cjs` and `.prettierignore` - Formatting contract and generated-output ignores.
- `.gitignore` - Env, cache, report, native, and evidence/media protections.
- `.env.example` - Fake-only environment contract.
- `.secretlintrc.json` - Secretlint recommended rule preset.
- `scripts/check-env-example.mjs` - Required env key and fake-value validation.
- `scripts/check-no-real-data.mjs` - Secret-like and real operational data marker scanner.
- `packages/config/src/index.ts` - Env example schema and parser.
- `packages/config/src/index.test.ts` - Tests for safe `.env.example` parsing and missing required keys.

## Decisions Made

- Kept tests out of runtime typechecks so app/package typecheck gates focus on production source while Vitest validates test files.
- Used a custom boundary script in addition to ESLint restrictions because path-aware monorepo rules are clearer and easier to audit.
- Changed `NEON_DATABASE_URL` in `.env.example` from a fake Postgres URL to `NEON_DATABASE_URL_EXAMPLE_INVALID`; Secretlint correctly flagged URL-shaped examples as risky.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scoped ESLint project service and test rules**
- **Found during:** Task 1 verification
- **Issue:** Type-aware ESLint initially tried to lint config/test files that were intentionally outside runtime tsconfigs.
- **Fix:** Added `allowDefaultProject` entries and relaxed unsafe rules only for `.test.*` files.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm.cmd lint` passed.
- **Committed in:** `d033650`, `51be425`

**2. [Rule 3 - Blocking] Removed connection-string-shaped env example**
- **Found during:** Task 2 verification
- **Issue:** Secretlint flagged the fake Neon Postgres URL in `.env.example`.
- **Fix:** Replaced it with a non-URL placeholder and updated config parser/test expectations.
- **Files modified:** `.env.example`, `packages/config/src/index.ts`, `packages/config/src/index.test.ts`
- **Verification:** `pnpm.cmd security:secrets` and `pnpm.cmd --filter @validade-zero/config test` passed.
- **Committed in:** `51be425`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both changes strengthen the intended public-repo safety gates and avoid loosening runtime checks.

## Issues Encountered

- `prettier --write` cannot infer parsers for `.env.example` and `.gitignore` when passed explicitly; root `format:check` handles supported files through `.prettierignore`.
- Secretlint treats PostgreSQL connection strings as secrets even when fake, so examples should avoid connection-string shape.

## Verification

- `pnpm.cmd typecheck` - passed.
- `pnpm.cmd lint` - passed.
- `pnpm.cmd format:check` - passed.
- `pnpm.cmd --filter @validade-zero/config test` - passed.
- `pnpm.cmd security:secrets` - passed.
- `pnpm.cmd security:data` - passed.
- `pnpm.cmd security` - passed.

## Self-Check: PASSED

- Key files listed in summary exist on disk.
- Commits for `01-03` are present in git history.
- Boundary scanner reports success across current source files.
- `.env.example` contains only fake placeholders and no live-looking provider connection string.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Quality and safety gates are ready for `01-04`, which can formalize the testing pyramid, fixtures, Playwright smoke, Maestro smoke, and mutation-test configuration.

---
*Phase: 01-engineering-foundation*
*Completed: 2026-06-19*
