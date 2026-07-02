---
phase: 17-controle-gpp-web-api-com-tempo-real
plan: "05"
subsystem: ui
tags: [react, vite, gpp, realtime, accessibility, playwright]

requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    provides: GPP contracts, central API routes, realtime refresh hints
provides:
  - Feature-flagged Controle GPP web route
  - Sector-first Avarias queue with grouped baixa, details, and divergence flows
  - Compras internas, Divergencias, and Historico tabs
  - Typed web GPP client for reads, details, history, baixa, divergence, and purchase attendance
  - Web E2E smoke for enabled GPP route and central-unavailable fallback
affects: [web, gpp, command-center, e2e]

tech-stack:
  added: []
  patterns:
    - Typed fetch clients parse central responses with GPP Zod schemas
    - Realtime events update visible rows only through central queue rereads
    - GPP route is gated by session feature flag plus resolved actions

key-files:
  created:
    - apps/web/src/gpp/GppControlRoute.tsx
    - apps/web/src/gpp/GppControlRoute.test.tsx
    - apps/web/src/gpp/gpp-view-model.ts
    - apps/web/src/gpp/gpp-view-model.test.ts
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/shell/AppShell.tsx
    - apps/web/src/gpp/gpp-client.ts
    - apps/web/e2e/v1-readiness.spec.ts
    - apps/web/e2e/fixtures/v1-readiness.ts

key-decisions:
  - "Controle GPP is hidden from shell navigation unless `controle_gpp_enabled` and `canReadGppQueue` are both true."
  - "The GPP active role defaults to `controle-gpp`; non-GPP roles keep existing first-route behavior unless only GPP is available."
  - "Write success copy is shown only after the client receives a central-confirmed or replayed mutation response."
  - "Realtime route state remains a refresh hint: the route consumes hook snapshots that come from `readQueue`, not event payload fields."

patterns-established:
  - "GPP view derivation lives in `gpp-view-model.ts`, keeping sector sorting, search, labels, and history filters testable outside React."
  - "Critical GPP write failures use inline `role=\"alert\"` feedback and keep rows retryable."
  - "Operational route headers use compact grid layout instead of marketing hero/card patterns."

requirements-completed: [GPP-04, GPP-06, GPP-07]

duration: 24min
completed: 2026-07-02
---

# Phase 17 Plan 05: Controle GPP Web Route Summary

**Feature-flagged Controle GPP web surface with sector-first avarias, central-confirmed actions, live refresh hints, and E2E-covered fallback states**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-02T18:50:00-03:00
- **Completed:** 2026-07-02T19:13:23-03:00
- **Tasks:** 5
- **Files modified:** 11

## Accomplishments

- Added the first-class `Controle GPP` shell route with feature/action gating and GPP-role default routing.
- Built dense Avarias, Compras internas, Divergencias, and Historico tabs using central snapshots and view-model derivation.
- Added grouped baixa confirmation, detail sheet, divergence sheet, purchase attendance form, central failure copy, and retryable failure behavior.
- Wired realtime refresh state into the route while preserving central-authoritative rereads.
- Extended web unit and E2E coverage for route gating, GPP role landing, central unavailable fallback, baixa failure, history filters, and realtime refresh.

## Task Commits

1. **Tasks 1-5: Feature-flagged Controle GPP route** - `84e32758` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/web/src/gpp/GppControlRoute.tsx` - Main Controle GPP route, tabs, panels, dialogs, sheets, write feedback, and realtime integration.
- `apps/web/src/gpp/gpp-view-model.ts` - Sector panels, row labels, sorting, search, history filters, and status copy helpers.
- `apps/web/src/gpp/gpp-client.ts` - Typed fetch client for queue, detail, history, baixa, divergence, and purchase attendance.
- `apps/web/src/App.tsx` - Route selection, GPP-role landing, and token-before-session auth ordering.
- `apps/web/src/shell/AppShell.tsx` - GPP navigation item, gating, and role label.
- `apps/web/e2e/v1-readiness.spec.ts` - Feature-flagged GPP route and central fallback smoke.
- `apps/web/e2e/fixtures/v1-readiness.ts` - GPP session and queue fixtures.

## Decisions Made

- Kept the route hidden rather than disabled when GPP is not enabled, matching the plan acceptance that it appears only with flag and capability.
- Used route-level central reads for initial/manual refresh and the realtime hook for event-triggered rereads, avoiding payload-derived UI truth.
- Hardened `App` auth state ordering so authenticated fetch clients do not briefly initialize without the session token.

## Deviations from Plan

None - plan executed within the requested surface. The auth ordering fix was directly required by the new route test coverage and prevents unauthenticated initial fetches.

## Issues Encountered

- Playwright and Testing Library strict queries needed scoping where the UI intentionally exposes two `Atualizar` buttons in the central failure state.
- Desktop visual QA initially showed truncated search placeholder and then header wrapping; the header was changed to a responsive grid with a fixed desktop search column.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test`
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck`
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test`
- `cmd /c pnpm.cmd exec prettier --check ...`
- `cmd /c pnpm.cmd test:e2e:web`
- Playwright visual smoke screenshots for desktop and mobile GPP route with mocked GPP session/queue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 17-06 can build on a visible, gated web surface with central-authoritative reads/writes and E2E coverage. Remaining work should focus on final validation, docs, or any plan-specific hardening.

---
*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Completed: 2026-07-02*
