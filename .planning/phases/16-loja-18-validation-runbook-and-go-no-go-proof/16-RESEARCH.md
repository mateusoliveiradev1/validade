# Phase 16: Loja 18 Validation Runbook and Go/No-Go Proof - Research

**Researched:** 2026-07-01
**Domain:** Guided real-store validation, Command Center proof synthesis, public-safe UAT evidence
**Confidence:** HIGH

<user_constraints>
## User Constraints

### Locked Decisions

- **D-01:** The Loja 18 runbook is a mandatory guided sequence. Steps advance only through central proof, actionable blockers, or honest external blockers.
- **D-02:** Web `Validacao` conducts the sequence. Mobile keeps using the real operational flows; no separate mobile validation mode.
- **D-03:** Manual "passed" checkboxes cannot become source-of-truth rollout proof.
- **D-04:** Unproven steps fail closed into `pending`, `blocked`, or `external_blocked` and point to `Aparelhos`, `Atualizacoes`, `Operacao`, or physical execution.
- **D-05..D-08:** Evidence in public artifacts is sanitized: state, timestamp, owner route, masked device, generic role, and bounded evidence label only.
- **D-09:** Approved APK install proof requires a real device reporting the approved app version/build through central readiness.
- **D-10:** Remote push proof requires a safe push-test timeline on an approved device; provider acceptance alone is not physical execution.
- **D-11:** Second-device proof requires another approved mobile device reading the same central fact set.
- **D-12:** Physical Loja 18 UAT passes only after required central and external gates pass.
- **D-13..D-15:** `Go`, `No-Go`, and `Aguardando prova externa` are mutually exclusive verdicts derived from steps, blockers, device/build/push/camera proof, second-device convergence, and safe close.
- **D-16:** Copy must say the missing proof and next action directly.

### the agent's Discretion

- Exact helper names for proof derivation and whether they live beside `buildPilotUatChecklist` or in small local helper functions.
- Exact route composition inside `ValidacaoRoute`, as long as it follows `16-UI-SPEC.md` and the existing shadcn/radix-nova design system.
- Exact final runbook filename, as long as it is public-safe and executor-visible.

### Deferred Ideas (OUT OF SCOPE)

- App store release, production distribution, silent APK update, or OTA rollout.
- New mobile validation mode.
- Storing real product names, lot IDs, raw photos, private URLs, push tokens, raw device IDs, phone/email data, or personal data.
- Treating repo tests, fixtures, local APK generation, or provider acceptance as physical Loja 18 proof.
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Required runbook step IDs and states | `packages/contracts` | API/web tests | Contract already fixes the nine-step sequence and public-safe text rules. |
| Central proof derivation | `apps/api/src/command-center.ts` | Mobile flows | API already has prepared central facts, tasks, resolved history, devices, and blockers. |
| External gate synthesis | API projection + existing device readiness | Web display | Device/build/push/camera blockers already exist; Phase 16 must classify them as rollout gates. |
| Go/No-Go synthesis | Web view-model | API projection | `deriveValidationVerdict` already owns labels; it needs stricter Phase 16 reasons and next-action copy. |
| Real operational action | Mobile `Preparar turno`, `Registrar lote`, `Hoje`, `TaskResolutionPanel`, `ShiftCloseScreen`, `Ajustes` | API sync | Mobile creates proof through normal operation, not through a validation-only UI. |
| Store runbook artifact | Phase docs/UAT artifact | Web route copy | VAL-04 needs a public-safe next-step runbook for store and leadership review. |
</architectural_responsibility_map>

<research_summary>
## Summary

Phase 16 should extend the existing Phase 12/13 validation spine instead of creating a second proof system. The repo already has the important primitives:

- `PilotUatStepIdSchema` fixes the nine Loja 18 steps.
- `PilotUatStepSchema` requires blocked steps to include cause and next action.
- `PublicSafeTextSchema` rejects private URLs, tokens, secrets, Expo push tokens, and build links.
- `buildPilotUatChecklist` and `buildPilotOperationalBlockers` already synthesize UAT and rollout blockers from Command Center facts.
- `ValidacaoRoute` already renders Go/No-Go, UAT rows, blockers, masked device references, and route-owner buttons.
- Mobile task resolution and shift close already distinguish local/pending/synced/central-safe proof and record no-photo/photo-placeholder evidence without committing binaries.

The gap is fidelity: product, lot, terminal resolution, second-device convergence, approved build installation, safe push, camera/fallback, and safe close must be explicit central/external gates in the runbook, not generic pending text or manual status. The safest plan is contract tests first, API proof derivation second, external gate synthesis third, web UI contract fourth, and public-safe runbook/final validation last.

**Primary recommendation:** Keep `CommandCenterProjection` as the validation source, make step state derivation deterministic and test-heavy, and make docs/UI say "waiting for external proof" whenever the repo cannot prove the physical store fact.
</research_summary>

<standard_stack>
## Standard Stack

| Layer | Existing Choice | Phase 16 Use |
|-------|-----------------|--------------|
| Contracts | Zod schemas in `packages/contracts` | Step/state/evidence/blocker validation and public-safe denylist tests. |
| API | Hono service and `createCommandCenterService` | Derive runbook proof from prepared central facts and device readiness. |
| Mobile | Expo/React Native capture flows | Existing flows produce product/lot/task/evidence/shift facts; no new validation mode. |
| Web | React/Vite + shadcn/radix-nova | `Validacao` is the proof sequencer and verdict surface. |
| Tests | Vitest, React Testing Library, Playwright, security scripts | Focused package tests per plan plus final `cmd /c pnpm.cmd check`. |

No new package is recommended.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Projection-Derived Proof

`CommandCenterProjection` remains the source read model. Step states should be derived from central facts already in the projection path: prepared turn readiness, real product/lot presence, active/resolved task state, sync conflicts/discards, device readiness, push-test timeline, and shift-close history/pending unsafe close.

### Pattern 2: Fail Closed With Owner Route

Every non-passed step must have a state, cause, next action, and route/owner. Critical actionable problems become `blocked`/`No-Go`; missing real-world proof becomes `external_blocked`/`Aguardando prova externa`.

### Pattern 3: Public-Safe Evidence Labels

Evidence is a label, not raw evidence. Acceptable labels are things like `Produto real confirmado`, `Lote real confirmado`, `Resolucao terminal confirmada`, `Aparelho Loja 18 #1`, `Push seguro confirmado`, `Camera indisponivel com fallback registrado`, and `Fechamento seguro confirmado`.

### Pattern 4: Validation Consolidates, Other Routes Act

`Validacao` tells the operator what is missing and where to resolve it. It does not send push tests, reveal APK links, resolve tasks, or close shifts. Those actions remain in `Aparelhos`, `Atualizacoes`, `Operacao`, and mobile physical execution.

### Recommended Plan Shape

```text
16-01 Contract and public-safe proof invariants
16-02 API central runbook proof derivation
16-03 External gates and blocker synthesis
16-04 Web Validacao UI and E2E
16-05 Public-safe runbook docs and final evidence gates
```
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New validation truth store | New table or local flag for passed steps | `CommandCenterProjection.pilotUat` derived from central facts | Avoids manual truth and migration risk. |
| Manual pass UI | Checkboxes/buttons to mark passed | Step derivation from API projection | D-03 forbids manual source-of-truth pass. |
| Push proof | Provider accepted string as execution proof | `SafePushTestTimelineItem` on approved device | Push is diagnostic; physical receipt remains external unless proven. |
| Camera proof in repo | Photo thumbnails or object keys in docs/tests | Sanitized evidence/fallback label | Public repo cannot store real evidence. |
| Web action duplication | Push/update/close controls in Validacao | Route-owner buttons | Preserves Phase 13 route ownership. |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Generic Operational Facts Pass Product/Lot Steps

**What goes wrong:** `hasOperationalFacts` marks product/lot/resolution proof as passed even when the specific flow was not proven.
**Avoidance:** Derive product, lot, and resolution steps from targeted central facts and safe evidence labels. Tests should show generic command-center consistency does not pass these steps.

### Pitfall 2: One Device Becomes Second-Device Proof

**What goes wrong:** Any web read or one mobile device is treated as convergence.
**Avoidance:** Require at least two confirmed approved mobile device records reading the current store facts; web visibility does not count as mobile convergence.

### Pitfall 3: External Blockers Become No-Go Too Early

**What goes wrong:** Missing APK/provider/camera proof is shown as operator failure.
**Avoidance:** Use `external_blocked` and `Aguardando prova externa` when no actionable critical blocker exists.

### Pitfall 4: Public-Safe Fixtures Drift Into Real Data

**What goes wrong:** A committed fixture includes a real product name, lot number, token, build URL, raw device ID, or provider payload.
**Avoidance:** Use fictitious/sanitized labels and run `cmd /c pnpm.cmd security:evidence`.

### Pitfall 5: Validation Route Becomes Another Dashboard

**What goes wrong:** Charts, broad metrics, or daily-operation detail bury the next action.
**Avoidance:** Follow `16-UI-SPEC.md`: verdict first, ordered sequence second, blockers/devices/routes after.
</common_pitfalls>

<validation_architecture>
## Validation Architecture

Phase 16 needs dense automated checks around contracts, API derivation, web UI, and evidence safety. Physical/provider/device proof can remain external, but it must be represented as a blocker or manual-only step, not a false pass.

| Layer | Command | Coverage Target |
|-------|---------|-----------------|
| Contracts | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | Step order/state invariants, public-safe text, blocker ownership/severity. |
| API | `cmd /c pnpm.cmd --filter @validade-zero/api test` | Central proof derivation for product, lot, terminal resolution, second device, build/push/camera/safe close. |
| Web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | Go/No-Go verdict copy, ordered sequence, route owners, no manual pass UI, privacy denylist. |
| Mobile | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | Existing real flows still produce central-safe task/evidence/shift facts without validation mode. |
| E2E | `cmd /c pnpm.cmd test:e2e:web` | Route navigation and Validacao proof surface at web level. |
| Safety | `cmd /c pnpm.cmd security:evidence` | No private URLs, tokens, raw device IDs, real product evidence, or photos in artifacts. |
| Final | `cmd /c pnpm.cmd check` | Full repo gate before Phase 16 verification. |

Sampling rules:

- Every plan must include at least one focused automated test.
- `16-VALIDATION.md` remains pending until execution records command evidence.
- External physical proof is manual-only unless an approved device/provider/camera run exists.
- No plan may turn missing physical proof into a green repository claim.
</validation_architecture>

<manual_only_verification>
## Manual-Only Verification Candidates

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Approved APK installed on real Loja 18 Android device | VAL-01, VAL-03 | Repo can verify build labels and device readiness shape, but not physical installation without the device. |
| Remote push received/opened on approved device | VAL-03 | Provider acceptance and local-only fallback do not prove receipt. |
| Camera or no-photo fallback on approved device | VAL-02, VAL-03 | Repo can verify sanitized metadata, not real camera hardware. |
| Second physical mobile device reads same central facts | VAL-01, VAL-03 | Requires another approved mobile device, not just web Command Center. |
| Full physical Loja 18 UAT in aisle | VAL-04 | Requires store-floor execution with public-safe evidence capture. |
</manual_only_verification>

<sources>
## Sources

### Primary

- `.planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-CONTEXT.md`
- `.planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-UI-SPEC.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `packages/contracts/src/command-center.ts`
- `apps/api/src/command-center.ts`
- `apps/web/src/command-center/ValidacaoRoute.tsx`
- `apps/web/src/command-center/command-center-view-model.ts`
- `apps/mobile/src/capture/TaskResolutionPanel.tsx`
- `apps/mobile/src/capture/ShiftCloseScreen.tsx`

### Secondary

- `.planning/phases/13-web-operational-navigation-and-readiness-surfaces/13-05-PLAN.md`
- `.planning/phases/15-operational-surface-distillation/15-VALIDATION.md`
- Existing API, contract, web, and mobile tests around Command Center, UAT, push, evidence, and shift close.
</sources>

<metadata>
## Metadata

**Research scope:** existing codebase only; no new external library or internet research needed.
**Confidence breakdown:** HIGH for architecture and tests because all target seams already exist; MEDIUM for exact API helper shape because execution may discover a smaller refactor path.
**Valid until:** 2026-07-31
</metadata>

---

*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Research completed: 2026-07-01*
*Ready for planning: yes*
