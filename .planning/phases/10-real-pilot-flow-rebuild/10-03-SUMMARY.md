---
phase: 10-real-pilot-flow-rebuild
plan: "03"
subsystem: central-lot-mobile-api
tags:
  - central-lots
  - task-projection
  - prepare-turn
  - mobile-cache
  - sqlite
  - hono-api
requires:
  - phase: 10-real-pilot-flow-rebuild
    plan: "01"
    provides: Authorized prepare-turn package, mobile central hydration, and visible central/cache sync taxonomy.
  - phase: 10-real-pilot-flow-rebuild
    plan: "02"
    provides: Store-scoped central product catalog, mobile central product ids, and product draft visibility.
  - phase: 08-audit-roles-and-shift-close
    provides: Store-scoped authorization, sanitized audit events, and leadership audit scope.
provides:
  - Central lot creation, observation append, snapshot, acknowledgement, and task projection contracts.
  - Pure central lot task projection helpers that preserve required resolution compatibility.
  - Store-scoped central lot persistence with idempotency, task projection recalculation, and audit evidence.
  - Authorized API routes for central lot create and observation append.
  - Mobile lot registration that writes centrally when prepare-turn cache is ready and labels local fallback honestly.
  - SQLite and memory cache support for central lot ids, sync state, source, task projection, and acknowledgement copy.
affects:
  - 10-04-terminal-resolution-sync
  - 10-05-capture-backed-command-center
  - 10-06-pilot-uat
tech-stack:
  added: []
  patterns:
    - Central lot writes recalculate task projection in the same service operation and return the updated lot/task snapshot.
    - Mobile central writes are gated by a ready central prepare-turn cache; degraded operation remains local and visibly pending.
    - Local lot cache rows now carry central id, central source, visible sync state, task projection JSON, and acknowledgement message.
key-files:
  created:
    - .planning/phases/10-real-pilot-flow-rebuild/10-03-SUMMARY.md
  modified:
    - packages/contracts/src/capture.ts
    - packages/contracts/src/tasks.ts
    - packages/domain/src/tasks.ts
    - packages/database/src/capture-repository.ts
    - apps/api/src/index.ts
    - apps/mobile/App.tsx
    - apps/mobile/src/auth/AuthGate.tsx
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/LotRegistrationScreen.tsx
    - apps/mobile/src/capture/RecentLotList.tsx
    - apps/mobile/src/capture/LotDetailScreen.tsx
key-decisions:
  - "Central lot creation is allowed only when the mobile cache was prepared from the central source; cache-only and degraded paths stay local pending."
  - "A central lot write immediately persists the returned central snapshot locally, including central lot id, source, visible sync state, task projection, and acknowledgement copy."
  - "Task projection remains active/radar/none at lot-write time; terminal resolution stays reserved for the next plan."
  - "Mobile API calls for lot creation use the authenticated session client instead of a repository singleton created before auth."
patterns-established:
  - "CaptureRepository dependencies can expose a central lot writer while preserving offline-capable local repository behavior."
  - "SQLite migrations add optional columns through ensureColumns for mobile cache evolution."
  - "Recent/detail/registration copy uses a shared centralStateLabel so local pending and central acknowledgement stay consistent."
requirements-completed:
  - CAT-02
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
duration: 210min
completed: 2026-06-26
---

# Phase 10 Plan 03: Central Lot Lifecycle and Mobile Cache Visibility Summary

**Central lot writes now create durable store task projection and mobile caches show whether a lot is centrally acknowledged or only local pending.**

## Performance

- **Duration:** 210 min
- **Started:** 2026-06-26T19:30:00-03:00
- **Completed:** 2026-06-26T23:09:56-03:00
- **Tasks:** 3
- **Files modified:** 23

## Accomplishments

- Added central lot, central observation, write acknowledgement, and task projection contracts for formal validity, processed/repack-loss, FLV inspection, and receiving-monitored lots.
- Added domain projection helpers so central lot facts derive active/radar/no-task outcomes using existing risk and required-resolution language.
- Added store-scoped central lot creation and observation append in the database/API layer, including idempotent replay, cross-store denial, projection refresh, and audit rows.
- Connected mobile lot registration to the authenticated central lot API when prepare-turn cache is ready from central.
- Extended mobile SQLite and memory repositories so recent lots, detail views, and Hoje-compatible tasks can hydrate from central lot ids and task projection state.
- Updated mobile copy to distinguish synchronized central acknowledgement from local pending save.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend contracts and pure projection for central lots** - `7f67131` (`feat`)
2. **Task 2: Persist lot, observation, and task projection centrally** - `ecac20e` (`feat`)
3. **Task 3: Connect mobile lot save and second-device cache visibility** - `99d34b7` (`feat`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `packages/contracts/src/capture.ts` - Central lot create/append/snapshot/write response contracts.
- `packages/contracts/src/tasks.ts` - Central task projection contract exports.
- `packages/domain/src/tasks.ts` - Central lot to task projection helpers.
- `packages/database/src/capture-repository.ts` - Store-scoped lot write, observation append, idempotency, projection, and audit persistence.
- `apps/api/src/index.ts` - Authorized central lot and observation endpoints.
- `apps/mobile/App.tsx` - Authenticated repository construction with central lot client dependency.
- `apps/mobile/src/auth/AuthGate.tsx` - Mobile session client central lot write method.
- `apps/mobile/src/capture/repository.ts` - Repository dependency and central lot metadata types/parsers.
- `apps/mobile/src/capture/sqlite-repository.ts` - Central-write path, central cache columns, projection hydration, and local fallback metadata.
- `apps/mobile/src/capture/memory-repository.ts` - Testable central-write and prepare-turn hydration parity.
- `apps/mobile/src/capture/LotRegistrationScreen.tsx` - Success copy includes central/local state.
- `apps/mobile/src/capture/RecentLotList.tsx` - Central state label for recent lot rows.
- `apps/mobile/src/capture/LotDetailScreen.tsx` - Central state and acknowledgement copy on detail.

## Decisions Made

- Central lot write-through is gated by a ready central prepare-turn cache so degraded operation cannot claim central acknowledgement.
- Local fallback stays available and visible as local pending; this preserves poor-connectivity capture without turning it into a false central proof.
- Task projection is recalculated on each central lot/observation write but terminal actions remain out of scope for the next plan.
- The mobile repository is created after authentication so central writes always use the authenticated session client.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript required mode-specific central snapshot conversion helpers for `CaptureLotInput` and quantity-state-specific observation conversion. This was resolved before commit and verified with mobile typecheck.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- tasks risk`
- `pnpm.cmd --filter @validade-zero/contracts test -- capture tasks`
- `pnpm.cmd --filter @validade-zero/domain typecheck`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/database test -- repositories`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture authorization`
- `pnpm.cmd --filter @validade-zero/database typecheck`
- `pnpm.cmd --filter @validade-zero/api typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test -- lot-registration today-screen capture-repository`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd exec prettier --check apps/mobile/App.tsx apps/mobile/src/App.test.tsx apps/mobile/src/auth/AuthGate.tsx apps/mobile/src/auth/auth-flow.test.tsx apps/mobile/src/capture/LotDetailScreen.tsx apps/mobile/src/capture/LotRegistrationScreen.tsx apps/mobile/src/capture/RecentLotList.tsx apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/capture/memory-repository.ts apps/mobile/src/capture/mobile-release-journeys.test.tsx apps/mobile/src/capture/repository.ts apps/mobile/src/capture/sqlite-migrations.ts apps/mobile/src/capture/sqlite-repository.ts`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 10-04 terminal resolution sync: central lot/task projection exists, mobile can create central lots from authenticated cache-ready sessions, and local fallback stays visibly pending.

---
*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-26*
