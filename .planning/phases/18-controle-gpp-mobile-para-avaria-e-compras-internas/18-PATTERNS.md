# Phase 18 Pattern Map - Controle GPP Mobile

## PATTERN MAPPING COMPLETE

**Phase:** 18 - Controle GPP Mobile para avaria e compras internas
**Mapped:** 2026-07-03
**Inputs:** `18-CONTEXT.md`, `18-RESEARCH.md`, `18-UI-SPEC.md`, Phase 17 summary

## Implementation Shape

Phase 18 should extend the existing mobile capture surface instead of adding a separate app shell or UI system. The closest analogs are:

| New area | Closest analog | Reuse pattern |
|----------|----------------|---------------|
| Controle GPP route and hub | `apps/mobile/src/capture/CaptureApp.tsx`, `AjustesScreen.tsx` | Route union, route stack navigation, session bar entry, `ScreenHeader`, operational sections. |
| GPP mobile UI primitives | `capture-ui.tsx`, `capture-theme.ts`, `offline-sync-ui.tsx` | Existing buttons, fields, selection rows, notices, queue rows, warning/critical surfaces. |
| GPP central copy | `today-copy.ts`, `mobile-status.ts` | Central/local truth vocabulary and explicit pending copy. |
| GPP client | `apps/api/src/gpp.ts`, `packages/contracts/src/gpp.ts` | Contract-backed request/response parsing; central success only from `central_confirmed` or `replayed`. |
| Offline GPP queue | `repository.ts`, `memory-repository.ts`, `sqlite-repository.ts`, `sqlite-migrations.ts` | Repository interface, in-memory parity, SQLite persistence, idempotency keys, retry/conflict lifecycle. |
| Sync/retry behavior | `sync-engine.ts`, `sync-engine.test.ts`, `offline-sync-ui.tsx` | Skip auto-sync offline/degraded, manual sync path, transport failure retry, conflict review and discard reason. |
| Mobile regression tests | `mobile-release-journeys.test.tsx`, `today-screen.test.tsx`, `offline-sync-ui.test.tsx` | React Native renderer flows, fake repository/client harnesses, route and copy assertions. |

## File Role Map

### Mobile GPP Foundation

- `apps/mobile/src/capture/gpp-client.ts`
  - Role: mobile API client and error classifier.
  - Analog: API contract parsing in `apps/api/src/gpp.ts`; mobile service wrappers around central clients.
  - Must import GPP schemas/types from `@validade-zero/contracts` instead of duplicating schemas.

- `apps/mobile/src/capture/gpp-offline-queue.ts`
  - Role: GPP-specific local pending model, idempotency, retry/conflict projection.
  - Analog: `repository.ts` sync queue types and `sync-engine.ts` transport result lifecycle.
  - Should avoid forcing GPP records into Today task/lote command shapes unless the shared sync command contract is intentionally widened.

- `apps/mobile/src/capture/gpp-copy.ts`
  - Role: exact GPP copy vocabulary.
  - Analog: `today-copy.ts`.
  - Must contain `Pendente neste aparelho`, `Enviando para central...`, `Registrado na central`, and `Solicitacao enviada para central`.

- `apps/mobile/src/capture/repository.ts`
  - Role: extend `CaptureRepository` with GPP queue persistence methods or a typed nested repository surface.
  - Analog: current `listSyncQueue`, `saveOfflineAction`, `resolveSyncConflict`, `loadSyncConflict`.

- `apps/mobile/src/capture/memory-repository.ts`
  - Role: deterministic test adapter for GPP pending records.
  - Analog: in-memory sync queue and idempotency implementation.

- `apps/mobile/src/capture/sqlite-repository.ts`
  - Role: durable local GPP pending records and conflicts.
  - Analog: SQLite sync command persistence.

- `apps/mobile/src/capture/sqlite-migrations.ts`
  - Role: additive local schema migration for GPP pending queue tables if needed.
  - Analog: existing local migration helper and queue tables.

### Mobile Navigation And Screens

- `apps/mobile/src/capture/CaptureApp.tsx`
  - Role: first-class `gpp-control` route, role-aware initial route, session-bar/hub entry gating.
  - Analog: existing `settings` route and `initialRouteStack`.
  - Must keep `TodayScreen` free of GPP action buttons.

- `apps/mobile/src/capture/ControleGppScreen.tsx`
  - Role: hub, pending/sent summary, child flow routing callbacks.
  - Analog: `AjustesScreen.tsx` for route-level screen and `offline-sync-ui.tsx` for queue rows.

- `apps/mobile/src/capture/GppAvariaFlow.tsx`
  - Role: guided avaria flow.
  - Analog: existing capture forms using `Field`, `SelectionRow`, `PrimaryAction`, and `StatusNotice`.

- `apps/mobile/src/capture/GppPurchaseFlow.tsx`
  - Role: guided internal purchase request flow.
  - Analog: avaria flow plus purchase status projection from contracts.

- `apps/mobile/src/capture/GppPendingScreen.tsx`
  - Role: `Minhas pendencias`, central statuses, local pending, conflicts, retry/discard actions.
  - Analog: `SyncQueueSummary` and `SyncConflictPanel`.

## Required Code Patterns

### Central Success

Only these mutation response states can drive success UI:

- `central_confirmed`
- `replayed`

`central_failed`, HTTP 400/403, feature-flag denial, authorization denial, and business-rule rejection must stay central failure states and must not enqueue local success.

### Local Pending

Only a transport/network reachability failure may create a local GPP pending record. The row must preserve:

- local id
- request kind (`avaria` or `purchase`)
- original payload
- idempotency key
- created/updated/attempt timestamps
- retry count
- state (`pending`, `retrying`, `failed`, `conflict`, `discarded`, or equivalent)
- latest central rejection/conflict reason when present
- discard justification when discarded

### UI Contract

All new screens must use:

- existing React Native `StyleSheet`
- `captureColors` tokens
- `ScreenHeader`, `PrimaryAction`, `SecondaryAction`, `DestructiveAction`, `Field`, `SelectionRow`, and `StatusNotice`
- one-column mobile layout, 48px minimum action targets, no nested cards, no dashboard/hero/stat treatment

## Test Pattern Map

| Behavior | Suggested test file | Existing analog |
|----------|---------------------|-----------------|
| GPP client central/error/offline classification | `gpp-client.test.ts` | `sync-engine.test.ts`, `gpp.test.ts` |
| GPP local queue persistence and idempotency | `gpp-offline-queue.test.ts` | `capture-repository.test.ts`, `offline-sync.test.ts` |
| Role-aware GPP navigation | `mobile-gpp-navigation.test.tsx` | `mobile-release-journeys.test.tsx`, `today-screen.test.tsx` |
| Avaria flow validation and feedback | `gpp-avaria-flow.test.tsx` | `task-resolution.test.tsx` |
| Purchase flow and status labels | `gpp-purchase-flow.test.tsx` | `offline-sync-ui.test.tsx` |
| Pending/conflict review | `gpp-pending-screen.test.tsx` | `offline-sync-ui.test.tsx`, `ajustes-screen.test.tsx` |
| Today boundary regression | `today-screen.test.tsx` or `mobile-gpp-navigation.test.tsx` | existing Today route assertions |

## Source Constraints For Executors

- Read `18-UI-SPEC.md` before touching any screen.
- Read Phase 17 `17-SUMMARY.md` before calling API routes; do not redesign the Phase 17 GPP backend.
- Do not add a third-party UI, routing, icon, chart, animation, or dashboard library.
- Do not change mobile Expo version/build numbers in Phase 18.
- Do not integrate GPP actions into `TodayScreen`; Phase 19 owns that.
- Do not treat realtime refresh hints as authoritative success.
