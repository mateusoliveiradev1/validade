# Phase 15: Operational Surface Distillation - Context

**Gathered:** 2026-06-30T00:56:45.5393508-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 turns the mobile daily operation into a lot-first real-store flow. The operator starts from `Registrar lote`, searches or scans for an existing product, reuses safe matches, creates a product only after no safe reuse exists, and then registers the physical lot with policy-driven fields and human copy. The phase also distills operational readiness across Hoje, Preparar turno, Fechamento do turno, Ajustes, and the web Command Center so healthy diagnostics stay quiet while blockers appear only when they affect task execution, safe close, or validation.

This phase does not create a full web category-management console, ERP/pricing integration, automatic price changes, AI recognition, app-store distribution, or destructive data migration. Existing products and lots remain compatibility fixtures.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**10 requirements are locked.** See `15-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `15-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Mobile lot-first capture flow for product reuse, product creation fallback, and lot registration.
- Human classifier for how the product is present in the store.
- Policy mapping for validity, rebaixa, quality window, and terminal action semantics.
- Configurable rebaixa windows by category/product using existing domain concepts.
- Compatibility with already registered products/lots and their task/push/rebaixa behavior.
- Empty-store prepare-turn guidance into first product/lote capture.
- Hoje readiness distillation for healthy versus blocking states.
- Fechamento do turno summary/blocker clarity before safe close.
- Minimal web copy/view-model alignment so Command Center, Operacao, and Aparelhos explain product review, synced lots, and readiness with the same vocabulary.
- Automated tests and sanitized UAT criteria for PED/cut, eggs with rebaixa, industrial/refrigerated with long rebaixa window, and existing pre-Phase-15 lots.

**Out of scope (from SPEC.md):**
- Full web admin category-management console.
- ERP, stock, sales, or price-system integration.
- Automatic pricing execution.
- App store or OTA update distribution.
- Reprocessing all production/staging data with a destructive migration.
- AI category suggestion or image recognition.
- Storing real Loja 18 product names, photos, tokens, or private evidence in repository artifacts.

</spec_lock>

<decisions>
## Implementation Decisions

### Entrada lote-primeiro
- **D-01:** `Registrar lote` opens a focused product search/scan surface. The first surface should not show an equal-weight `Cadastrar produto novo`, unfiltered category browsing, or diagnostic shortcuts that compete with the lot task.
- **D-02:** Product creation appears only after the search/scan result reaches a no-safe-reuse state. If a reusable product is found, the next step is direct lot registration. If similar products exist, the operator must review them before creating a new draft.
- **D-03:** Recent/frequent/category shortcuts may remain only as secondary lookup aids if they do not compete with the primary search/scan path. Category browsing must not be the first way to decide product policy in this phase.

### Classificador humano do produto
- **D-04:** Product creation or review starts with the operator-readable question: `Como esse produto esta na loja?` This question must render before any category rows or unfiltered category list.
- **D-05:** The classifier choices are the SPEC choices: `Inteiro solto`, `Embalado pelo fornecedor`, `Cortado/PED`, `Fracionado ou reembalado na loja`, `Preparado pronto`, `Ovos`, `Industrial/refrigerado com validade`, and `Outro/nao sei`.
- **D-06:** The classifier maps to a bounded validity/rebaixa policy first, then category selection refines or confirms that policy. The operator should never need to choose or understand technical `ProductMode` labels.

### Rebaixa, validade e preview do lote
- **D-07:** Use a deterministic policy layer that maps classifier/category/product override to mode, required lot dates, rebaixa permission, default rebaixa window, quality window, and terminal action semantics. The UI shows human language, not `formal_validity`, `flv_inspection`, `processed_repack_loss`, or `receiving_monitored`.
- **D-08:** Rebaixa is a commercial task before expiry. It is allowed only when the lot has formal/printed expiry, category/product policy allows rebaixa, the current date is inside the configured window, and the lot is not expired.
- **D-09:** PED/cut, fractioned/repacked, prepared products, and `Outro/nao sei` do not enter rebaixa by default. `Outro/nao sei` may allow lot capture, but stays conservative and pending review instead of silently allowing rebaixa.
- **D-10:** Lot form preview copy uses operational next-action terms: `fica no radar`, `pedir rebaixa`, `retirar/perda`, `reembalar/perda`, and `conferir qualidade`. Existing products/lots keep their current mode/profile and are interpreted compatibly; missing policy details fall back conservatively.

### Loja vazia e primeiro lote real
- **D-11:** A central read with zero products, zero lots, zero active tasks, and no auth/sync blocker is an expected first-store state, not a fatal prepare-turn error.
- **D-12:** The empty-store state should say, in plain operational language, that the store is ready to register its first lot. The primary action is `Registrar lote`, which opens the same focused search/scan path and then product creation only if missing.
- **D-13:** Empty store guidance must not claim that the sales area is proven safe. It is a first-action path for real operation, while safe close still depends on central revalidation, task state, sync state, and the physical checklist.

### Readiness compacta vs bloqueio real
- **D-14:** Ajustes owns detailed healthy diagnostics for push, sync, build/update, account/store, privacy, and sign-out. Hoje should not render full-width blocking cards for healthy sync/push/build/camera states.
- **D-15:** Hoje promotes readiness to explicit blocker cards only when the state affects task execution, safe close, or validation. Examples: stale or missing central read, critical sync conflict, critical local command pending central confirmation, required/incompatible update, invalid authorization/device, or push/camera required for the current validation proof.
- **D-16:** Fechamento do turno should summarize active tasks, unresolved sync, stale central read, device/build blockers, and the physical checklist before enabling safe close. Its strict blocker semantics should remain stronger than ordinary Hoje status copy.
- **D-17:** Web changes are limited to vocabulary/review clarity needed by Phase 15. Command Center, Operacao, Aparelhos, Hoje, Fechamento, and Ajustes should share public labels for central read, local queue/cache, push, camera, build, device authorization, product review, and lot sync.

### the agent's Discretion
- The planner may choose exact component boundaries, module names, and whether policy mapping lives in `packages/domain`, `packages/contracts`, or mobile-local adapters first, as long as the mapping is typed, tested, deterministic, and does not expose technical mode labels to operators.
- The planner may decide whether recent/frequent lookup remains on the first product search surface as secondary UI, but the primary path must stay search/scan focused and creation must stay behind no-safe-reuse.
- The planner may choose the smallest safe extraction for shared readiness vocabulary, as long as mobile and web labels converge and no new truth island is created.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and locked requirements
- `.planning/phases/15-operational-surface-distillation/15-SPEC.md` - Locked Phase 15 requirements, boundaries, acceptance criteria, and UAT triggers.
- `.planning/ROADMAP.md` - Phase 15 goal, OPS-01..OPS-04 mapping, success criteria, and v1.1 phase boundaries.
- `.planning/REQUIREMENTS.md` - v1.1 requirements, especially OPS-01 through OPS-04 and boundaries with VAL-01..VAL-04.
- `.planning/PROJECT.md` - Milestone context and project decisions: push is not proof, sync truth stays explicit, devices are permanent operational truth, and zero expired products remains the core value.

### Prior phase handoff
- `.planning/phases/13-web-operational-navigation-and-readiness-surfaces/13-CONTEXT.md` - Web route/truth split: Operacao first, Aparelhos/Atualizacoes/Validacao dedicated, device blockers only when they affect daily execution.
- `.planning/phases/14-mobile-ajustes-and-device-controls/14-CONTEXT.md` - Ajustes decisions for push, sync, build/update, account/privacy/sign-out, route preservation, and detailed diagnostics moving out of Hoje.

### Mobile product and lot flow
- `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` - Current product lookup surface; currently exposes search, scan, recent, frequent, category, and create-product in one surface.
- `apps/mobile/src/capture/ProductFormScreen.tsx` - Current product creation flow; currently starts from category selection and can expose operational profile exceptions.
- `apps/mobile/src/capture/LotRegistrationScreen.tsx` - Existing adaptive lot fields, risk preview, lot save consequence, and current technical profile labels.
- `apps/mobile/src/capture/capture-copy.ts` - Current product/lote copy and `productModeLabels` that should be replaced or hidden behind operator policy language.
- `apps/mobile/src/capture/repository.ts` - Mobile repository contracts for central product search, product drafts, lot save, local/central sync state, and prepare-turn cache status.
- `apps/mobile/src/capture/product-lookup.test.tsx` - Existing mobile tests for product lookup, central reuse, similar candidates, and category/frequent lookup.
- `apps/mobile/src/capture/lot-registration.test.tsx` - Existing mobile tests for mode-adaptive lot registration fields.

### Domain policy, rebaixa, and tasks
- `packages/domain/src/types.ts` - Existing `ProductMode`, `RiskWindows`, category profile, product override, and lot input contracts.
- `packages/domain/src/profiles.ts` - Existing category/product override resolution and default windows.
- `packages/domain/src/risk.ts` - Existing risk calculation using `markdownDays`, quality windows, and mode-specific commands.
- `packages/domain/src/tasks.ts` - Existing task projection, rebaixa required resolution, terminal actions, and compatibility matrix.
- `packages/domain/src/risk.test.ts` - Existing risk tests, including product override windows and rebaixa risk state.
- `packages/domain/src/tasks.test.ts` - Existing task projection tests for formal validity, processed/repack loss, FLV inspection, receiving monitored, and rebaixa compatibility.
- `packages/domain/src/markdown.ts` - Existing markdown/rebaixa workflow eligibility.
- `packages/domain/src/markdown.test.ts` - Existing markdown eligibility and stage task tests.
- `packages/contracts/src/capture.ts` - Runtime contracts for product/category profiles, lot inputs, central lot snapshots, prepare-turn packages, and product search/draft flows.

### Readiness, prepare-turn, and safe close
- `apps/mobile/src/capture/CaptureApp.tsx` - Route stack, prepare-turn gate, first-store setup detection, product-to-lot flow, and push/camera readiness capture.
- `apps/mobile/src/capture/TodayScreen.tsx` - Current Hoje rendering for central notice, offline/sync status, push cards, active tasks, and shift-close entry.
- `apps/mobile/src/capture/today-copy.ts` - Current Hoje copy for safe/empty/task states and push/sync labels.
- `apps/mobile/src/capture/mobile-status.ts` - Existing mobile status vocabulary and priority ordering.
- `apps/mobile/src/capture/ajustes-readiness.ts` - Existing Ajustes readiness copy and push/sync readiness derivation.
- `apps/mobile/src/capture/AjustesScreen.tsx` - Detailed mobile readiness/settings surface added in Phase 14.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - Existing sync queue/conflict UI, retry, and destructive discard patterns.
- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - Current mobile safe/unsafe close UI, blocker summary, and central-state derivation.
- `packages/domain/src/shift-close.ts` - Existing strict safe-close blocker rules.
- `packages/contracts/src/command-center.ts` - Shared web projection contracts for readiness, device state, product review, lot sync, and pilot blockers.
- `apps/web/src/command-center/command-center-view-model.ts` - Existing web route labels, daily device blocker filtering, update path, and validation references.
- `apps/web/src/command-center/OperacaoRoute.tsx` - Daily web operation route.
- `apps/web/src/command-center/AparelhosRoute.tsx` - Device readiness route.
- `apps/web/src/command-center/AtualizacoesRoute.tsx` - Update/build route.
- `apps/web/src/command-center/ValidacaoRoute.tsx` - Loja 18 validation route.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProductDiscoveryScreen` already has central search, scan prefill, similar/reuse result states, and callbacks to confirm product or open creation. It is the natural place to enforce lot-first lookup weighting.
- `ProductFormScreen` already creates central product drafts and handles similar candidates. It needs the classifier/policy step before category rows.
- `LotRegistrationScreen` already adapts required fields by mode and calculates preview risk through the domain package. It needs policy-driven copy and no technical labels.
- `resolveRuleProfile`, `calculateLotRisk`, `projectCentralLotTask`, and markdown workflow helpers already support windows and task projection. Phase 15 should extend/guard policy semantics instead of duplicating risk logic in UI.
- `AjustesReadiness`, `mobile-status`, `TodayScreen`, `ShiftCloseScreen`, and `command-center-view-model` already contain readiness vocabulary that can be consolidated.

### Established Patterns
- Product and lot are separate operational facts: a product can be pending central review while the physical lot is captured with conservative copy.
- Central truth, local cache, local command sync, and business resolution are separate states. UI copy must not turn transport success into safety proof.
- Push is reminder/diagnostic only. It never resolves tasks, proves physical execution, or closes a shift.
- Safe close remains strict: central revalidation plus physical checklist, with blockers preserved until resolved.
- Public-safe fixtures and copy are required. Do not commit real Loja 18 product names, photos, tokens, private build URLs, or raw device identifiers.

### Integration Points
- Add a typed classifier/policy mapping and tests before changing the UI surfaces.
- Rework `ProductDiscoveryScreen` so `Cadastrar produto novo` and category browsing are gated behind no-safe-reuse or classifier flow.
- Rework `ProductFormScreen` so the classifier renders before category filtering/selection.
- Rework `LotRegistrationScreen` preview and product summary to use policy language and next-action copy.
- Update prepare-turn rendering in `CaptureApp.tsx` so zero central products/lots/tasks/no blockers becomes first-lot guidance rather than fatal-looking review copy.
- Distill `TodayScreen` readiness rendering by moving normal diagnostics to compact text or Ajustes and reserving cards for blockers that affect execution, safe close, or validation.
- Align `ShiftCloseScreen`, `AjustesScreen`, web command-center routes, and contracts/view-model labels around the shared readiness vocabulary.

</code_context>

<specifics>
## Specific Ideas

- Preferred first product surface: search/scan focused.
- Preferred product creation start: `Como esse produto esta na loja?`
- Preferred empty-store copy direction: first-lot assist, not fatal error.
- Preferred readiness rule: Ajustes owns details; Hoje shows only operational impact.
- Preferred fallback: `Outro/nao sei` captures conservatively and does not silently allow rebaixa.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 15-operational-surface-distillation*
*Context gathered: 2026-06-30T00:56:45.5393508-03:00*
