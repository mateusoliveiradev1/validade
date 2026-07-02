---
phase: 17-controle-gpp-web-api-com-tempo-real
plan: "04"
subsystem: gpp-realtime-fallback
tags: [gpp, realtime, websocket, durable-object, web, fallback, accessibility]
requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    plan: "03"
    provides: Central-first GPP API, audit append, and mutation publish hook
provides:
  - Hint-only GPP realtime event contract
  - API realtime publisher abstraction with no-op, in-memory, and Durable Object transport
  - Store-scoped realtime route with authorization and paused fallback
  - Cloudflare Durable Object binding and SQLite migration config
  - Web GPP client and realtime hook with manual refresh and polling fallback
affects: [phase-17, gpp-api, gpp-web, contracts, worker-runtime, realtime]
tech-stack:
  added: []
  patterns: [hint-only-realtime, store-room-binding, no-op-fallback, central-refresh-on-event, polite-status]
key-files:
  created:
    - apps/api/src/gpp-realtime.ts
    - apps/api/src/gpp-realtime.test.ts
    - apps/web/src/gpp/gpp-client.ts
    - apps/web/src/gpp/gpp-realtime.ts
    - apps/web/src/gpp/gpp-realtime.test.tsx
    - .planning/phases/17-controle-gpp-web-api-com-tempo-real/17-04-SUMMARY.md
  modified:
    - packages/contracts/src/gpp.ts
    - packages/contracts/src/gpp.test.ts
    - apps/api/src/gpp.ts
    - apps/api/src/gpp.test.ts
    - apps/api/src/index.ts
    - apps/api/src/worker-runtime.test.ts
    - apps/api/wrangler.toml
key-decisions:
  - "Realtime events carry event id, store id, kind, timestamp, optional actor-safe label, and refresh topics only."
  - "The API defaults to a no-op publisher when no Durable Object binding is configured."
  - "The Worker binding uses public-safe `GPP_REALTIME_ROOM` and `GppRealtimeRoom` names with a SQLite-backed Durable Object migration."
  - "The web hook re-reads the central GPP queue after a valid hint and never mutates visible rows from event payloads."
patterns-established:
  - "Publish failure after central success keeps the mutation successful and reports paused realtime state."
  - "Web status exposes `Tempo real ativo`, `Tempo real pausado`, and `Atualizado ha Xs` with polite live-region semantics."
  - "Paused realtime uses manual `Atualizar` plus bounded polling fallback."
requirements-completed: ["GPP-06"]
duration: 28min
completed: 2026-07-02
---

# Phase 17 Plan 04: GPP Realtime Refresh Hints Summary

**GPP realtime is now an acceleration layer only: events trigger central refresh, never visible truth.**

## Performance

- **Duration:** 28 min
- **Completed:** 2026-07-02
- **Tasks:** 4
- **Files modified:** 12 before this summary

## Accomplishments

- Strengthened `GppRealtimeEnvelopeSchema` with `eventId`, refresh topics, divergence event kind, optional actor-safe label, and rejection of outcome-like payloads.
- Added `GppRealtimeEventSchema` alias so consumers can refer to the event contract directly.
- Added API realtime module with no-op publisher, in-memory test publisher, Durable Object publisher, store room name helper, and `GppRealtimeRoom`.
- Added `/gpp/realtime` route behavior inside GPP routes: disabled returns 404, missing binding returns paused 503, unauthorized/cross-store sessions are denied, and authorized sessions forward to the store room.
- Wired Worker app composition to use Durable Object publishing when `GPP_REALTIME_ROOM` exists and no-op publishing otherwise.
- Added `wrangler.toml` Durable Object binding and `new_sqlite_classes` migration while leaving Controle GPP default-off.
- Added web GPP fetch client and `useGppRealtime` hook with active/paused/unavailable status labels, manual refresh, polling fallback, and `aria-live="polite"` freshness copy.

## Task Commits

1. **Tasks 1-4: Add GPP realtime refresh hints, API transport, Worker binding, and web fallback hook** - `9d9bafcf` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `packages/contracts/src/gpp.ts` and `packages/contracts/src/gpp.test.ts` - Hint-only realtime envelope contract and rejection tests.
- `apps/api/src/gpp-realtime.ts` and `apps/api/src/gpp-realtime.test.ts` - Publisher abstraction, in-memory/no-op/DO transport, room behavior, and tests.
- `apps/api/src/gpp.ts` and `apps/api/src/gpp.test.ts` - Route forwarding, stronger envelopes, paused fallback, and store-scoped authorization tests.
- `apps/api/src/index.ts`, `apps/api/src/worker-runtime.test.ts`, `apps/api/wrangler.toml` - Worker binding, exported Durable Object class, runtime fallback, and config assertions.
- `apps/web/src/gpp/gpp-client.ts`, `apps/web/src/gpp/gpp-realtime.ts`, `apps/web/src/gpp/gpp-realtime.test.tsx` - Web client/hook and fallback tests.

## Decisions Made

- The event contract rejects row payloads and success/status claims such as `baixado`, `atendido`, `resolvido`, and `central_confirmed`.
- Durable Object binding config follows Cloudflare's current SQLite-backed migration syntax: `[[durable_objects.bindings]]` plus `[[migrations]] new_sqlite_classes`.
- The web hook is headless; the next UI plan can render it inside the GPP route without coupling transport logic to layout.
- Realtime labels are concise and operational: active, paused, and freshness. They use polite live regions, not assertive announcements.

## Deviations from Plan

- The Durable Object room is implemented as a binding-friendly Worker class and route fallback, with tests for binding forwarding and no-binding paused behavior. Full browser WebSocket E2E is deferred to later end-to-end coverage.
- `wrangler.toml` could not be run through Prettier because the project has no TOML parser configured; the config was manually kept minimal and verified by tests.

## Issues Encountered

- Cloudflare Worker `WebSocketPair` indexing needed explicit undefined guards for strict TypeScript.
- React hook tests needed stable socket/clock callbacks to avoid reconnecting on every render.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 12 files / 114 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/api test` - passed, 14 files / 114 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/api typecheck` - passed.
- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 10 files / 44 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed.
- `cmd /c pnpm.cmd exec prettier --check packages/contracts/src/gpp.ts packages/contracts/src/gpp.test.ts apps/api/src/gpp.ts apps/api/src/gpp.test.ts apps/api/src/gpp-realtime.ts apps/api/src/gpp-realtime.test.ts apps/api/src/index.ts apps/api/src/worker-runtime.test.ts apps/web/src/gpp/gpp-client.ts apps/web/src/gpp/gpp-realtime.ts apps/web/src/gpp/gpp-realtime.test.tsx` - passed.

## User Setup Required

None for local/default operation. The checked-in Worker config defines the Durable Object binding, but GPP remains hidden until `controle_gpp_enabled` is explicitly enabled.

## Next Phase Readiness

Plan 17-05 can build the GPP web route against a central client and realtime hook that already expose active/paused freshness states and manual refresh fallback.

---
*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Completed: 2026-07-02*
