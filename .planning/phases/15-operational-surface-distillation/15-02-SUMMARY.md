---
phase: 15-operational-surface-distillation
plan: "02"
subsystem: mobile-ui
tags: [react-native, product-lookup, product-classifier, operator-copy, offline-capture]

requires:
  - phase: 15-operational-surface-distillation
    provides: Store-presentation classifier contracts, deterministic policy helper, and public copy vocabulary
provides:
  - Search-first product discovery with create gated behind no-safe-reuse
  - Classifier-before-category product creation flow
  - Public product policy preview across discovery and confirmed product routes
affects: [lot-registration, today-readiness, command-center-vocabulary, mobile-capture]

tech-stack:
  added: []
  patterns:
    - UI-facing product policy copy helper over domain policy resolution
    - Contract-to-domain normalization at mobile policy boundaries

key-files:
  created:
    - apps/mobile/src/capture/product-policy-copy.ts
  modified:
    - apps/mobile/src/capture/ProductDiscoveryScreen.tsx
    - apps/mobile/src/capture/ProductFormScreen.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/product-lookup.test.tsx
    - apps/mobile/src/capture/prepare-turn.test.tsx
    - apps/mobile/src/capture/mobile-product-polish.test.tsx

key-decisions:
  - "Product creation is hidden until lookup proves no safe reuse, while similar central candidates require explicit review before continuing."
  - "Product creation asks store presentation before category so policy is derived from human classifier input rather than a technical mode picker."
  - "Operator-facing product confirmation uses public policy preview copy and never raw ProductMode strings."

patterns-established:
  - "Use `productPolicyPreviewForProduct` for candidate/confirmed product copy and `productPolicyPreview` for already-resolved form policy."
  - "Use `toDomainCategoryRuleProfile` when passing contract-inferred category profiles into domain policy helpers."

requirements-completed: ["OPS-02", "OPS-04"]

duration: 13 min
completed: 2026-06-30
---

# Phase 15 Plan 02: Product Entry Flow Summary

**Search-first product lookup with no-safe-reuse creation gates, classifier-first product creation, and public policy copy through the product-to-lot handoff.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-30T10:10:00Z
- **Completed:** 2026-06-30T10:22:13Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Hid `Cadastrar produto novo` before lookup, kept reusable central/local products on `Usar este produto`, and required review before continuing from similar central candidates.
- Reworked product creation so `Como esse produto esta na loja?` and the eight classifier choices render before categories, with `Outro/nao sei` showing conservative no-rebaixa copy.
- Replaced product confirmation raw mode/profile labels with public policy preview copy in discovery and confirmed-product routes.

## Task Commits

1. **Task 1: Gate product creation behind no-safe-reuse lookup** - `4a67ab4c` (feat)
2. **Task 2: Render classifier before category in product creation** - `bdae8cbc` (feat)
3. **Task 3: Remove technical profile labels from product confirmation journey** - `62dba841` (feat)

## Files Created/Modified

- `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` - Gates creation by lookup state and shows public policy copy in candidate confirmation.
- `apps/mobile/src/capture/ProductFormScreen.tsx` - Renders classifier choices before categories and resolves policy from classifier/category input.
- `apps/mobile/src/capture/CaptureApp.tsx` - Shows public policy copy on the confirmed product route while preserving `Registrar lote`.
- `apps/mobile/src/capture/product-policy-copy.ts` - Centralizes public product policy preview and contract-to-domain profile normalization.
- `apps/mobile/src/capture/repository.ts` - Preserves `storePresentation` from central catalog and draft records.
- `apps/mobile/src/capture/product-lookup.test.tsx` - Covers lookup gating, similar review, classifier ordering, and no raw mode leakage.
- `apps/mobile/src/capture/prepare-turn.test.tsx` - Updates empty-store setup to follow the classifier-before-category flow.
- `apps/mobile/src/capture/mobile-product-polish.test.tsx` - Asserts product flow copy stays public and free of raw ProductMode strings.

## Decisions Made

- Similar central candidates expose `Continuar cadastro apos revisar` only after the similar results are visible, instead of showing the normal create action.
- Existing products without `storePresentation` fall back to a neutral legacy copy: `Cadastro existente: confira validade e lote fisico antes de prosseguir.`
- The UI helper normalizes contract-inferred optional windows before calling the domain policy helper to satisfy strict `exactOptionalPropertyTypes`.

## Deviations from Plan

### Auto-fixed Issues

**1. Preserve central classifier metadata**
- **Found during:** Task 3 (Remove technical profile labels from product confirmation journey)
- **Issue:** Central catalog and draft adapters were not carrying optional `storePresentation`, so policy preview would fall back to legacy copy even when central data had classifier metadata.
- **Fix:** Added `storePresentation` propagation in `productCatalogItemToLocalRecord` and `productDraftToLocalRecord`.
- **Files modified:** `apps/mobile/src/capture/repository.ts`
- **Verification:** `cmd /c pnpm.cmd --filter @validade-zero/mobile test` and `typecheck` passed.
- **Committed in:** `62dba841`

**2. Add shared public policy copy helper**
- **Found during:** Task 3 (Remove technical profile labels from product confirmation journey)
- **Issue:** Discovery, form, and confirmed route needed identical public policy language without duplicating copy or leaking raw modes.
- **Fix:** Added `product-policy-copy.ts` with preview helpers and profile normalization.
- **Files modified:** `apps/mobile/src/capture/product-policy-copy.ts`, `ProductFormScreen.tsx`, `ProductDiscoveryScreen.tsx`, `CaptureApp.tsx`
- **Verification:** `mobile-product-polish.test.tsx` asserts no raw ProductMode strings in the operator-facing product flow.
- **Committed in:** `62dba841`

**3. Update first-setup test path for classifier-first form**
- **Found during:** Task 2 (Render classifier before category in product creation)
- **Issue:** The empty-store setup test still selected a category before choosing the now-required product presentation classifier.
- **Fix:** Updated the test to select `Embalado pelo fornecedor` before category selection.
- **Files modified:** `apps/mobile/src/capture/prepare-turn.test.tsx`
- **Verification:** Mobile suite passed with 36 files / 222 tests.
- **Committed in:** `bdae8cbc`

**Total deviations:** 3 auto-fixed. **Impact on plan:** No scope expansion; all fixes support the planned product-entry acceptance criteria.

## Issues Encountered

- TypeScript strict optional property semantics required explicit normalization from contract-inferred risk windows into the domain `Partial<RiskWindows>` shape.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 222 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- Textual acceptance check - `CaptureApp.tsx`, `ProductDiscoveryScreen.tsx`, `ProductFormScreen.tsx`, and `product-policy-copy.ts` contain no `Perfil operacional` or raw ProductMode strings.

## Self-Check: PASSED

- Initial product discovery render does not expose `Cadastrar produto novo`.
- Reusable results keep the operator on `Usar este produto`; no-match lookup opens creation with identifier prefill where applicable.
- Similar central results show review copy before draft creation can continue.
- Product form renders all eight classifier choices before category rows.
- `Outro/nao sei` shows conservative no-rebaixa copy.
- Confirmed product route still renders `Registrar lote`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 15-03 to make lot registration use the policy outcome for required fields, rebaixa eligibility, and backwards-compatible existing products.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
