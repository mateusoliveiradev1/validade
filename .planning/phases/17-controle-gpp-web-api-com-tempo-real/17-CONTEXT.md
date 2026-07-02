# Phase 17: Controle GPP Web API com tempo real - Context

**Gathered:** 2026-07-02T17:23:47.5634813-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 17 creates the additive web/API foundation for Controle GPP. It delivers central-first contracts, database persistence, backend permissions, audit trail, idempotent writes, feature flag gating, the initial web GPP work surface, and store-scoped realtime refresh hints.

This phase proves the GPP backend and web workflow without changing the tested mobile build `0.12.0-170`, without adding the mobile GPP entry, and without integrating new actions into `Hoje`. The source of truth is always the central database. Realtime only accelerates visibility after central success.

Out of scope for Phase 17:
- new mobile Controle GPP screens;
- new `Hoje` actions for avaria/reaproveitamento/producao;
- changing current validity/sync semantics in build 170;
- automatic ERP/stock/system baixa;
- replacing the physical caderno/caixa on day one;
- using realtime events as success proof.

</domain>

<decisions>
## Implementation Decisions

### Fila web do GPP
- **D-01:** The web `Avarias` tab starts from sectors because the physical GPP workflow is organized by setor/caderno/caixa.
- **D-02:** The sector with the highest pending workload opens automatically on first load. Other sectors stay visible as summaries.
- **D-03:** Inside each sector, entries are grouped by `codigo/produto`. The product code is the primary operational key because GPP needs it for baixa.
- **D-04:** Each group on the main list shows an operational summary: code/product, sector, finality, total quantity/unit, number of entries, divergence count, latest activity time, and quick actions.
- **D-05:** The main list actions are `Baixar`, `Detalhes`, and `Divergencia`. It must stay dense and work-focused, not a decorative dashboard or heavy table.
- **D-06:** Group baixa is allowed, but only after a short confirmation showing sector, code/product, total, finality, number of entries, and the warning that later changes require estorno/correcao.
- **D-07:** `Detalhes` opens a side panel, not a separate page. The side panel shows group summary at the top, individual entries in the middle, audit/history at the end, and fixed footer actions: `Baixar`, `Divergencia`, `Fechar`.
- **D-08:** Individual baixa remains available from details for cases where GPP needs to work line by line.

### Modelo operacional
- **D-09:** `Avaria` is the primary GPP record. In the GPP model, `perda` is not the top-level type; vencimento/perda from validity becomes avaria by reason/finality later.
- **D-10:** `Reaproveitamento`, `Producao interna`, and `Transferencia` are movements linked to an avaria, not independent records.
- **D-11:** The central backend calculates saldo as original avaria quantity minus linked movements. A movement cannot exceed the remaining saldo.
- **D-12:** The final GPP baixa must show what was baixado and the remaining saldo/finality at the time of baixa.
- **D-13:** `Compras internas` are a separate flow from avaria. They handle good product requested by a sector and must not resolve validity risk or hide avaria.
- **D-14:** Purchase requests support `Solicitado pelo setor -> Atendido`, plus exception states `Atendido parcial`, `Sem produto`, and `Cancelado`.
- **D-15:** Avaria lifecycle is `Pendente -> Divergencia -> Corrigido -> Revisado pelo GPP -> Baixado`.
- **D-16:** A normal avaria can also go from `Pendente -> Baixado` when no divergence exists. Divergent items cannot be baixados until corrected and reviewed by GPP.
- **D-17:** `Cancelado` and administrative `Estornado/Correcao administrativa` exist as exceptional audited paths, not as silent edits.

### Permissoes e auditoria
- **D-18:** Add a new role `gpp` instead of reusing `lead` or `admin`. GPP needs operational baixa permissions without inheriting leadership or governance powers.
- **D-19:** Add GPP-specific capabilities, expected shape: read GPP store queue, mark divergence, review correction, close/baixar avaria, attend purchase request, and read GPP history. Exact capability names are planner discretion.
- **D-20:** All permission rules are enforced in the backend. UI hiding buttons is only ergonomics, never authorization.
- **D-21:** A collaborator can create entries and correct only entries they created while those entries are still `Pendente`.
- **D-22:** Leadership can correct entries in their authorized store/sector responsibility.
- **D-23:** GPP can mark divergence, review corrections, baixado/finalize, attend purchases, and make small corrections only with justification.
- **D-24:** A `Baixado` item cannot be directly edited. Any later problem becomes estorno/correcao administrativa with mandatory justification and audit event.
- **D-25:** Audit must capture every important operational event: created, edited, divergence marked, corrected, reviewed by GPP, baixado, canceled, estornado, purchase attended, purchase partial, purchase without product, and administrative correction.
- **D-26:** Audit events need actor, role snapshot, store, sector when relevant, target id, previous/next meaningful values, central timestamp, idempotency key, and justification when required.

### Tempo real e feedback de central
- **D-27:** Online web/API actions can show success only after the central database confirms. No optimistic success for GPP writes in this phase.
- **D-28:** During a write, the UI shows central-explicit progress such as `Salvando na central...`.
- **D-29:** If the central write succeeds, the UI shows `Registrado na central` or the action-specific equivalent.
- **D-30:** If the central write fails, the UI shows `Falha na central` and leaves the work visible/retryable. It must not call the action synced or successful.
- **D-31:** The API publishes realtime events only after central commit succeeds.
- **D-32:** Realtime events are lightweight refresh hints, for example `gpp_entries_changed` or `gpp_purchase_requests_changed`. They do not carry authoritative UI state.
- **D-33:** Web/mobile clients receiving a realtime event must re-read the central snapshot before changing visible truth.
- **D-34:** If realtime disconnects or event publish fails after the database saved, the data remains saved and recoverable by `Atualizar` or polling fallback.
- **D-35:** The web surface must show `Tempo real pausado`, `Atualizado ha Xs`, and a manual `Atualizar` path when realtime is not active.
- **D-36:** `Sem internet: pendente neste aparelho` is valid only for future mobile/offline work. Phase 17 web/API should stay central-first and fail closed when central is unavailable.

### the agent's Discretion
- The planner may choose exact table names, service boundaries, route names, query indexes, pagination/cursor strategy, and whether the web GPP route is a sibling of Command Center routes or a dedicated route group.
- The planner may choose exact capability names and status enum names as long as the role/capability separation and backend authorization rules above hold.
- The planner may choose whether realtime is implemented with Cloudflare Durable Objects/WebSocket Hibernation, SSE, or a temporary polling adapter first, as long as events are post-commit refresh hints and the user-visible behavior matches the locked decisions.
- The planner may choose exact test layering, but must cover contracts, repository constraints, idempotency, permissions, audit events, web queue behavior, and realtime fallback.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product decisions
- `.planning/ROADMAP.md` - Phase 17 goal, GPP-01..GPP-07 mapping, success criteria, and v1.2 rollout order.
- `.planning/REQUIREMENTS.md` - GPP requirements, especially GPP-01 through GPP-07.
- `.planning/PROJECT.md` - Core value, central truth, public repo constraints, cost-zero constraints, and existing milestone context.
- `.planning/notes/controle-gpp-exploracao.md` - Full product exploration for Controle GPP: avaria, reaproveitamento, producao interna, compras internas, permissions, realtime, UX, and rollout order.

### Prior phase handoff
- `.planning/phases/14-mobile-ajustes-and-device-controls/14-CONTEXT.md` - Mobile readiness and explicit central/local truth vocabulary.
- `.planning/phases/15-operational-surface-distillation/15-CONTEXT.md` - Current build/test boundary, lot/product policy, and strict operational readiness language.
- `.planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-CONTEXT.md` - Build 170 proof boundary and public-safe validation truth.

### Auth, roles, and permissions
- `packages/domain/src/authorization.ts` - Current roles, capabilities, store-scoped authorization, and role capability mapping.
- `packages/contracts/src/authorization.ts` - Runtime schemas for roles, capabilities, session actions, membership, and client-safe denial.
- `packages/contracts/src/authentication.ts` - Invite, login, first access, create invite, and role-bearing invite contracts.
- `apps/api/src/auth.ts` - API authorization service, session context action derivation, default memberships, and denial messages.
- `apps/api/src/memberships.ts` - Store membership management, idempotent role grants, role changes, revocation, and membership audit.

### API, audit, and central truth patterns
- `apps/api/src/index.ts` - Hono app composition, route registration style, runtime config, auth providers, repository wiring, and central service patterns.
- `apps/api/src/audit.ts` - Audit repository/service, appendWithMutation idempotency pattern, protected task action audit, and store query patterns.
- `apps/api/src/command-center.ts` - Central-first projection, fail-closed behavior, approved build config, and capture-backed service style.
- `packages/database/src/schema.ts` - Database schema source for additive table definitions.
- `packages/database/drizzle/` - Existing migration numbering and SQL migration style.
- `packages/database/src/*-repository.ts` - Repository interfaces and Neon/in-memory repository pattern to follow for GPP repositories.

### Web shell and UI integration
- `apps/web/src/App.tsx` - Session loading, route selection, authorization gating, and authenticated fetch wiring.
- `apps/web/src/shell/AppShell.tsx` - Current shell navigation, role label, route gating, mobile menu, and route pattern.
- `apps/web/src/command-center/CommandCenter.tsx` - Existing web operational route container pattern.
- `apps/web/src/command-center/OperacaoRoute.tsx` - Dense operational web route style.
- `apps/web/src/command-center/command-center-client.ts` - Fetch client and Zod parse pattern for central projections.
- `apps/web/src/audit/AuditWorkbench.tsx` - Existing audit table/detail patterns that may inform GPP history surfaces.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/domain/src/authorization.ts` already models capabilities and role checks; Phase 17 can extend it with `gpp`.
- `packages/contracts/src/authorization.ts` already derives session actions from capabilities; Phase 17 should add GPP action booleans or route checks without weakening existing actions.
- `apps/api/src/memberships.ts` already has idempotent membership mutations and membership audit events; GPP invite/role support should follow this pattern.
- `apps/api/src/audit.ts` already has `appendWithMutation`, useful for idempotent write plus audit in one service path.
- `apps/api/src/command-center.ts` shows the fail-closed central projection style that GPP should mirror when central reads fail.
- `apps/web/src/App.tsx` and `apps/web/src/shell/AppShell.tsx` provide the route and shell pattern for adding Controle GPP behind authorization and feature flag.
- `apps/web/src/audit/AuditWorkbench.tsx` can inform the detail/history portions of the GPP side panel.

### Established Patterns
- Central truth, transport success, and business resolution are separate states.
- Public/user-facing success requires central acknowledgement, not local state or event delivery.
- Store scope is enforced on the backend by membership/capability checks.
- Audit events are append-only and use idempotency keys to avoid duplicate mutation effects.
- Web operational surfaces should be dense, direct, and action-oriented rather than decorative dashboards.
- Current build 170 validation remains isolated from future GPP work.

### Integration Points
- Add `gpp` role and GPP capabilities in the domain and contract layers.
- Extend invite/membership flows so admin can invite a GPP user to a specific store.
- Add GPP contracts for avaria entries, avaria movements, purchase requests, statuses, filters, list responses, mutations, and realtime event names.
- Add additive database tables and repositories for GPP avarias, movements, purchase requests, and GPP audit or audit linkage.
- Add API services/routes for listing queues, creating/updating entries, marking divergence, reviewing correction, baixando, and attending purchases.
- Add web route/navigation for Controle GPP gated by `controle_gpp_enabled` and GPP capabilities.
- Add realtime room/publisher abstraction where API publishes after central commit and clients re-read central state on event receipt.

</code_context>

<specifics>
## Specific Ideas

- Main web title should be close to `Controle GPP - Loja 18` or the active store name.
- Top of the web route should show date, central update state, realtime state, search, and `Atualizar`.
- Tabs should be `Avarias`, `Compras internas`, `Divergencias`, and `Historico`.
- Empty state: `Nenhuma pendencia GPP agora` and `Quando um setor registrar avaria ou solicitacao, ela aparece aqui.`
- Central unavailable state: `Central indisponivel` and `Nao foi possivel carregar as pendencias do GPP. Tente atualizar antes de baixar.`
- Realtime paused state: `Tempo real pausado` and `A tela continua atualizando quando voce tocar em Atualizar.`
- Never show success when central did not confirm.

</specifics>

<deferred>
## Deferred Ideas

- Mobile Controle GPP belongs to Phase 18.
- Integrating `Hoje` actions with GPP avaria/reaproveitamento/producao belongs to Phase 19.
- Realtime for `Hoje` belongs to Phase 20 after GPP realtime proves stable.
- Reducing or removing the physical caderno/caixa is a later rollout decision after app-vs-physical consistency is validated with GPP.

</deferred>

---

*Phase: 17-Controle GPP Web API com tempo real*
*Context gathered: 2026-07-02T17:23:47.5634813-03:00*
