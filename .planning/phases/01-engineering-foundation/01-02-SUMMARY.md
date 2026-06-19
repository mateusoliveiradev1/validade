---
phase: 01-engineering-foundation
plan: "02"
subsystem: apps
tags: [hono, cloudflare-workers, vite, react, expo, react-native, vitest]
requires:
  - phase: 01-engineering-foundation
    provides: Root workspace and shared package boundaries from 01-01
provides:
  - Hono API smoke with `/health` and `/probe`
  - Vite React web smoke surface with `/health` proxy expectation
  - Expo React Native mobile smoke surface with safe copy
  - App-level smoke tests for API, web, and mobile
affects: [phase-01, phase-03, phase-04, api, web, mobile]
tech-stack:
  added: [hono, wrangler, vitest, vite, react, react-dom, expo, react-native, react-test-renderer]
  patterns:
    - Apps consume shared contracts instead of duplicating API payload shapes.
    - API writes probe state through a fake provider adapter instead of live credentials.
    - Smoke UI copy is Portuguese-BR and explicitly public-repo safe.
key-files:
  created:
    - apps/api/src/index.ts
    - apps/api/src/index.test.ts
    - apps/api/wrangler.toml
    - apps/web/src/App.tsx
    - apps/web/src/App.test.tsx
    - apps/web/vite.config.ts
    - apps/mobile/App.tsx
    - apps/mobile/src/App.test.tsx
    - apps/mobile/app.json
  modified:
    - packages/contracts/src/index.ts
    - pnpm-lock.yaml
key-decisions:
  - "Keep API probe state in the in-memory fake adapter for Phase 1; live Neon/Cloudflare/R2/Expo credentials remain out of scope."
  - "Keep app typechecks focused on runtime source while Vitest owns test compilation."
patterns-established:
  - "Hono app is exported as the default Worker-compatible API entrypoint."
  - "Web smoke verifies `/health` through fetch and shared Zod contract parsing."
  - "Mobile smoke imports shared contract vocabulary without introducing camera, push, offline, or lot flows."
requirements-completed: [FND-01, FND-02, FND-04]
duration: 7min
completed: 2026-06-19
status: complete
---

# Phase 01 Plan 02: API, Web, and Mobile Smoke Skeleton Summary

**Hono, Vite React, and Expo smoke surfaces wired through shared contracts and fake adapters**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-19T00:16:30-03:00
- **Completed:** 2026-06-19T00:23:29-03:00
- **Tasks:** 3 completed
- **Files modified:** 22

## Accomplishments

- Added `@validade-zero/api` with Hono routes for `GET /health`, `GET /probe`, and `POST /probe`.
- Added API tests that verify valid health, valid probe write/read, invalid probe handling, and no secret-like response strings.
- Added `@validade-zero/web` with Vite React smoke copy, `/health` dev proxy, and a fetch-driven `Verificar API` interaction test.
- Added `@validade-zero/mobile` with Expo app metadata, safe Portuguese-BR smoke copy, and a React Native render smoke test.
- Added shared `HEALTH_SERVICE_NAME` contract vocabulary consumed by API and mobile.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Build the Hono API smoke and safe probe contract path** - `5d87aa8` (test)
2. **Task 1 GREEN: Build the Hono API smoke and safe probe contract path** - `d2b3b55` (feat)
3. **Task 2: Build the Vite web smoke surface wired to API expectations** - `15ba600` (feat)
4. **Task 3: Build the Expo mobile smoke surface** - `9a05c01` (feat)
5. **Follow-up stabilization for app typechecks** - `bccfbde` (fix)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `apps/api/src/index.ts` - Hono app with safe health and probe endpoints.
- `apps/api/src/index.test.ts` - Vitest coverage for health, valid probe, invalid probe, and response safety.
- `apps/api/wrangler.toml` - Local Worker config with no real account IDs, tokens, URLs, or bucket names.
- `apps/web/src/App.tsx` - Engineering smoke surface with `Validade Zero`, `Ambiente seguro para desenvolvimento`, and `Verificar API`.
- `apps/web/vite.config.ts` - Vite React config and local `/health`/`/probe` proxy target.
- `apps/web/src/App.test.tsx` - Fetch-mocked UI test for API status rendering.
- `apps/mobile/App.tsx` - Expo smoke screen with required safe copy.
- `apps/mobile/app.json` - Expo metadata using app name `Validade Zero` and placeholder-only API env naming.
- `apps/mobile/src/App.test.tsx` - React Native smoke render test with mocked primitives.
- `packages/contracts/src/index.ts` - Shared API service-name constant used by app surfaces.

## Decisions Made

- Used `pnpm approve-builds esbuild sharp workerd` after pnpm 11 blocked native dependency scripts; this keeps build approval scoped to Vite/Vitest/Wrangler dependencies.
- Excluded test files from app runtime `tsconfig.json` files so Vitest compiles tests while `typecheck` validates runtime code.
- Excluded `vite.config.ts` from web runtime typecheck because `@vitejs/plugin-react` currently pulls Babel declaration gaps through its config types; Vite still validates the config during build.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Approved required pnpm build scripts narrowly**
- **Found during:** Task 1 (API dependency install)
- **Issue:** pnpm 11 blocked native build scripts for `esbuild`, `sharp`, and `workerd`, preventing dependency installation.
- **Fix:** Added `onlyBuiltDependencies` in `pnpm-workspace.yaml` and ran `pnpm approve-builds esbuild sharp workerd`.
- **Files modified:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Verification:** `pnpm.cmd install` completed successfully.
- **Committed in:** `5d87aa8`

**2. [Rule 3 - Blocking] Scoped runtime typechecks away from test/config-only type dependencies**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** Vitest/Tinybench and Vite plugin config declarations introduced transitive type errors outside runtime source.
- **Fix:** Runtime tsconfigs exclude tests, and web runtime typecheck excludes `vite.config.ts`; tests/builds still validate those paths through Vitest/Vite.
- **Files modified:** `apps/api/tsconfig.json`, `apps/web/tsconfig.json`, `apps/mobile/tsconfig.json`
- **Verification:** API, web, mobile focused checks and root `pnpm.cmd test:smoke` passed.
- **Committed in:** `d2b3b55`, `bccfbde`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were needed to keep the scaffold executable under current pnpm/Vitest/Vite behavior. No product scope was added.

## Issues Encountered

- `react-test-renderer` emits a deprecation warning in root smoke output. It remains a low-risk Phase 1 smoke helper; Plan 04 can replace it when the formal test pyramid lands.
- React Native package metadata emitted non-blocking pnpm warnings for a few upstream packages missing `time` fields.

## Verification

- `pnpm.cmd --filter @validade-zero/api test` - passed.
- `pnpm.cmd --filter @validade-zero/api typecheck` - passed.
- `pnpm.cmd --filter @validade-zero/web test` - passed.
- `pnpm.cmd --filter @validade-zero/web build` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test` - passed.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd test:smoke` - passed.

## Self-Check: PASSED

- Key API, web, and mobile files listed in summary exist on disk.
- Commits for `01-02` are present in git history.
- `apps/api/wrangler.toml` contains only local placeholder config and no real account IDs, tokens, database URLs, or buckets.
- Smoke copy remains fictitious and does not introduce operational product data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The runnable app skeleton is ready for `01-03`, which can add strict linting, formatting, dependency-boundary enforcement, env safety, and repo guards around the command surface.

---
*Phase: 01-engineering-foundation*
*Completed: 2026-06-19*
