# Phase 19: Integração do Controle GPP com Hoje - Context

**Gathered:** 2026-07-10
**Status:** Ready for UI specification; planning and execution remain gated by Phase 18 gap closure

<domain>
## Phase Boundary

Phase 19 integrates terminal `Hoje` task resolution with GPP records for `Registrar avaria por vencimento`, `Enviar para reaproveitamento`, and `Enviar para produção interna`. The product must be confirmed out of the sales area before the physical risk is resolved, while delivery and central acknowledgement of the linked GPP record remain a separate, truthful state.

`Confirmar esgotado` remains a separate terminal action and never creates a GPP baixa. Internal purchases remain in the separate Controle GPP surface. Full mobile GPP central operation belongs to Phase 20, realtime refresh for `Hoje` belongs to Phase 21, and build 170 must remain untouched until a later deliberate build and validation decision.

Phase 19 depends on Phase 18. The `18-06-PLAN.md` conflict-discard gap and the subsequent Phase 18 verification must be closed before Phase 19 planning or execution is treated as unblocked.

</domain>

<decisions>
## Implementation Decisions

### Sequência da retirada até o GPP
- **D-01:** GPP destination choices appear only after the operator explicitly confirms that the product was physically removed from the sales area, within the same terminal-resolution flow.
- **D-02:** The terminal choices are explicit: `Registrar avaria`, `Enviar para reaproveitamento`, `Enviar para produção interna`, and the separate `Confirmar esgotado` action.
- **D-03:** A linked GPP record is required when physical product was found and removed. `Confirmar esgotado` does not create a GPP record or baixa.
- **D-04:** Before submission, the operator reviews the linked lot, product code, quantity/unit, and destination/finality.

### Quando o risco sai do Hoje
- **D-05:** The sales-area risk is resolved after explicit physical-removal confirmation; it does not wait for central GPP acknowledgement.
- **D-06:** The explicit confirmation is `Confirmo que a quantidade informada saiu da área de venda`, while preserving any evidence requirement already imposed by the original task.
- **D-07:** A partial withdrawal creates a GPP movement only for the removed quantity and keeps the remaining quantity active as risk in `Hoje`.
- **D-08:** A GPP rejection does not automatically reopen a physically resolved risk. Reopen only when the conflict indicates that product or quantity remains in the sales area.
- **D-09:** Physical-risk resolution and GPP delivery status are presented as separate truths; transport or central processing cannot silently hide a still-physical risk.

### Quantidade, código e vínculo ao lote
- **D-10:** Product, product code, lot, and unit are prefilled from the `Hoje` task. Product and lot identity remain linked and are not freely editable in the GPP step.
- **D-11:** The pending quantity is prefilled and may be reduced for a partial withdrawal. A higher real quantity requires an explicit correction or reconference with retained history before submission.
- **D-12:** A missing or invalid product code blocks GPP submission and asks for entry or scanning. The physical removal remains recorded separately with the explicit state `Falta informar o código`; this state must never use `Pendente neste aparelho`.
- **D-13:** Different lots always create separate movements, each retaining its source task, quantity, destination, actor, and acknowledgement state. Lots are never consolidated silently by product code.

### Offline, rejeição e retomada
- **D-14:** Only a real transport or reachability failure after valid data and confirmed removal may create a local GPP record marked `Pendente neste aparelho`.
- **D-15:** The local pending record retains the original payload, lot/task linkage, actor, and idempotency key; the physical removal remains resolved independently.
- **D-16:** Central validation, permission, feature, or business-rule rejection is not offline. Preserve the submitted data and reason in `Corrigir envio`, allowing review and resubmission without claiming local or central success.
- **D-17:** A conflict shows both the submitted and current central data. Correction and retry remain available; local discard requires a non-empty justification and never erases the physical-removal fact.
- **D-18:** Retry runs safely when connectivity returns or the app resumes and is also available through `Sincronizar pendências GPP`.
- **D-19:** Every retry reuses the original idempotency key. Success copy is allowed only after central `central_confirmed` or `replayed` acknowledgement.

### Inherited boundaries and gates
- **D-20:** Internal purchase requests stay outside `Hoje` and cannot resolve or hide vencido/sales-area risk.
- **D-21:** Phase 20 owns the full central GPP mobile queue and response actions; Phase 19 does not expand into that surface.
- **D-22:** Phase 21 owns realtime refresh hints for `Hoje`; Phase 19 must preserve existing refresh/fallback behavior.
- **D-23:** Do not change Expo/build identifiers, produce a new APK, push, or deploy the incomplete GPP track as part of this phase discussion. Build 170 semantics remain the approved baseline until a deliberate later release step.
- **D-24:** Close and verify the Phase 18 `18-06` gap before treating Phase 19 planning or execution as unblocked.

### the agent's Discretion
- Exact component, callback, route, repository method, and local table names.
- Exact placement and visual hierarchy of the terminal actions, subject to the required Phase 19 UI specification and the existing mobile design system.
- Exact retry trigger scheduling, provided automatic and manual retry remain idempotent and truthful.
- Supporting copy not locked above, provided it never conflates physical removal, local persistence, transport delivery, and central acknowledgement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and traceability
- `.planning/ROADMAP.md` — Phase 19 goal, success criteria, dependency on Phase 18, and boundaries with Phases 20 and 21.
- `.planning/REQUIREMENTS.md` — `GPP-09` requirement and milestone traceability.
- `.planning/PROJECT.md` — core physical-safety value, mobile-first constraint, central truth, offline resilience, and build/release constraints.

### Phase 18 inherited contract and active gate
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-CONTEXT.md` — central-ack, offline-only local pending, idempotency, conflict review, and prior `Hoje` boundary decisions.
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-UI-SPEC.md` — approved GPP mobile interaction, status, copy, and visual patterns to extend rather than replace.
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-PATTERNS.md` — established mobile GPP implementation and test patterns.
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-UAT.md` — current Phase 18 UAT truth: four passed scenarios and the conflict-discard integration issue.
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-06-PLAN.md` — required gap-closure plan that must be executed and verified before Phase 19 is unblocked.

### Central GPP contracts and current implementation
- `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-CONTEXT.md` — central-first GPP permissions, audit, mutation, and realtime boundaries.
- `packages/contracts/src/gpp.ts` — canonical GPP request, quantity, destination/finality, central feedback, idempotency, and response schemas.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` — current terminal task resolution, evidence, reconference, local save, central acknowledgement, conflict, and offline behavior.
- `apps/mobile/src/capture/CaptureApp.tsx` — route-level integration point for `Hoje`, GPP clients, repositories, pending queues, and refresh behavior.
- `apps/mobile/src/capture/GppAvariaFlow.tsx` — reusable avaria review and central/offline submission interaction.
- `apps/mobile/src/capture/gpp-flow-state.ts` — reusable typed GPP draft and validation state.
- `apps/mobile/src/capture/gpp-offline-queue.ts` — existing idempotent pending, central-confirmed, conflict, and justified-discard lifecycle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskResolutionPanel.tsx` already owns terminal task actions, evidence checks, reconference, saved commands, central acknowledgement, offline fallback, and conflict feedback. It is the natural interaction boundary for the new linked GPP choices.
- `CaptureApp.tsx` already connects `TaskResolutionPanel` to `Hoje` and separately wires the mobile GPP client, pending queue, routes, and list refreshes.
- `GppAvariaFlow.tsx` and `gpp-flow-state.ts` already implement code, quantity/unit, finality/destination, review, validation, idempotency, and central/offline feedback patterns.
- `gpp-offline-queue.ts` and the capture repository adapters already model pending retry, central confirmation, conflict, discard justification, and deduplication by idempotency key.
- `packages/contracts/src/gpp.ts` already supplies runtime-validated central contracts; Phase 19 should extend those contracts only when the linked `Hoje` provenance requires additive fields.

### Established Patterns
- Physical state, local persistence, transport delivery, and central business acknowledgement are separate states and must stay separately visible.
- Central success comes only from `central_confirmed` or `replayed`; validation or authorization rejection never becomes offline success.
- Local pending is reserved for actual transport failure and uses the exact copy `Pendente neste aparelho`.
- Task evidence and reconference rules are preserved rather than bypassed by choosing a GPP destination.
- Repository parity across in-memory and SQLite adapters, idempotent retry, visible conflicts, and justified discard are required behaviors.

### Integration Points
- Extend the terminal resolution state in `TaskResolutionPanel.tsx` with explicit GPP destination choices after physical-removal confirmation.
- Pass linked task/lot/product/quantity/actor provenance through `CaptureApp.tsx` into the existing GPP client and repository queue.
- Reuse the avaria draft/review validation from `GppAvariaFlow.tsx` and `gpp-flow-state.ts` while locking source task and lot identity.
- Keep remaining physical quantity in the `Hoje` task/repository truth when a partial GPP movement is created.
- Project GPP acknowledgement, correction, and pending states without adding Phase 20 central-queue actions or Phase 21 realtime behavior.

</code_context>

<specifics>
## Specific Ideas

- Terminal action labels: `Registrar avaria`, `Enviar para reaproveitamento`, `Enviar para produção interna`, and separate `Confirmar esgotado`.
- Physical confirmation copy: `Confirmo que a quantidade informada saiu da área de venda`.
- Incomplete-data state: `Falta informar o código`.
- Central-rejection recovery state: `Corrigir envio`.
- Transport-only local state: `Pendente neste aparelho`.
- Manual retry action: `Sincronizar pendências GPP`.

</specifics>

<deferred>
## Deferred Ideas

- Internal purchases remain in the separate Controle GPP flow; they are not folded into `Hoje`.
- Full mobile GPP central queue, baixa, attendance, divergence, and response actions remain in Phase 20.
- Realtime refresh hints for `Hoje` remain in Phase 21.
- APK/build-number changes, push, and deployment remain deferred until the GPP track is deliberately completed, validated, and approved for release.

</deferred>

---

*Phase: 19-integracao-do-controle-gpp-com-hoje*
*Context gathered: 2026-07-10*
