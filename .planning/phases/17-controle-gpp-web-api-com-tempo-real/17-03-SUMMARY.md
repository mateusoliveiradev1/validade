---
phase: 17-controle-gpp-web-api-com-tempo-real
plan: "03"
subsystem: gpp-central-api
tags: [gpp, api, hono, authorization, audit, realtime, idempotency]
requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    plan: "01"
    provides: GPP role, session actions, and feature flag
  - phase: 17-controle-gpp-web-api-com-tempo-real
    plan: "02"
    provides: GPP repository, persistence, and mutation result audit context
provides:
  - Feature-flagged GPP API route registration
  - Store-scoped GPP read routes for queue, detail, divergences, purchases, and history
  - Central-first avaria mutation routes with backend authorization
  - Compras internas creation and attendance routes
  - GPP audit event append for central mutations
  - Realtime refresh-hint publish after central success and audit append
affects: [phase-17, api, gpp-web, audit, realtime, contracts, database]
tech-stack:
  added: []
  patterns: [feature-flag-route-group, central-first-mutation, audit-before-realtime, refresh-hint-events]
key-files:
  created:
    - apps/api/src/gpp.ts
    - apps/api/src/gpp.test.ts
    - .planning/phases/17-controle-gpp-web-api-com-tempo-real/17-03-SUMMARY.md
  modified:
    - apps/api/src/index.ts
    - apps/api/src/audit.ts
    - packages/contracts/src/audit.ts
    - packages/contracts/src/audit.test.ts
    - packages/database/src/audit-repository.ts
    - packages/database/src/evidence-repository.ts
    - packages/database/src/gpp-repository.ts
    - packages/database/src/shift-close-repository.ts
key-decisions:
  - "GPP routes are registered but return a bounded `gpp_disabled` 404 while the default-off feature flag is false."
  - "The API uses backend capabilities and central state, not client hints, for store, role, status, and creator checks."
  - "GPP audit events use `gpp.changed` with GPP-specific target types and bounded previous/next state strings."
  - "Realtime publish happens only after central mutation and audit append succeed; replay skips publish."
patterns-established:
  - "Route handlers convert repository replay into replayed responses without duplicate audit rows."
  - "Central business rejections return `gpp_mutation_rejected`; infrastructure/audit failure returns retryable central failure."
  - "The GPP repository exposes `readAvaria` so collaborator own-pending correction is enforced against central state."
requirements-completed: ["GPP-02", "GPP-03", "GPP-04", "GPP-05", "GPP-06"]
duration: 33min
completed: 2026-07-02
---

# Phase 17 Plan 03: Central-First GPP API Summary

**Controle GPP now has backend routes for central reads, mutations, audit, idempotency replay, and realtime refresh hints.**

## Performance

- **Duration:** 33 min
- **Completed:** 2026-07-02
- **Tasks:** 4
- **Files modified:** 10 before this summary

## Accomplishments

- Added `registerGppRoutes` and `GppService` in `apps/api/src/gpp.ts`.
- Wired `createApiApp` with injectable GPP repository and realtime publisher dependencies.
- Added read endpoints for queue, detail, divergences, purchases, and history behind `controle_gpp_enabled`.
- Added avaria routes for create, movement, correction, divergence, review, baixa, cancel, administrative correction, and estorno.
- Added compras internas routes for request creation and attendance outcomes.
- Enforced backend permissions for GPP read/history, avaria create/correct/divergence/review/baixa, and purchase attendance.
- Enforced collaborator own-pending correction by reading central avaria state before mutation.
- Added `gpp.changed` audit events with GPP targets, previous/next bounded metadata, role snapshots, store, sector/product, idempotency, and central timestamps.
- Added realtime refresh hints after repository mutation and audit append succeed; replay, validation failure, authorization failure, central failure, and audit failure do not publish.

## Task Commits

1. **Tasks 1-4: Add central-first GPP API routes, audit, compras internas, and realtime publish ordering** - `c56e861f` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/api/src/gpp.ts` - GPP route registration, service helper, authorization, audit append, and realtime publish handling.
- `apps/api/src/gpp.test.ts` - Tests flag gating, read authorization, central failure, collaborator correction limits, GPP lifecycle, purchases, audit, replay, and realtime ordering.
- `apps/api/src/index.ts` - Wires GPP repository and publisher dependencies into app composition.
- `apps/api/src/audit.ts` - Preserves `gpp` role snapshots in access-denied audit.
- `packages/contracts/src/audit.ts` and `packages/contracts/src/audit.test.ts` - Adds GPP audit event/target contracts.
- `packages/database/src/gpp-repository.ts` - Adds `readAvaria` for API central-state authorization.
- `packages/database/src/audit-repository.ts`, `packages/database/src/evidence-repository.ts`, `packages/database/src/shift-close-repository.ts` - Widen role/event/target unions for GPP compatibility.

## Decisions Made

- Feature-disabled GPP endpoints return 404 `gpp_disabled` rather than an empty queue, so the UI cannot mistake disabled for no pendencies.
- Replayed mutations still use idempotent audit append, so retries can recover from a prior audit failure without duplicating events.
- Publish failure after central success returns success with `realtimeState: "paused"`, preserving central truth while allowing manual refresh recovery.
- Business lifecycle rejections are separated from central unavailability, so invalid baixa/correction attempts are not presented as retryable outages.

## Deviations from Plan

- Tasks 1-4 were committed together because the API route group, audit append, and realtime ordering share one service module and one integrated test suite.
- `readAvaria` was added to the repository interface during this plan so the API could enforce collaborator own-pending correction against central state.
- Audit contract and database audit role/target unions were updated in this plan because GPP audit events must validate end-to-end before routes can append them.

## Issues Encountered

- Strict GPP store contracts rejected full membership objects. Route handlers now pass a store-only snapshot to repository calls.
- Existing audit/database role unions did not yet include `gpp`, which surfaced during API typecheck and was widened with tests.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/api test` - passed, 13 files / 109 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/api typecheck` - passed.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 12 files / 114 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/database test` - passed, 2 files / 62 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/database typecheck` - passed.
- `cmd /c pnpm.cmd exec prettier --check apps/api/src/gpp.ts apps/api/src/gpp.test.ts apps/api/src/index.ts apps/api/src/audit.ts packages/contracts/src/audit.ts packages/contracts/src/audit.test.ts packages/database/src/audit-repository.ts packages/database/src/evidence-repository.ts packages/database/src/shift-close-repository.ts packages/database/src/gpp-repository.ts` - passed.

## User Setup Required

None. Routes remain hidden until `controle_gpp_enabled` is explicitly enabled.

## Next Phase Readiness

Plan 17-04 can build realtime transport/client behavior on top of API refresh hints that are already central-first, audit-backed, and feature-gated.

---
*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Completed: 2026-07-02*
