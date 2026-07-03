# Phase 18: Controle GPP Mobile para avaria e compras internas - Context

**Gathered:** 2026-07-02T23:25:25.5488676-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 adds the mobile Controle GPP entry for sector operators and GPP users. It delivers role-aware navigation, a mobile hub for `Registrar avaria`, `Solicitar compra interna`, `Minhas pendencias`, and `Enviadas hoje`, central-confirmed submission feedback, and honest local-pending behavior only when the device is truly offline.

This phase consumes the Phase 17 central GPP contracts/API foundation. It does not integrate GPP actions into `Hoje`, does not create avaria automatically from validity tasks, does not change safe-close semantics, and does not make realtime for `Hoje`. Phase 19 owns `Hoje` integration; Phase 20 owns `Hoje` realtime.

</domain>

<decisions>
## Implementation Decisions

### Entrada mobile do Controle GPP
- **D-01:** A user whose active role is `gpp` opens directly into Controle GPP after login instead of starting on `Hoje`.
- **D-02:** Collaborators and leadership keep `Hoje` as the daily validation surface and access Controle GPP through a separate app entry, not through buttons mixed into `Hoje`.
- **D-03:** The first Controle GPP screen is a hub with four primary entries: `Registrar avaria`, `Solicitar compra interna`, `Minhas pendencias`, and `Enviadas hoje`.
- **D-04:** The app hides the Controle GPP entry when `controle_gpp_enabled` is false or the session lacks the required GPP action/capability. Backend authorization remains mandatory; hiding is only UX.

### Registro de avaria no mobile
- **D-05:** Avaria registration uses a short guided flow: product/code, quantity/unit, destination/finality, then review and central submission.
- **D-06:** The product step starts with product code. Product name/description is supporting confirmation copy, not the primary operational key.
- **D-07:** Product code is required for mobile avaria submission because GPP needs it for baixa and central grouping.
- **D-08:** Quantity and unit are required. Free-text quantities are not accepted for avaria submission.
- **D-09:** The mobile avaria finality options are the same four central options from Phase 17: `Baixa GPP`, `Reaproveitamento`, `Producao interna`, and `Transferencia`.
- **D-10:** Missing product code, quantity/unit, or required destination/finality blocks submission instead of creating an incomplete GPP pending item.

### Compra interna no mobile
- **D-11:** Internal purchase requests start from product name/description, with product code optional until GPP service confirms or corrects it.
- **D-12:** A purchase request must include description/name, quantity/unit, and finality before submission.
- **D-13:** Online purchase submission shows success only after central acknowledgement. Before that, the UI should say it is sending/saving to central.
- **D-14:** `Minhas pendencias` tracks purchase requests with simple sector-facing statuses: `Enviada`, `Atendida`, `Parcial`, `Sem produto`, and `Cancelada`, plus item and time.
- **D-15:** Mobile should not become the full GPP attendance surface in this phase. Detailed baixa, divergence, and full audit remain primarily web/GPP surfaces from Phase 17 unless the planner needs minimal mobile read-only support for status clarity.

### Offline e pendente neste aparelho
- **D-16:** Local pending GPP records are allowed only during real offline use, when the device cannot reach central because of network availability.
- **D-17:** A central validation error, authorization denial, feature-flag denial, or business-rule rejection must not be converted into local success.
- **D-18:** The required copy for local GPP records is `Pendente neste aparelho`. It must not imply that GPP or central already received the record.
- **D-19:** Pending GPP records use an idempotent local queue with safe automatic retry when connectivity returns and a manual `Sincronizar` path.
- **D-20:** Retry must not create duplicates. Idempotency keys travel with each local pending avaria or purchase request.
- **D-21:** If central rejects a pending local GPP record after retry, it becomes a reviewable conflict in `Minhas pendencias`.
- **D-22:** Reviewable conflicts keep the physical fact visible and offer correction/retry or discard with justification. They are not discarded automatically and are not retried forever without user-visible state.

### the agent's Discretion
- The planner may choose exact component names, route names, local repository shape, storage table names, and whether to extend the existing sync engine or add a GPP-specific queue adapter first.
- The planner may choose exact visual layout for the hub and forms, but it must stay mobile-first, one-hand friendly, direct, and consistent with existing mobile operational surfaces.
- The planner may choose exact copy around progress states as long as online success requires central acknowledgement and offline pending uses explicit `Pendente neste aparelho` semantics.
- The planner may choose exact test layering, but must cover role-aware entry, feature flag gating, avaria required fields, purchase required fields, central-confirmed feedback, offline-only local pending, idempotent retry, and conflict review.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product decisions
- `.planning/ROADMAP.md` - Phase 18 goal, GPP-08 mapping, success criteria, and phase boundaries with Phases 17, 19, and 20.
- `.planning/REQUIREMENTS.md` - GPP-08 requirement and v1.2 traceability.
- `.planning/PROJECT.md` - Core value, central truth, offline honesty, public repo, zero-cost, and no internal API constraints.
- `.planning/notes/controle-gpp-exploracao.md` - Original Controle GPP exploration covering physical caderno/caixa workflow, product codes, avaria as primary record, compras internas, and mobile/web split.
- `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-CONTEXT.md` - Locked Phase 17 decisions for central-first GPP contracts, permissions, audit, realtime refresh hints, and web/API boundary.
- `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-SUMMARY.md` - Completed Phase 17 implementation handoff and non-regression boundary for mobile/Hoje/offline work.

### GPP contracts, auth, and API
- `packages/contracts/src/gpp.ts` - GPP avaria, purchase, quantity, finality, central feedback, mutation response, realtime event, and request schemas.
- `packages/contracts/src/authorization.ts` - Session actions, feature flag normalization, `gpp` role compatibility, and GPP capability booleans.
- `packages/domain/src/authorization.ts` - Role/capability definitions and server-owned authorization capability vocabulary.
- `apps/api/src/gpp.ts` - Central-first API routes and mutation semantics to call from mobile.
- `apps/api/src/gpp-realtime.ts` - Realtime refresh-hint model that mobile can consume later without treating events as authoritative state.

### Mobile integration points
- `apps/mobile/src/capture/CaptureApp.tsx` - Current route stack, session bar, role-aware shell, and starting point for adding Controle GPP navigation.
- `apps/mobile/src/capture/AjustesScreen.tsx` - Existing session/account/readiness surface and current `gpp` role label compatibility.
- `apps/mobile/src/capture/repository.ts` - Mobile repository contracts, central/local sync metadata, pending central semantics, and task preservation patterns.
- `apps/mobile/src/capture/sync-engine.ts` - Existing idempotent sync-engine shape for pending local commands.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - Existing queue, conflict, retry, and discard-with-reason UI patterns to reuse or mirror.
- `apps/mobile/src/capture/today-copy.ts` - Existing central/local/offline copy vocabulary, including language that avoids fake central confirmation.
- `apps/mobile/src/capture/TodayScreen.tsx` - Daily validation surface that must remain separate from GPP actions in this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CaptureApp.tsx` already centralizes mobile route stack and session bar rendering. Phase 18 can add a Controle GPP route and adjust initial route selection for `activeRole: "gpp"`.
- `SessionContextResponse` already includes `featureFlags.controle_gpp_enabled` and GPP action booleans such as `canCreateGppEntry` and `canReadGppQueue`.
- `packages/contracts/src/gpp.ts` already defines `GppAvariaCreateRequestSchema`, `GppPurchaseCreateRequestSchema`, `GppMutationResponseSchema`, central feedback states, finalities, statuses, quantity units, and idempotency keys.
- `offline-sync-ui.tsx`, `sync-engine.ts`, and repository sync metadata already provide patterns for pending, retry, conflict review, and destructive discard with reason.
- `AjustesScreen.tsx` already displays the `gpp` role label, proving mobile session compatibility exists before the new route.

### Established Patterns
- Central acknowledgement, local persistence, transport sync, and business resolution are separate states.
- UI success must not be optimistic when the business fact requires central confirmation.
- Offline local state is allowed only with explicit copy that it is not central truth yet.
- Feature flags and capabilities are derived from server-owned session data. Client-visible actions are ergonomics, not authorization.
- `Hoje` stays focused on sales-area validity execution. GPP mobile is a separate operational entry.

### Integration Points
- Add route/state support for a mobile Controle GPP hub in `CaptureApp.tsx`.
- Add mobile GPP client/repository methods for creating avarias and purchase requests against the Phase 17 API contracts.
- Extend or mirror the existing sync queue for GPP local-pending avaria and purchase commands with idempotency keys.
- Add mobile UI/tests for role-aware initial route, hidden entry when disabled, hub actions, avaria wizard, purchase request form, central-confirmed feedback, offline pending, and conflict review.
- Keep `TodayScreen` changes limited to navigation separation, if any; no Phase 19 `Hoje` integration is allowed.

</code_context>

<specifics>
## Specific Ideas

- Recommended mobile hub labels: `Registrar avaria`, `Solicitar compra interna`, `Minhas pendencias`, and `Enviadas hoje`.
- Required local-pending copy: `Pendente neste aparelho`.
- Online progress copy should stay central-explicit, for example `Enviando para central...` then `Registrado na central` only after acknowledgement.
- Purchase status copy should stay simple for sector operators: `Enviada`, `Atendida`, `Parcial`, `Sem produto`, `Cancelada`.

</specifics>

<deferred>
## Deferred Ideas

- Creating GPP-linked records from `Hoje` after a validity task belongs to Phase 19.
- Extending realtime refresh hints to `Hoje` belongs to Phase 20.
- Making mobile the main GPP baixa/attendance surface is not part of this phase; web remains the primary GPP processing surface from Phase 17.

</deferred>

---

*Phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas*
*Context gathered: 2026-07-02T23:25:25.5488676-03:00*
