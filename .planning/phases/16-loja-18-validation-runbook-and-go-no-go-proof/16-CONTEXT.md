# Phase 16: Loja 18 Validation Runbook and Go/No-Go Proof - Context

**Gathered:** 2026-07-01T07:24:44-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 16 turns the cleaned v1.1 operational surfaces into a guided Loja 18 validation path. The web `Validacao` route conducts the proof sequence while operators execute the real flows on mobile: `Preparar turno`, `Registrar lote`, `Hoje`, `Ajustes`, task resolution, second-device read, and `Fechamento do turno`.

This phase proves whether Loja 18 can move from repository-ready to real-store validation using public-safe evidence and honest external gates. It does not create a new daily dashboard, a separate mobile validation mode, an app-store release path, automatic APK distribution, manual truth overrides, or any repository artifact containing real product names, photos, tokens, private URLs, raw device IDs, phone/email data, or personal data.

</domain>

<decisions>
## Implementation Decisions

### Roteiro no corredor
- **D-01:** The Loja 18 runbook is a mandatory guided sequence. Each step advances only when it has passed through central proof, is blocked by an actionable cause, or is marked as an honest external blocker.
- **D-02:** Web `Validacao` conducts the sequence. Mobile does not get a separate validation mode in this phase; it executes the real operational flows where evidence is born.
- **D-03:** A step passes automatically only when the central system can prove it. Manual "passed" checkboxes must not become the source of rollout truth.
- **D-04:** If a step cannot be proven automatically, the runbook fails closed into `pending`, `blocked`, or `external_blocked` and points to the owning route/action: `Aparelhos`, `Atualizacoes`, `Operacao`, or physical execution in the store.

### Evidencia publica segura
- **D-05:** Validation evidence recorded in app/repo artifacts is limited to sanitized status plus safe reference labels: state, timestamp, owner route, masked device, generic role, and a bounded evidence label.
- **D-06:** Real product and real lot steps pass only when central facts show the flow was executed with real Loja 18 input, but public artifacts must not store product names, readable lot identifiers, photos, or private operational data.
- **D-07:** Camera/photo proof never stores a real photo in the public repo. The public proof is a sanitized event/status label showing that evidence or an accepted no-photo reason was recorded on an approved device.
- **D-08:** Device and actor information must be masked into generic labels such as `Aparelho Loja 18 #1`, `Operacao Loja 18`, or `Lideranca Loja 18`. No real name, phone, email, raw device id, token, or private URL may appear in validation artifacts.

### Gates externos honestos
- **D-09:** Approved APK install passes only when a real device reports the approved app version/build through central readiness. A generated local APK or EAS artifact without real installation remains insufficient proof.
- **D-10:** Remote push passes only with a safe push-test timeline on an approved device. Provider acceptance alone is not physical execution, and `local_only`, denied permission, invalid token, or provider failure remain blockers/external gaps for remote proof.
- **D-11:** Second-device proof passes only when another approved mobile device reads the same central fact set for the store, including the real product/lot/task/resolution evidence relevant to the run. Web Command Center visibility helps leadership but does not substitute for mobile convergence.
- **D-12:** Physical Loja 18 UAT passes only when all required central and external gates passed. Missing APK install proof, remote push proof, camera/evidence proof, second-device proof, or safe shift-close proof keeps validation out of `Go`.

### Veredito Go/No-Go
- **D-13:** `Go` appears only when every runbook step passed, all required devices/gates are apt, no critical or external blocker remains, build is current, second device is proven, and safe shift close is confirmed.
- **D-14:** `No-Go` appears for actionable critical blockers: blocked central read, critical sync conflict, incompatible build, invalid authorization, unresolved task, unsafe shift close, or a blocked UAT step that the store/team can act on.
- **D-15:** `Aguardando prova externa` appears when there is no actionable critical blocker but real evidence is missing or still pending, including APK installed proof, remote push, camera/evidence, second physical device, physical UAT, or sanitized evidence finalization.
- **D-16:** Runbook language must be operational, direct, and next-step oriented: "Ainda nao e Go porque falta prova X. Faca Y em Z." It should not blame the operator, and it should not bury the next action in audit-only wording.

### the agent's Discretion
- The planner may choose exact component boundaries, file names, and whether Phase 16 adds a separate runbook document, route-level view-model helpers, or contract/service refinements first.
- The planner may decide how much of the existing Phase 12 UAT/checklist model is refactored versus extended, as long as central proof remains the source of pass state and public-safe boundaries remain enforced.
- The planner may choose exact test layering, but must cover contract validation, service projection, web `Validacao` behavior, and mobile proof-producing flows where they affect VAL-01..VAL-04.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and milestone truth
- `.planning/ROADMAP.md` - Phase 16 goal, VAL-01..VAL-04 mapping, success criteria, and v1.1 boundary between daily operation and validation proof.
- `.planning/REQUIREMENTS.md` - Validation requirements, especially VAL-01 through VAL-04 and public-repo evidence constraints.
- `.planning/PROJECT.md` - Milestone context and key decisions: repo-ready, build-installed, provider-proven, and physical-store validation are separate truths.

### Prior phase handoff
- `.planning/phases/13-web-operational-navigation-and-readiness-surfaces/13-CONTEXT.md` - `Validacao` owns Go/No-Go synthesis while `Aparelhos`, `Atualizacoes`, and `Operacao` own their actions.
- `.planning/phases/14-mobile-ajustes-and-device-controls/14-CONTEXT.md` - Mobile `Ajustes` owns push, sync, build/update, account/privacy, and sign-out controls without polluting `Hoje`.
- `.planning/phases/15-operational-surface-distillation/15-CONTEXT.md` - Product/lot real-store flow, readiness distillation, safe-close strictness, and compatibility boundary for existing products/lots.

### Validation contracts and backend truth
- `packages/contracts/src/command-center.ts` - `PilotUatStep`, `PilotOperationalBlocker`, `PublicSafeText`, UAT step IDs, public-safe evidence validation, build compatibility, and projection schema.
- `apps/api/src/command-center.ts` - Command Center projection assembly, `buildPilotUatChecklist`, `buildPilotOperationalBlockers`, approved build defaults, UAT step templates, and blocker synthesis.

### Web validation surface
- `apps/web/src/command-center/ValidacaoRoute.tsx` - Current Go/No-Go route, UAT checklist rendering, gate display, device evidence panel, and route-owner next actions.
- `apps/web/src/command-center/command-center-view-model.ts` - `deriveValidationVerdict`, validation route references, confirmed/operational device filtering, update-path safety, and readiness sorting.

### Mobile proof-producing flows
- `apps/mobile/src/build-info.ts` - Installed versus approved build truth, public label masking, API target masking, package id, and build compatibility calculation.
- `apps/mobile/src/capture/mobile-status.ts` - Shared mobile readiness vocabulary and proof-safe labels for central, sync, provider, camera, and safe states.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - Task resolution, reconference, evidence/no-photo handling, markdown evidence, and local command proof boundaries.
- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - Safe-close central revalidation, pending handoff, blocker summary, build status, authorization status, and evidence/outbox summary.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CommandCenterProjection` already carries devices, UAT steps, pilot blockers, central snapshot, pending evidence, sync conflicts, pending product drafts, shift history, and resolved history.
- `PilotUatStepSchema` already supports `pending`, `passed`, `blocked`, and `external_blocked`, and requires cause/next action for blocked states.
- `PublicSafeTextSchema` already rejects private URLs, tokens, secrets, Expo push tokens, and build links in public evidence text.
- `ValidacaoRoute` already renders Go/No-Go, UAT checklist, blockers, masked device references, evidence labels, and route-owner buttons.
- `deriveValidationVerdict` already separates `Go`, `No-Go`, and `Aguardando prova externa` using step state, blockers, device readiness, and build compatibility.
- `readMobileBuildInfo`, `mobile-status`, `TaskResolutionPanel`, and `ShiftCloseScreen` already provide proof inputs for build, camera/evidence, task resolution, sync, authorization, and safe close.

### Established Patterns
- Validation consolidates proof; it does not duplicate the actions that create proof.
- Push remains diagnostic/reminder proof only. It never resolves tasks or proves physical execution.
- Transport sync, central business resolution, and physical safety are separate states.
- Safe close requires central revalidation and physical checklist; stale, local-only, conflicted, or pending-central state cannot become safe proof.
- Public evidence must use sanitized labels, masked device references, generic roles, and bounded status fields.

### Integration Points
- Extend/refine `buildPilotUatChecklist` so runbook steps advance from central facts instead of manual pass flags.
- Extend/refine `buildPilotOperationalBlockers` so missing external proofs become explicit `external` blockers while actionable critical problems become `critical`.
- Update `deriveValidationVerdict` only if needed to match the locked Go/No-Go rules in this context.
- Update `ValidacaoRoute` to make the mandatory sequence, owning route/action, and public-safe evidence labels clear.
- Add or update tests around UAT step derivation, public-safe rejection, Go/No-Go verdicts, device/build proof, push timeline proof, second-device convergence, camera/evidence status, and safe-close proof.

</code_context>

<specifics>
## Specific Ideas

- Preferred runbook model: mandatory sequence conducted by web `Validacao`.
- Preferred proof source: central automatic proof where possible; no manual "passed" override.
- Preferred evidence shape: sanitized status plus safe label, timestamp, masked device, generic role, and owner route/action.
- Preferred verdict copy: operational and direct, always naming the missing proof and the next action.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Context gathered: 2026-07-01T07:24:44-03:00*
