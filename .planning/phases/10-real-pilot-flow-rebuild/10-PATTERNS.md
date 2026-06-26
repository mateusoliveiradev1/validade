---
phase: 10
slug: real-pilot-flow-rebuild
status: planned
created: 2026-06-26
---

# Phase 10 Pattern Map

## Files To Touch

| Target | Role | Closest Analog | Pattern To Preserve |
|---|---|---|---|
| `packages/contracts/src/capture.ts` | Central catalog, lot, observation, prepare-turn contracts | `tasks.ts`, `sync.ts` | Strict Zod schemas, inferred types, bounded strings, no privileged client role/store claims. |
| `packages/contracts/src/sync.ts` | Central sync taxonomy/result extensions | Existing sync schemas | Reject raw evidence/storage fields; ack/conflict/retry are explicit. |
| `packages/contracts/src/command-center.ts` | Web/mobile shared projection | Existing Command Center schema | Dense operational projection, not analytics vocabulary. |
| `packages/domain/src/tasks.ts` | Terminal action and projection policy | Existing required-resolution matrix | Pure helpers only; no Zod, Hono, database, or UI imports. |
| `packages/database/src/schema.ts` | Central product/lot/task/sync tables | Existing auth/audit/evidence/close schema | Store-scoped indexes, idempotency keys, immutable audit-friendly rows. |
| `packages/database/drizzle/*phase_10*.sql` | Postgres migration | Phase 08/09 migrations | No secrets, comments for auditability, constraints for store/idempotency. |
| `packages/database/src/capture-repository.ts` | Central capture repository | `shift-close-repository.ts`, `membership-repository.ts` | Repository hides Drizzle/Neon; tests cover idempotency and store scope. |
| `apps/api/src/capture.ts` | Capture service and routes | `shift-close.ts`, `evidence.ts` | Service injection, runtime parsing, authorization before repository access. |
| `apps/api/src/index.ts` | Route composition | Existing route registration | Keep composition readable; services constructed once. |
| `apps/api/src/command-center.ts` | Central projection service | Existing audit-backed service | Fail closed when central facts are missing; safe only from current projection. |
| `apps/mobile/src/capture/repository.ts` | Local/central port | Existing sync/evidence/shift ports | Add methods without leaking fetch/Neon/SQLite internals. |
| `apps/mobile/src/capture/sqlite-repository.ts` | Local cache/outbox hydration | Existing sync command and task row mapping | Transactions plus Zod mapping; local save never equals central ack. |
| `apps/mobile/src/capture/http-sync-transport.ts` | Authenticated transport | Existing fetch transport | Absolute API URL, bearer/session scope, strict response parsing. |
| `apps/mobile/src/capture/CaptureApp.tsx` | Prepare-turn route and session propagation | Existing route stack and AuthGate child | Hoje remains first operational cockpit after preparation. |
| `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` | Unified search/reuse/create path | Existing discovery shortcuts | Similar match and draft review are explicit; no forced lot creation. |
| `apps/mobile/src/capture/LotRegistrationScreen.tsx` | Central lot save and ack state | Existing local lot form | Preview remains local; central ack controls active state. |
| `apps/mobile/src/capture/TaskResolutionPanel.tsx` | Terminal resolution copy/state | Existing offline save behavior | Destructive actions require confirmation and central ack truth. |
| `apps/mobile/src/capture/ShiftCloseScreen.tsx` | Central close readiness | Existing shift close flow | Safe close requires central revalidation; unsafe close remains explicit. |
| `apps/web/src/command-center/CommandCenter.tsx` | Central pilot command center | Existing funnel | Preserve dense operational scan, not marketing/dashboard cards. |

## Existing Patterns To Reuse

- Contracts live in `packages/contracts/src/*`, use `.strict()`, and reject extra
  fields at runtime boundaries.
- Domain helpers export const vocabularies plus pure functions with focused
  Vitest coverage.
- API modules expose small services with injectable repositories and clocks.
- Database repositories expose intent-focused methods and keep SQL/Drizzle out
  of domain and contracts.
- Mobile SQLite methods initialize idempotently, use `withTransactionAsync` for
  coupled writes, and parse rows through shared contracts.
- Mobile components use PT-BR operational copy, large actions, status notices,
  and text labels for state rather than color-only meaning.
- Web uses shadcn/Radix/lucide primitives and `apps/web/src/index.css` tokens.

## Landmines

- Do not treat local SQLite rows as central truth after a central repository
  exists.
- Do not accept `storeId`, `role`, or `capabilities` from client payloads as
  authority.
- Do not mark an action resolved before central acknowledgement.
- Do not remove a lot from active risk when sync returns retry or conflict.
- Do not infer Command Center `safe` from absence of audit events.
- Do not use sales, stock, ERP, POS, supplier, BI, or forecast data.
- Do not commit real store names, Expo build URLs, connection strings, tokens,
  raw device URIs, signed URLs, or evidence binaries.
- Do not make product draft review optional when similar products exist.
- Do not let admin role imply lead authority for operational close/action in a
  store.
