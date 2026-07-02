# Phase 17: Controle GPP Web API com tempo real - Patterns

**Mapped:** 2026-07-02
**Scope:** GPP contracts, authorization, database/repositories, API routes, realtime, web GPP route

## Pattern Map

| Target Area | Closest Existing Analog | Reuse Pattern |
|-------------|-------------------------|---------------|
| GPP role/capabilities | `packages/domain/src/authorization.ts` and tests | Extend enum/role map; test allowed and denied capabilities explicitly. |
| Session route gating | `packages/contracts/src/authorization.ts`, `apps/api/src/auth.ts`, `apps/web/src/App.tsx` | Add server-owned session actions and feature flag; route only from session truth. |
| Additive migrations | `packages/database/src/schema.ts`, `packages/database/drizzle/0016_*`, `0017_*` | Add Drizzle schema, SQL migration, enum additions, and schema tests. Use next migration number after existing `0017`. |
| Idempotent mutations | `membership-repository.ts`, `audit.ts`, `capture-repository.ts` | Store mutation receipt by idempotency key and return `replayed: true` without repeating side effects. |
| Store-scoped repositories | `capture-repository.ts`, `membership-repository.ts` | Every list/read/write includes `storeId`; SQL has store predicates and indexes. |
| Audit events | `apps/api/src/audit.ts`, `packages/database/src/audit-repository.ts` | Append-only event rows with actor/role/store/target/summary/metadata and safe bounded reason. |
| Fail-closed projections | `apps/api/src/command-center.ts` | Central read failures produce explicit unavailable state, not fake empty success. |
| Web route shell | `apps/web/src/App.tsx`, `apps/web/src/shell/AppShell.tsx` | Add a first-class route gated by action + feature flag; default GPP users to GPP route. |
| Dense web UI | `OperacaoRoute.tsx`, `AuditWorkbench.tsx` | Bordered panels, compact rows, sheets/dialogs, no nested card stacks, no decorative metrics. |
| Web client parsing | `command-center-client.ts` | Fetch, parse with Zod, throw public copy on failure. |
| Realtime fallback | Existing refresh buttons and client refresh timestamps | Realtime events trigger re-read; manual refresh/polling remains visible and usable. |

## Component Responsibilities

| File | Role | Phase 17 Guidance |
|------|------|-------------------|
| `packages/domain/src/authorization.ts` | Role/capability source | Add `gpp` and GPP capabilities; deny shift/user/admin capabilities by default. |
| `packages/domain/src/authorization.test.ts` | Capability matrix tests | Prove collaborator/lead/gpp/admin separation, including no implicit leadership for GPP. |
| `packages/contracts/src/authorization.ts` | Runtime role/session action schema | Add GPP actions and feature flag fields with backward-safe normalization. |
| `packages/contracts/src/gpp.ts` | New GPP runtime contract | Strict status, queue, mutation, audit/history, and realtime event schemas. |
| `packages/contracts/src/index.ts` | Contract exports | Export GPP schemas/types for API and web. |
| `packages/contracts/src/gpp.test.ts` | Contract invariants | Validate lifecycle rules, product code rules, purchase code confirmation, no optimistic success fields. |
| `packages/database/src/schema.ts` | DB schema source | Add additive GPP tables/enums/types and export records. |
| `packages/database/drizzle/*` | SQL migration | Add next-numbered migration, enum additions, indexes, constraints, no destructive changes. |
| `packages/database/src/gpp-repository.ts` | Persistence boundary | Implement in-memory and Neon repository adapters with idempotency and store scope. |
| `packages/database/src/repositories.test.ts` | Repository behavior | Add SQL-shape and in-memory tests for saldo, status transitions, idempotency, store isolation. |
| `apps/api/src/gpp.ts` | API service/routes | Authorize, validate, mutate central DB, append audit, publish realtime after commit. |
| `apps/api/src/index.ts` | App composition/runtime config | Register GPP routes behind `controle_gpp_enabled`; wire repository/publisher. |
| `apps/api/src/gpp.test.ts` | API behavior tests | Cover permissions, central failure, replay, audit, realtime post-commit, flag-off behavior. |
| `apps/api/src/gpp-realtime.ts` | Realtime transport | Implement publisher abstraction, in-memory publisher, DO room route, and fallback/no-op behavior. |
| `apps/api/wrangler.toml` | Worker bindings/config | Add public-safe default-off flag and Durable Object binding/migration if execution enables DO transport. |
| `apps/web/src/gpp/gpp-client.ts` | Web GPP client | Parse queue/history/mutation responses and expose write methods. |
| `apps/web/src/gpp/GppControlRoute.tsx` | User-facing route | Implement UI-SPEC tabs, sector groups, details sheet, dialogs, central feedback, realtime status. |
| `apps/web/src/gpp/gpp-realtime.ts` | Web realtime hook/client | Connect WebSocket when available, mark paused on failure, and refresh central snapshot on events. |
| `apps/web/src/App.tsx` | Route selection | Route GPP users to `controle-gpp` first and keep hidden if flag/capability missing. |
| `apps/web/src/shell/AppShell.tsx` | Navigation | Add `Controle GPP` nav item with lucide icon and feature/capability gating. |
| `apps/web/src/gpp/GppControlRoute.test.tsx` | UI behavior | Assert queue, tabs, group baixa confirmation, detail sheet, central failure, realtime paused. |
| `apps/web/e2e/v1-readiness.spec.ts` | Route-level smoke | Add feature-flagged GPP navigation smoke without disturbing existing readiness flows. |

## Test Analogues

| Behavior | Existing Test File | Add/Update |
|----------|--------------------|------------|
| Authorization matrix | `packages/domain/src/authorization.test.ts` | Add GPP role capability allow/deny matrix. |
| Session actions | `apps/api/src/authorization.test.ts`, `packages/contracts/src/authentication.test.ts` | Add `canReadGppQueue`, write actions, and flag exposure. |
| Strict GPP contracts | `packages/contracts/src/command-center.test.ts`, `capture.test.ts` | New `gpp.test.ts` for schema/status/finality/realtime envelopes. |
| Migration/schema | `packages/database/src/schema.test.ts` | Assert new tables, indexes, enums, idempotency, and no destructive mobile tables. |
| Repository idempotency | `packages/database/src/repositories.test.ts` | Mirror membership/capture idempotency tests for GPP receipts. |
| API auth/store scope | `apps/api/src/capture.test.ts`, `authorization.test.ts` | Add API tests for role/store denial and no forged store/body authority. |
| API central-first writes | `apps/api/src/capture.test.ts` | Assert success only after repository write; failed write returns central failure and does not publish realtime. |
| Realtime hint semantics | New API/web tests | Assert payload lacks authoritative row state and client re-reads central snapshot. |
| Web route gating | `apps/web/src/command-center/command-center.test.tsx` | Add GPP route nav/default route tests. |
| Dense queue UI | `AuditWorkbench.test.tsx`, `command-center.test.tsx` | Add side sheet/dialog/focus/feedback tests for GPP. |

## Constraints For Executors

- Do not edit `apps/mobile` in Phase 17 unless a type export update is absolutely unavoidable; the intended phase is web/API only.
- Do not change existing Hoje, sync, prepare-turn, safe-close, or lot resolution semantics.
- Do not use `lead` or `admin` as a substitute for the new `gpp` role.
- Do not show success from WebSocket delivery, local state, or optimistic UI.
- Do not allow direct edits after baixa; use estorno/correcao administrativa with justification.
- Do not mix compras internas with avaria records.
- Do not create a new visual system, chart dashboard, nested card stack, or third-party data grid.
- Do not reuse migration number `0017`; inspect the actual migration directory first.
- Keep `controle_gpp_enabled` default off for current staging validation until explicitly enabled.
