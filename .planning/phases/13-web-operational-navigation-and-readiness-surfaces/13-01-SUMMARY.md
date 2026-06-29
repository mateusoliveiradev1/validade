---
phase: 13-web-operational-navigation-and-readiness-surfaces
plan: "01"
subsystem: web-ui
tags: [react, command-center, routing, rbac, vitest]

requires:
  - phase: 12-pilot-operations-and-device-readiness
    provides: Command Center projection with device readiness, build truth, UAT, and blockers
provides:
  - Durable web operational routes for Operacao, Aparelhos, Atualizacoes, and Validacao
  - Fail-closed operational route gating behind canReadCommandCenter
  - Shared Command Center route selector and device readiness helpers
  - Route foundation tests for allowed and denied operational sessions
affects: [phase-13, web-command-center, web-shell, route-split]

tech-stack:
  added: []
  patterns: [shared-command-center-projection-host, capability-gated-operational-routes]

key-files:
  created:
    - apps/web/src/command-center/command-center-view-model.ts
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/shell/AppShell.tsx
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/App.test.tsx
    - apps/web/src/command-center/command-center.test.tsx

key-decisions:
  - "All four Phase 13 operational web routes reuse canReadCommandCenter instead of introducing route-specific permissions."
  - "CommandCenter remains the shared /command-center projection host while route-specific content is split in later plans."
  - "Device readiness selectors are exported from a pure web view-model so later route components do not duplicate projection truth."

patterns-established:
  - "Operational route ids are durable AppRoute values: operacao, aparelhos, atualizacoes, validacao."
  - "Route helpers derive labels, readiness counts, readiness order, and daily-operation blockers from CommandCenterProjection only."

requirements-completed: ["WEB-01", "WEB-02", "WEB-03", "WEB-04", "WEB-05"]

duration: 8 min
completed: 2026-06-29
---

# Phase 13 Plan 01: Route Foundation Summary

**Durable Phase 13 web routing with fail-closed operational navigation and shared Command Center projection helpers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-29T01:50:00Z
- **Completed:** 2026-06-29T01:58:18Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Replaced the old `command` route identity with `operacao`, `aparelhos`, `atualizacoes`, and `validacao`, followed by the existing access and audit routes.
- Kept all operational routes fail-closed behind `canReadCommandCenter`, with access and audit still guarded by `canManageUsers` and `canReadStoreAudit`.
- Added `command-center-view-model.ts` with projection-derived readiness counts, readiness ordering, daily-operation blocker filtering, optional date labels, and route labels.
- Preserved the shared `/command-center` host: `CommandCenter` still calls `client.read({ storeId })`, keeps refresh behavior, and appends safe push-test results by masked device id.
- Updated tests so allowed users see `Operacao` as the operational entry and admin-only sessions see all operational routes disabled.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend web route identity and navigation order** - `fa3a312f` (feat)
2. **Task 2: Introduce shared projection host and route selector helpers** - `8f1a23f8` (feat)
3. **Task 3: Update route foundation tests** - `ed70cdc6` (test)

## Files Created/Modified

- `apps/web/src/command-center/command-center-view-model.ts` - Shared pure selectors for Phase 13 route components.
- `apps/web/src/App.tsx` - Starts at `operacao`, routes all operational ids to the shared Command Center host, and preserves capability fallback.
- `apps/web/src/shell/AppShell.tsx` - Defines the new side-menu order and disabled route reasons.
- `apps/web/src/command-center/CommandCenter.tsx` - Accepts the active operational route while preserving one shared projection read and push-test append flow.
- `apps/web/src/App.test.tsx` - Covers the new operational route labels and fail-closed disabled state.
- `apps/web/src/command-center/command-center.test.tsx` - Covers shared route selector helpers and keeps existing Command Center behavior green.

## Decisions Made

- All four new operational routes share the existing `canReadCommandCenter` capability. This keeps the Phase 13 split presentational and avoids weakening the store-scoped RBAC model.
- The shared `CommandCenter` host remains responsible for `/command-center` reads and safe push-test mutation. Later plans can split route bodies without creating divergent data truth.
- `13-01` copied the plan's requirement list into metadata, but it only completes the route foundation. Route-specific fulfillment continues in `13-02` through `13-05`.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion beyond route host compatibility needed for the new App route ids.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed
- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files and 34 tests

## Next Phase Readiness

Ready for `13-02`: the Operacao route can now be distilled without changing route identity, capability gating, or the shared projection read path.

---
*Phase: 13-web-operational-navigation-and-readiness-surfaces*
*Completed: 2026-06-29*
