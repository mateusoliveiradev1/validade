# Phase 16: Loja 18 Validation Runbook and Go/No-Go Proof - Patterns

**Mapped:** 2026-07-01
**Scope:** Command Center contracts/API, web Validacao route, mobile proof-producing flows, validation docs

## Pattern Map

| Target Area | Closest Existing Analog | Reuse Pattern |
|-------------|-------------------------|---------------|
| Fixed runbook sequence | `PilotUatStepIdSchema`, `PILOT_UAT_STEP_IDS` | Keep the nine existing ids and order; add tests around derivation, not new ids. |
| Public-safe proof labels | `PublicSafeTextSchema`, `PilotUatStepSchema`, `PilotOperationalBlockerSchema` | Use bounded labels/cause/nextAction and deny sensitive strings in tests. |
| Central proof derivation | `buildPilotUatChecklist` in `apps/api/src/command-center.ts` | Extend input facts and overrides; do not store manual pass flags. |
| Rollout blockers | `buildPilotOperationalBlockers` | Map blocked/external-blocked steps plus device/push/build/camera facts to blockers. |
| Go/No-Go verdict | `deriveValidationVerdict` | Preserve `Go`, `No-Go`, `Aguardando prova externa`; improve reason/next-action copy. |
| Validation UI | `ValidacaoRoute.tsx` | Verdict band, ordered rows, external gates, device proof, route-owner buttons. |
| Mobile task proof | `TaskResolutionPanel.tsx`, `task-resolution.test.tsx` | Reuse central/pending/resolved/evidence metadata; no validation-only UI. |
| Safe close proof | `ShiftCloseScreen.tsx`, `shift-close.test.tsx` | Safe close requires central validation; unsafe handoff remains non-safe. |
| Final runbook docs | Phase 14/15 validation and summary docs | Record command evidence separately from physical/provider/device proof. |

## Component Responsibilities

| File | Role | Phase 16 Guidance |
|------|------|-------------------|
| `packages/contracts/src/command-center.ts` | Runtime validation boundary | Keep step ids, state enum, blocker enum, and public-safe denylist authoritative. Add helper exports only if execution needs them. |
| `packages/contracts/src/command-center.test.ts` | Contract invariants | Assert exact step order, blocked cause/nextAction, public-safe labels, external ownership, and no manual pass shape. |
| `apps/api/src/command-center.ts` | Projection assembly | Extend `buildPilotUatChecklist` inputs for product/lot/resolution/second-device/shift proof and external gates. |
| `apps/api/src/command-center.test.ts` | API projection tests | Add fixtures proving pass, blocked, and external-blocked outcomes from central/device facts. |
| `apps/web/src/command-center/command-center-view-model.ts` | Web verdict and route references | Make verdict detail/next action match Phase 16 copy and owner route rules. |
| `apps/web/src/command-center/ValidacaoRoute.tsx` | User-facing proof sequencer | Match `16-UI-SPEC.md`; no pass checkbox, no push/update/close action duplication. |
| `apps/web/src/command-center/command-center.test.tsx` | Component behavior | Assert ordered sequence, no manual pass controls, specific copy, and sensitive-string denylist. |
| `apps/web/e2e/v1-readiness.spec.ts` | Route journey | Prove Validacao is navigable and does not leak daily/update/device actions into the wrong route. |
| `apps/mobile/src/capture/TaskResolutionPanel.tsx` | Real task/evidence action | Read for proof semantics; change only if a sanitized status label/test is missing. |
| `apps/mobile/src/capture/ShiftCloseScreen.tsx` | Safe close gate | Read for proof semantics; change only if safe-close proof cannot be surfaced from central projection. |
| `.planning/phases/16-*/16-UAT.md` | Store runbook | Public-safe operator/leadership checklist and evidence boundaries for VAL-04. |

## Test Analogues

| Behavior | Existing Test File | Add/Update |
|----------|--------------------|------------|
| Step sequence and states | `packages/contracts/src/command-center.test.ts` | Assert all nine ids, blocked cause/nextAction, external ownership, public-safe evidence. |
| Product/lot/resolution proof | `apps/api/src/command-center.test.ts` | Add prepared-turn fixture that passes product/lote/resolution only from central facts. |
| External gates | `apps/api/src/command-center.test.ts` | Add fixtures for no device, old/incompatible build, local-only/provider-failed push, camera missing, second-device missing. |
| Verdict rules | `apps/web/src/command-center/command-center.test.tsx` | Assert `Go`, `No-Go`, `Aguardando prova externa` with next action copy. |
| UI-SPEC fidelity | `apps/web/src/command-center/command-center.test.tsx` | Assert primary action, ordered rows, owner route/action, no manual pass checkbox/button. |
| Route E2E | `apps/web/e2e/v1-readiness.spec.ts` | Assert side-nav access and privacy boundaries on Validacao. |
| Mobile proof boundaries | `apps/mobile/src/capture/task-resolution.test.tsx`, `shift-close.test.tsx`, `mobile-release-journeys.test.tsx` | Reuse or add assertions that evidence and safe close remain central/public-safe. |
| Evidence safety | `cmd /c pnpm.cmd security:evidence` | Run after docs/fixtures are written. |

## Constraints For Executors

- Do not add dependencies.
- Do not add new database schema unless execution proves existing projection cannot represent a required fact.
- Do not store real Loja 18 product names, lot ids, photos, tokens, private URLs, raw device ids, phone/email data, or personal names.
- Do not use manual pass controls in web or mobile.
- Do not treat web Command Center visibility as second mobile device proof.
- Do not treat provider acceptance alone as physical execution.
- Keep `Validacao` action buttons as route-owner navigation only.
