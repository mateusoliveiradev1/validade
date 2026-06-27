---
phase: 10-real-pilot-flow-rebuild
plan: "01"
subsystem: mobile-api-database
tags:
  - prepare-turn
  - central-cache
  - hono
  - sqlite
  - drizzle
  - authorization
requires:
  - phase: 07-offline-sync
    provides: Offline cache, command queue, sync conflict vocabulary, and Hoje sync UI.
  - phase: 08-audit-roles-and-shift-close
    provides: Server-owned membership authorization, audit denial patterns, and safe-close truth rules.
  - phase: 09-impeccable-hardening-and-v1-readiness
    provides: Real auth shell, privacy/account readiness, and release-quality mobile entry expectations.
provides:
  - Strict prepare-turn request/response contracts and visible central sync taxonomy.
  - Store-scoped central capture persistence and prepare-turn repository.
  - Authorized API prepare-turn route with sanitized denial/audit behavior.
  - Mobile Preparar turno gate, SQLite hydration, and cache-aware Hoje copy.
affects:
  - 10-02-product-catalog
  - 10-03-command-center
  - 10-04-sync-authority
  - 10-05-pilot-validation
tech-stack:
  added: []
  patterns:
    - Server resolves store scope from session membership before serving central facts.
    - Mobile treats central, local cache, pending central, conflict, discarded, and resolved as separate visible states.
    - Prepare-turn cache status is stored separately from offline command cache status.
key-files:
  created:
    - apps/api/src/capture.test.ts
    - apps/mobile/src/capture/prepare-turn.test.tsx
    - packages/database/drizzle/0006_phase_10_central_capture.sql
    - packages/database/src/capture-repository.ts
  modified:
    - packages/contracts/src/capture.ts
    - packages/contracts/src/sync.ts
    - packages/database/src/schema.ts
    - apps/api/src/index.ts
    - apps/mobile/src/auth/AuthGate.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/sqlite-repository.ts
key-decisions:
  - "Prepare-turn uses a POST body for device/local snapshot data while API membership resolves store authority."
  - "The API route lives in apps/api/src/index.ts to reuse existing authorization and denial helpers instead of adding a parallel capture router."
  - "Mobile blocks normal Hoje until a prepared central package is hydrated; cache fallback is explicitly labeled as not safe."
  - "Prepare-turn cache status is separate from offline_cache_status so central-read truth and local command sync do not collapse."
patterns-established:
  - "Central package hydration maps products, lots, active tasks, and cache status into the existing mobile repository boundary."
  - "In-memory and SQLite repositories both support prepare-turn hydration so component tests exercise the same behavior shape."
  - "API denial paths record sanitized access.denied events without echoing protected store facts."
requirements-completed:
  - CAT-01
  - CAT-02
  - CAT-03
  - LOC-01
  - LOC-02
  - LOC-03
  - RSK-03
  - RSK-04
  - SYN-01
  - SYN-02
  - SYN-03
  - AUD-01
  - AUD-02
  - UI-01
  - UI-02
  - UI-03
  - UI-04
duration: 130min
completed: 2026-06-26
---

# Phase 10 Plan 01: Central Prepare-Turn and Mobile Hydration Summary

**Authorized central prepare-turn packages now hydrate mobile Hoje before a pilot shift can operate.**

## Performance

- **Duration:** 130 min
- **Started:** 2026-06-26T19:25:00-03:00
- **Completed:** 2026-06-26T21:38:34-03:00
- **Tasks:** 3
- **Files modified:** 27

## Accomplishments

- Added strict prepare-turn contracts for central store snapshots, device snapshots, product/lot/task/conflict snippets, cache status, and central acknowledgement status.
- Added central capture database tables, migration, and repository methods for store-scoped prepare-turn reads, device snapshots, and sanitized served/denied audit events.
- Added an authorized `/capture/prepare-turn` API route that rejects forged store authority and denies unauthenticated/cross-store requests without leaking central facts.
- Added mobile `Preparar turno` gate, session-backed prepare-turn client call, SQLite and in-memory hydration, and Hoje copy that distinguishes central-prepared from local-cache operation.
- Hardened HTTP sync transport to carry session auth headers alongside store-scoped API calls.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define central prepare-turn and cache contracts** - `2bfea32` (`feat`)
2. **Task 2: Add central capture storage for prepare-turn reads** - `d70138b` (`feat`)
3. **Task 3: Expose authorized prepare-turn and hydrate mobile Hoje** - `13e3681` (`feat`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `packages/contracts/src/capture.ts` - Prepare-turn package schemas and central sync/cache taxonomy.
- `packages/contracts/src/sync.ts` - Central acknowledgement state validation.
- `packages/database/src/schema.ts` - Central capture and device snapshot schema additions.
- `packages/database/drizzle/0006_phase_10_central_capture.sql` - Phase 10 central capture migration.
- `packages/database/src/capture-repository.ts` - Store-scoped prepare-turn repository and in-memory test implementation.
- `apps/api/src/index.ts` - Authorized prepare-turn route wired into the existing API app.
- `apps/api/src/capture.test.ts` - Prepare-turn authorization, empty-package, and sanitized-denial API tests.
- `apps/mobile/src/auth/AuthGate.tsx` - Session-aware prepare-turn client and auth-header provider.
- `apps/mobile/src/capture/CaptureApp.tsx` - `Preparar turno` gate and central/cache entry flow.
- `apps/mobile/src/capture/TodayScreen.tsx` - Central/cache notice and no-false-safe Hoje verdict.
- `apps/mobile/src/capture/sqlite-repository.ts` - SQLite prepare-turn cache table and central hydration mapping.
- `apps/mobile/src/capture/memory-repository.ts` - In-memory prepare-turn hydration for tests.
- `apps/mobile/src/capture/http-sync-transport.ts` - Auth header support for sync transport.
- `apps/mobile/src/capture/prepare-turn.test.tsx` - Mobile prepare-turn gate, hydration, needs-review, and cache fallback tests.

## Decisions Made

- Prepare-turn is an authenticated POST because the device must send local snapshot data; store/role/capability remain absent from the body and are resolved by server-side membership.
- The API route was added to `apps/api/src/index.ts` instead of a separate `apps/api/src/capture.ts` so it can reuse the existing Hono app dependencies and denial helper without a parallel router abstraction.
- Mobile cache fallback is allowed only with explicit copy that it is local and not a central safety claim.
- SQLite stores prepare-turn cache status in a dedicated `prepare_turn_cache_status` table instead of overloading `offline_cache_status`.

## Deviations from Plan

### Auto-fixed Issues

**1. API route file placement**
- **Found during:** Task 3 (Expose authorized prepare-turn and hydrate mobile Hoje)
- **Issue:** The plan listed `apps/api/src/capture.ts`, but the existing API app keeps routes and dependency wiring in `apps/api/src/index.ts`.
- **Fix:** Implemented the route in `index.ts` to reuse `authProvider`, `authorizationService`, membership repository, and sanitized denial recording.
- **Files modified:** `apps/api/src/index.ts`, `apps/api/src/capture.test.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/api test -- capture authorization`
- **Committed in:** `13e3681`

**2. SQLite migration helper not needed for new table**
- **Found during:** Task 3 (Expose authorized prepare-turn and hydrate mobile Hoje)
- **Issue:** The plan listed `sqlite-migrations.ts`, but the new local prepare-turn table is created with the normal SQLite initialization path and does not need an ALTER-only helper.
- **Fix:** Added `prepare_turn_cache_status` to `initializeDatabase` and left existing migration helpers unchanged.
- **Files modified:** `apps/mobile/src/capture/sqlite-repository.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck` and `pnpm.cmd --filter @validade-zero/mobile test -- prepare-turn today-screen App`
- **Committed in:** `13e3681`

**3. Formatting cleanup for earlier task files**
- **Found during:** Plan verification
- **Issue:** `pnpm.cmd check` failed at `prettier --check` on files changed across Tasks 1-3.
- **Fix:** Ran `pnpm.cmd format` and included the formatting output in the Task 3 commit.
- **Files modified:** contract, database, API, and mobile files changed by this plan.
- **Verification:** `pnpm.cmd check`
- **Committed in:** `13e3681`

---

**Total deviations:** 3 auto-fixed (2 integration-shape adjustments, 1 formatting repair)
**Impact on plan:** All fixes preserved the planned behavior and reduced duplicate plumbing. No scope creep beyond the central prepare-turn path.

## Issues Encountered

- A parallel pnpm verification attempt during Task 2 triggered Windows `node_modules` link churn. Recovery was to run `pnpm.cmd install --frozen-lockfile` and keep later pnpm commands sequential.
- The local git hook attempted to auto-push Task 2 and Task 3 commits, but GitHub was unreachable from this environment. Both commits remain local.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- capture sync authorization`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/database test -- repositories`
- `pnpm.cmd --filter @validade-zero/database typecheck`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `pnpm.cmd --filter @validade-zero/api test -- capture authorization`
- `pnpm.cmd --filter @validade-zero/mobile test -- prepare-turn today-screen App`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd check`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `10-02-PLAN.md`. The next plan can build on a real central prepare-turn boundary, hydrated mobile cache, and explicit no-false-safe copy for central failures.

---

*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-26*
