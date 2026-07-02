# Phase 17: Controle GPP Web API com tempo real - Research

**Researched:** 2026-07-02
**Domain:** GPP web/API foundation, central-first persistence, store-scoped realtime refresh hints
**Confidence:** HIGH for local architecture and permission boundaries; MEDIUM-HIGH for Cloudflare Durable Object rollout because it requires Worker binding configuration during execution.

<user_constraints>
## User Constraints

### Locked Decisions

- **D-01..D-08:** Web `Avarias` starts by sector, opens the busiest sector first, groups by `codigo/produto`, keeps dense operational rows, supports grouped baixa with confirmation, and opens details in a side panel.
- **D-09..D-17:** `Avaria` is the primary record. Reaproveitamento, producao interna, and transferencia are movements linked to avaria. Compras internas are separate. Divergences block baixa until corrected and reviewed. Baixado items are not silently edited.
- **D-18..D-26:** Add role `gpp` and GPP-specific capabilities. Every permission rule is backend-enforced. Audit captures actor, role snapshot, store, sector, target, meaningful before/after values, central timestamp, idempotency key, and required justification.
- **D-27..D-36:** Web/API writes show success only after central database success. Realtime publishes after commit only and acts as a lightweight refresh hint. Clients must re-read central snapshots. Manual refresh/polling remains the fallback.
- `0.12.0` build `170` mobile validation remains untouched. Phase 17 must not modify the tested mobile flow or Hoje semantics.

### the agent's Discretion

- Exact route names, table names, query indexes, realtime transport, service boundaries, and capability names.
- Exact status enum names, as long as the lifecycle and permission behavior remain visible and audited.
- Exact test layering, as long as contracts, database constraints, idempotency, permission denial, audit events, web UI, and realtime fallback are covered.

### Deferred Ideas (OUT OF SCOPE)

- Mobile Controle GPP entry and offline local-pending behavior belong to Phase 18.
- Hoje integration for vencimento/reaproveitamento/producao belongs to Phase 19.
- Realtime refresh for Hoje belongs to Phase 20.
- Replacing physical caderno/caixa is a later rollout decision after app-vs-physical consistency is proven.
</user_constraints>

<existing_code_findings>
## Existing Code Findings

| Area | Current State | Phase 17 Implication |
|------|---------------|----------------------|
| Authorization | `packages/domain/src/authorization.ts` has roles `collaborator`, `lead`, `admin` and role-to-capability maps. | Add `gpp` role and explicit GPP capabilities instead of borrowing lead/admin powers. |
| Session actions | `packages/contracts/src/authorization.ts` derives server-owned `SessionActions`. | Add GPP action booleans plus feature flag exposure so web route gating is contract-backed. |
| API auth | `apps/api/src/auth.ts` resolves memberships, capabilities, and session context from backend state. | GPP writes must reuse `authorizeRequest`/authorization service and never trust client role/store input. |
| Memberships | `packages/database/src/schema.ts` uses Postgres enum `membership_role`; current DB migration list already has `0017_phase_17_shift_turn_starts.sql`. | GPP migration must use the next available migration number and `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'gpp'`. |
| Audit | `apps/api/src/audit.ts` exposes `appendWithMutation` and in-memory/database repositories. | GPP mutations should wrap database writes and audit append through idempotent mutation paths. |
| Central projections | `apps/api/src/command-center.ts` fails closed when central reads fail. | GPP queue reads should fail closed with `Central indisponivel` instead of returning fake-empty success. |
| Web shell | `apps/web/src/App.tsx` and `AppShell.tsx` route from session actions. | `Controle GPP` route should be first route for `gpp`, hidden/default-off when flag or capability is missing. |
| Web design | `OperacaoRoute.tsx`, `AuditWorkbench.tsx`, and shadcn primitives provide dense panels, side sheets, buttons, badges, skeletons, and tests. | Reuse existing primitives; do not add dashboard packages, data-grid packages, or new visual system. |
</existing_code_findings>

<realtime_research>
## Realtime Research

Cloudflare Durable Objects are a good fit for store-scoped realtime rooms because Durable Objects can act as WebSocket servers and coordinate connected clients by room. The official docs list two WebSocket APIs and recommend the Hibernation WebSocket API because clients can remain connected while the Durable Object sleeps when idle, reducing billable duration. The docs also show that Worker-to-Durable-Object WebSocket setup requires a Durable Object binding and Wrangler migration entry.

Phase 17 should not let realtime become a second source of truth. The right implementation shape is:

1. API writes commit central Postgres state first.
2. The service appends audit/idempotency records in the same mutation flow.
3. After commit success, the service calls a `GppRealtimePublisher`.
4. The publisher emits a lightweight event such as `gpp_entries_changed` with store id, event kind, and occurred-at.
5. Web clients receiving the event call the normal central snapshot endpoint again.
6. If the WebSocket/DO binding is unavailable, publishing degrades to no-op and the web client shows `Tempo real pausado` with manual refresh/polling.

This preserves cost-zero pilot behavior because idle hibernated connections avoid duration charges, and it preserves correctness because the central database remains authoritative.
</realtime_research>

<recommended_architecture>
## Recommended Architecture

### Contracts First

Create `packages/contracts/src/gpp.ts` with strict Zod schemas for:

- avaria entry input, status, reason/finality, movement, group, queue snapshot, detail snapshot, audit/history items;
- purchase request input, status, attendance outcomes, and queue snapshot;
- write responses with `replayed`, `centralStatus`, `refreshedAt`, and action-specific message;
- realtime event names and envelope;
- feature flag/session action additions.

### Persistence

Add additive schema and migration for:

- `gpp_avaria_entries` as the primary record;
- `gpp_avaria_movements` linked to avaria entries and saldo calculation;
- `gpp_purchase_requests` for good-product requests;
- `gpp_mutation_receipts` for idempotency/replay across avaria, movement, purchase, and baixa operations.

Use store-scoped indexes, idempotency unique indexes, status indexes, and no destructive deletes. Add `gpp.changed` to the audit event enum or encode GPP events through a bounded compatible audit type only if the enum strategy requires it.

### API

Create `apps/api/src/gpp.ts` with a service/repository boundary and register routes in `index.ts` behind:

- `controle_gpp_enabled` runtime config default false;
- backend store-scope authorization;
- GPP capabilities for read, divergence, review, baixa, purchases, corrections, and history.

Writes must be central-first and return failure if central persistence fails. No optimistic success.

### Web

Create `apps/web/src/gpp/*` for the client and route:

- page header with central freshness, realtime state, search, and `Atualizar`;
- tabs `Avarias`, `Compras internas`, `Divergencias`, `Historico`;
- sector-first panels and product-code grouped rows;
- confirmation dialog for grouped baixa;
- details/divergence side sheets;
- explicit central feedback (`Salvando na central...`, `Registrado na central`, `Falha na central`).

### Realtime

Implement a transport boundary:

- `GppRealtimePublisher` in API with in-memory test publisher and Worker/DO publisher.
- `/gpp/realtime?storeId=...` WebSocket route that only allows users with GPP read capability.
- `useGppRealtime`/client helper in web that treats events as refresh hints.
- polling/manual refresh fallback if WebSocket is unavailable.
</recommended_architecture>

<plan_shape>
## Recommended Plan Shape

```text
17-01 Contracts, role, capabilities, and feature flag
17-02 Database schema, migration, repository, idempotency, and audit persistence
17-03 API GPP service and central-first routes
17-04 Store-scoped realtime publisher, Durable Object room, and fallback contract
17-05 Web Controle GPP route, client, queue UI, and central feedback
17-06 Verification, rollout fence, docs, and build-170 non-regression gate
```
</plan_shape>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: GPP Role Inherits Leadership

**What goes wrong:** GPP is represented as `lead` or `admin`, accidentally gaining shift close, user management, or governance authority.
**Avoidance:** Add `gpp` role and capability tests proving it can read/operate GPP but cannot manage users, close shifts, or govern policy unless separately granted.

### Pitfall 2: Event Delivery Looks Like Success

**What goes wrong:** Web updates a row from realtime payload and says `baixado` before central re-read.
**Avoidance:** Event payloads are hints only; UI re-fetches central snapshot before changing truth.

### Pitfall 3: Baixado Gets Edited Directly

**What goes wrong:** A post-baixa correction overwrites the original record and audit cannot explain what happened.
**Avoidance:** Locked status machine plus estorno/correcao administrativa with required justification and linked audit event.

### Pitfall 4: Purchases Mix With Avaria

**What goes wrong:** Good product requested by a sector appears as avaria/perda and distorts GPP baixa.
**Avoidance:** Separate purchase request contracts/table/statuses; product code can be optional at request time but required before final attendance.

### Pitfall 5: Migration Number Collision

**What goes wrong:** Executor creates `0017_phase_17_gpp.sql` even though `0017_phase_17_shift_turn_starts.sql` exists.
**Avoidance:** Use next migration number after inspecting `packages/database/drizzle/meta/_journal.json` and existing files.
</common_pitfalls>

<validation_architecture>
## Validation Architecture

| Layer | Command | Coverage Target |
|-------|---------|-----------------|
| Domain | `cmd /c pnpm.cmd --filter @validade-zero/domain test` | GPP role/capability matrix and denial semantics. |
| Contracts | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | Strict GPP schemas, status machines, central feedback/realtime envelopes, session actions. |
| Database | `cmd /c pnpm.cmd --filter @validade-zero/database test` | Additive schema, migration SQL, store scope, idempotency, saldo, lifecycle constraints. |
| API | `cmd /c pnpm.cmd --filter @validade-zero/api test` | Authorization, central-first writes, idempotency replay, audit events, failure paths, realtime publish-after-commit. |
| Web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | GPP route gating, tabs, grouped baixa, details, divergence, realtime paused/active states, central failure. |
| E2E | `cmd /c pnpm.cmd test:e2e:web` | Feature-flagged navigation and basic GPP queue journey. |
| Full gate | `cmd /c pnpm.cmd check` | Repo integration before verification. |
</validation_architecture>

<manual_only_verification>
## Manual-Only Verification Candidates

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Real GPP user working from a store desk with physical labels/caixa | GPP-07 | Repo tests can prove UI/permissions, but not physical desk workflow. |
| Cross-device realtime perception in the store | GPP-06 | Automated tests can simulate events; real network/device perception needs staging/browser validation. |
| Physical caderno/caixa consistency during rollout | GPP-01..GPP-07 | Phase 17 intentionally keeps the physical fallback until store validation proves replacement. |
</manual_only_verification>

<sources>
## Sources

### Local Primary Sources

- `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-CONTEXT.md`
- `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-UI-SPEC.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `packages/domain/src/authorization.ts`
- `packages/contracts/src/authorization.ts`
- `apps/api/src/auth.ts`
- `apps/api/src/audit.ts`
- `apps/api/src/command-center.ts`
- `packages/database/src/schema.ts`
- `packages/database/drizzle/`
- `apps/web/src/App.tsx`
- `apps/web/src/shell/AppShell.tsx`
- `apps/web/src/command-center/OperacaoRoute.tsx`
- `apps/web/src/audit/AuditWorkbench.tsx`

### External Primary Sources

- Cloudflare Durable Objects WebSockets docs: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare Durable Objects overview: https://developers.cloudflare.com/durable-objects/
- Cloudflare WebSocket Hibernation example: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
</sources>

<metadata>
## Metadata

**Research scope:** local codebase plus official Cloudflare Durable Objects/WebSocket Hibernation docs.
**Valid until:** 2026-07-31
**Ready for planning:** yes
</metadata>

---

*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Research completed: 2026-07-02*
*Ready for planning: yes*
