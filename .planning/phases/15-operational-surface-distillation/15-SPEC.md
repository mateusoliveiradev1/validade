# Phase 15: Operational Surface Distillation - Specification

**Created:** 2026-06-30
**Ambiguity score:** 0.12 (gate: <= 0.20)
**Requirements:** 10 locked

## Goal

The mobile operation changes from diagnostic/category-first surfaces to a lot-first store flow that keeps healthy readiness quiet, guides an empty real store into product reuse or product creation, registers lots with the correct validity/rebaixa policy, and preserves existing products/lots.

## Background

Phase 13 moved web diagnostics into dedicated Operacao, Aparelhos, Atualizacoes, Validacao, Acessos, and Auditoria routes. Phase 14 added mobile Ajustes for push, sync, update/build, account, privacy, and sign-out controls. The daily mobile operation still has two unresolved product problems:

- Product discovery currently shows search, scan, recent, frequent, by-category, and create-product actions together in `apps/mobile/src/capture/ProductDiscoveryScreen.tsx`.
- Product creation currently asks the operator to choose from the category catalog and can expose technical rule-profile language such as `formal_validity`, `flv_inspection`, `processed_repack_loss`, and `receiving_monitored` in `apps/mobile/src/capture/ProductFormScreen.tsx` and `apps/mobile/src/capture/capture-copy.ts`.
- Lot registration already adapts required fields by `ProductMode` in `apps/mobile/src/capture/LotRegistrationScreen.tsx`, and domain rules already support configurable `radarDays`, `markdownDays`, `criticalDays`, `expiredDays`, and product overrides in `packages/domain/src/types.ts`.
- Rebaixa is already represented as a commercial markdown workflow, but the current product/category creation UX does not clearly separate products that allow rebaixa before expiry from PED/cut/fractioned/prepared products that should not enter rebaixa by default.
- Hoje and Command Center have improved diagnostics, but Phase 15 must finish the daily-operation split: healthy sync/push/build state should stay compact while blockers become explicit only when they affect task execution, safe close, or validation.

The trigger for this phase is Loja 18 UAT feedback: the operator understood lot registration only after several iterations, asked for a better category/product flow, confirmed that "Como esse produto esta na loja?" is the right starting question, and clarified that existing products/lots must not be harmed because they are useful tests for future rebaixa/push behavior.

## Requirements

1. **Lot-first entry**: The mobile primary capture path starts with `Registrar lote`; product creation is an exception path after search/scan/reuse fails or the operator explicitly confirms the product is missing.
   - Current: Product discovery shows search, scan, recent, frequent, by-category, and create-product actions on one surface, so "Cadastrar produto" competes with the lot task.
   - Target: The operator begins in a lot-registration intent, searches or scans the product first, reuses existing products when available, and enters product creation only after a no-safe-reuse state.
   - Acceptance: A mobile test proves that a found product goes directly to lot registration, while a no-match/no-safe-reuse product shows the product-creation path only after the search result says the product is missing.

2. **Human product classifier**: When a product must be created or reviewed, the app asks "Como esse produto esta na loja?" before exposing any category list.
   - Current: Product creation asks for name and category catalog selection, optionally filters a long list, and exposes profile exceptions.
   - Target: The first product-rule choice is an operator-readable classifier with these initial choices: `Inteiro solto`, `Embalado pelo fornecedor`, `Cortado/PED`, `Fracionado ou reembalado na loja`, `Preparado pronto`, `Ovos`, `Industrial/refrigerado com validade`, and `Outro/nao sei`.
   - Acceptance: A mobile test renders those classifier choices before category rows; no unfiltered category list is visible before a classifier is selected.

3. **Classifier-to-policy mapping**: The classifier produces an explicit validity/rebaixa policy and maps it to the existing domain modes without requiring the operator to know technical mode names.
   - Current: The UI surfaces `Perfil operacional` and `ProductMode` labels directly; category choice is the only practical way to infer policy.
   - Target: Each classifier maps to mode, required lot dates, default rebaixa permission, default rebaixa window, quality window, and terminal action semantics:
     - `Inteiro solto`: quality/receiving monitoring, no expiry-based rebaixa by default.
     - `Embalado pelo fornecedor`: printed-validity policy when an expiry exists; rebaixa allowed only if the category/product policy enables it.
     - `Cortado/PED`: internal/short validity, rebaixa blocked by default, expired means withdraw/loss.
     - `Fracionado ou reembalado na loja`: internal validity, rebaixa blocked by default, expired means withdraw/loss.
     - `Preparado pronto`: internal/short validity, rebaixa blocked by default, expired means withdraw/loss.
     - `Ovos`: formal validity, rebaixa allowed by policy before expiry.
     - `Industrial/refrigerado com validade`: formal validity, rebaixa allowed by policy before expiry.
     - `Outro/nao sei`: conservative pending-review policy that allows lot capture but does not silently allow rebaixa.
   - Acceptance: Contract/domain or mobile mapping tests verify every classifier maps to a bounded policy and to one of the existing supported product modes.

4. **Configurable rebaixa windows**: Rebaixa windows are configurable by category and overrideable by product; the system must not assume one universal markdown window.
   - Current: `markdownDays` exists in domain rule windows, but the creation flow does not explain or protect per-category/product differences.
   - Target: Categories/products can express windows such as 7, 14, 30, 60, or 90 days before expiry, and the lot/task projection uses the configured value.
   - Acceptance: Domain tests prove at least three distinct windows produce `request_markdown` on the correct day range and do not create rebaixa tasks outside their configured range.

5. **Rebaixa eligibility rule**: Rebaixa is a commercial price-reduction task before expiry, never an action for expired or internally unsafe products.
   - Current: Rebaixa exists, but the product/category UX does not clearly protect PED/cut/fractioned/prepared products from entering the same flow as eggs or industrial products.
   - Target: A lot can create/request rebaixa only when all are true: the lot has formal/printed expiry, the category/product policy allows rebaixa, the current date is inside the configured rebaixa window, and the lot has not expired. Expired lots always route to withdraw/loss or the compatible terminal action for the product mode.
   - Acceptance: Tests cover eggs with rebaixa allowed, industrial/refrigerated with a long window, PED/cut product with rebaixa blocked, and an expired formal lot that does not allow rebaixa.

6. **Adaptive lot form**: Lot registration fields and preview copy are derived from the chosen product policy using operator language.
   - Current: Lot registration already switches fields by mode, but shows technical profile labels and generic `Previa de risco` copy.
   - Target: The lot form asks only the fields required by the policy: printed/internal identity, quantity, location, expiry date when formal/internal validity applies, receiving date and quality window when quality monitoring applies, and no technical mode labels. The risk preview states the next action in human terms such as `fica no radar`, `pedir rebaixa`, `retirar/perda`, or `conferir qualidade`.
   - Acceptance: Mobile tests cover each classifier/policy and verify required fields, hidden fields, primary action enablement, and preview text.

7. **Existing data compatibility**: Products and lots already registered before Phase 15 remain intact and continue to drive monitoring, rebaixa, withdrawal/loss, and push reminder tasks.
   - Current: Existing staging/mobile data was created with older category/profile semantics and is needed for UAT proof.
   - Target: Phase 15 does not delete, recreate, silently rename, or force operators to re-register existing products/lots. Existing products/lots are interpreted through their current mode/profile, with conservative fallback only when policy details are missing.
   - Acceptance: Regression tests load pre-Phase-15 product/lot fixtures and prove they still appear in recent lots/Hoje, keep their central/local sync state, and can generate rebaixa or expiry tasks according to their existing rule profile.

8. **Empty-store guidance**: Preparar turno treats an empty real store as an expected starting state and guides the operator into the first product/lote flow.
   - Current: Empty central product/lot/task state can look like a blocking or fatal prepare-turn state.
   - Target: A central read with zero products/lots/tasks but no authorization/sync blocker shows a clear first-action path: search/scan product, create product if missing, then register the first lot.
   - Acceptance: A mobile prepare-turn test with zero central products, zero lots, zero active tasks, and no blockers renders a non-error empty-store state with a primary `Registrar lote` path.

9. **Daily readiness distillation**: Hoje keeps healthy sync, push, build/update, camera, and local-cache diagnostics compact; only actionable blockers become prominent cards.
   - Current: Hoje has already moved some diagnostics out, but UAT still found repeated normal-state messages and update/sync text competing with operational work.
   - Target: Healthy states render as compact status text or remain in Ajustes; blocking cards appear only when a state affects task execution, safe close, or validation (for example stale central read, critical sync conflict, pending local command that affects safety, required update, push/camera proof needed for validation).
   - Acceptance: Mobile tests verify healthy sync/push/build states do not create full-width blocking cards, and each blocking state above does create a visible card with a next action.

10. **Safe-close and web vocabulary alignment**: Fechamento do turno, Hoje, Ajustes, and Command Center use one shared readiness vocabulary and do not duplicate ownership of diagnostics.
    - Current: Mobile and web copy for central read, local queue, push, camera, build, product review, and sync has improved but is still distributed across route-specific phrases.
    - Target: Fechamento summarizes active tasks, unresolved sync, stale central read, device/build blockers, and the physical checklist before enabling safe close. Web Command Center/Operacao/Aparelhos use the same public labels for central read, local queue, push, camera, build, device authorization, product review, and lot sync; web changes are limited to vocabulary/review clarity needed by Phase 15.
    - Acceptance: Mobile tests prove safe close is disabled when any required blocker exists and enabled only after central revalidation plus checklist; web tests verify shared labels for product review with synced lots and readiness states.

## Boundaries

**In scope:**

- Mobile lot-first capture flow for product reuse, product creation fallback, and lot registration.
- Human classifier for how the product is present in the store.
- Policy mapping for validity, rebaixa, quality window, and terminal action semantics.
- Configurable rebaixa windows by category/product using existing domain concepts.
- Compatibility with already registered products/lots and their task/push/rebaixa behavior.
- Empty-store prepare-turn guidance into first product/lote capture.
- Hoje readiness distillation for healthy versus blocking states.
- Fechamento do turno summary/blocker clarity before safe close.
- Minimal web copy/view-model alignment so Command Center/Operacao/Aparelhos explain product review, synced lots, and readiness with the same vocabulary.
- Automated tests and sanitized UAT criteria for PED/cut, eggs with rebaixa, industrial/refrigerated with long rebaixa window, and existing pre-Phase-15 lots.

**Out of scope:**

- Full web admin category-management console - this phase is mobile-first; central category governance can be a later phase.
- ERP, stock, sales, or price-system integration - the pilot still cannot depend on internal APIs or sales data.
- Automatic pricing execution - rebaixa remains task/workflow evidence, not direct price change in a POS system.
- App store or OTA update distribution - update truth remains the Phase 13/14 manual APK path.
- Reprocessing all production/staging data with a destructive migration - existing products/lots must stay intact.
- AI category suggestion or image recognition - classifier is operator-confirmed and deterministic for this phase.
- Storing real Loja 18 product names, photos, tokens, or private evidence in repository artifacts - UAT proof remains public-safe and sanitized.

## Constraints

- Mobile-first and corridor-ready: primary actions must stay usable on a phone in store conditions with one-handed operation and unstable connectivity.
- No recurring-cost dependency and no new paid service.
- No direct sales/stock/ERP dependency.
- Public repo safety: fixtures and artifacts must avoid real private operational data; real UAT examples must be sanitized before commit.
- Offline/sync truth remains strict: local save, central transport, and central resolution must stay visibly separate.
- Push is reminder/proof-channel only; push delivery never resolves a task, closes a shift, or proves the sales area safe.
- Existing products/lots and their central/local IDs are compatibility constraints; tests must cover pre-Phase-15 fixtures.
- The implementation must preserve existing domain mode support unless a later planning step explicitly introduces a backward-compatible schema extension.

## Acceptance Criteria

- [ ] A found product can be reused and sent to lot registration without opening product creation.
- [ ] A missing product opens the human classifier before any unfiltered category list.
- [ ] Classifier options include inteiro solto, embalado fornecedor, cortado/PED, fracionado/reembalado, preparado pronto, ovos, industrial/refrigerado, and outro/nao sei.
- [ ] Each classifier maps to a bounded validity/rebaixa policy and a supported domain mode.
- [ ] Ovos can generate rebaixa before expiry when its policy window is active.
- [ ] Industrial/refrigerated products can use a long rebaixa window such as 30, 60, or 90 days.
- [ ] PED/cut, fractioned/repacked, and prepared products do not create rebaixa tasks by default.
- [ ] Expired lots do not allow rebaixa and route to withdraw/loss or their compatible terminal action.
- [ ] Pre-Phase-15 products/lots remain visible and can still generate rebaixa/expiry/push reminder tasks according to their existing rule profile.
- [ ] Empty central store state after Preparar turno shows a non-error first-lot path.
- [ ] Healthy sync/push/build/camera states do not occupy the default Hoje scan as blocking cards.
- [ ] Blocking readiness states create explicit cards only when they affect task execution, safe close, or validation.
- [ ] Fechamento do turno blocks safe close when active tasks, unresolved sync, stale central read, or required device/build blockers exist.
- [ ] Web Operacao/Aparelhos/Command Center use the same readiness vocabulary as mobile for central read, local queue, push, camera, build, device authorization, product review, and lot sync.

## Ambiguity Report

| Dimension           | Score | Min   | Status | Notes |
|---------------------|-------|-------|--------|-------|
| Goal Clarity        | 0.91  | 0.75  | met    | Goal locked to mobile-first lot/product flow plus operational distillation. |
| Boundary Clarity    | 0.80  | 0.70  | met    | Full web admin, ERP/pricing integration, and destructive data migration are out of scope. |
| Constraint Clarity  | 0.80  | 0.65  | met    | Existing data compatibility, offline truth, push limits, and public-safe UAT are explicit. |
| Acceptance Criteria | 0.80  | 0.70  | met    | Pass/fail checks cover product/lote flow, rebaixa, existing data, empty store, Hoje, close, and web vocabulary. |
| **Ambiguity**       | 0.12  | <=0.20| met    | Gate passed after round 2. |

Status: met = dimension meets minimum.

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| 1 | Researcher | What is the main product/lote/category scope for Phase 15? | Mobile first: Registrar lote -> buscar produto -> perguntar como esta na loja -> cadastrar produto if missing -> registrar lote; web only supports review/clarity. |
| 1 | Researcher | How should operational categories be handled? | Use a human classifier question instead of a long category list as the first choice. |
| 1 | Researcher | How should rebaixa rules be represented? | Rebaixa is by category/product with configurable windows and product exceptions. |
| 2 | Researcher + Simplifier | What is the MVP flow? | Complete product/lote flow: search, classifier on missing product, draft product review, lot registration, central/local feedback. |
| 2 | Researcher + Simplifier | Which initial product forms are mandatory? | Cover inteiro solto, embalado fornecedor, cortado/PED, fracionado loja, preparado pronto, ovos, and industrial/refrigerado. |
| 2 | Researcher + Simplifier | What proves UAT success? | Sanitized real-world scenarios: PED/cut without rebaixa, eggs with rebaixa, industrial/refrigerated with long window, and existing lots preserved for push/rebaixa tests. |
| 2 | Failure clarification | Do existing registered products/lots change? | They must not be deleted, recreated, silently renamed, or forced to be re-registered; they remain compatibility and UAT fixtures. |

---

*Phase: 15-operational-surface-distillation*
*Spec created: 2026-06-30*
*Next step: $gsd-discuss-phase 15 - implementation decisions (how to build what is specified above)*
