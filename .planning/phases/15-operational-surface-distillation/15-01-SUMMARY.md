---
phase: 15-operational-surface-distillation
plan: "01"
subsystem: domain
tags: [contracts, zod, policy, mobile-copy, product-classifier]

requires:
  - phase: 15-operational-surface-distillation
    provides: Locked product classifier and operational vocabulary decisions
provides:
  - Store-presentation classifier runtime schema and optional product metadata
  - Pure classifier-to-policy mapping for existing product modes
  - Public mobile copy for classifier choices and lot preview terms
affects: [mobile-capture, lot-registration, today-readiness, command-center-vocabulary]

tech-stack:
  added: []
  patterns:
    - Pure domain policy adapter over existing ProductMode and RiskWindows
    - Optional contract metadata for pre-Phase-15 compatibility

key-files:
  created:
    - packages/domain/src/product-policy.ts
    - packages/domain/src/product-policy.test.ts
  modified:
    - packages/contracts/src/capture.ts
    - packages/contracts/src/capture.test.ts
    - packages/domain/src/index.ts
    - apps/mobile/src/capture/capture-copy.ts
    - apps/mobile/src/capture/mobile-product-polish.test.tsx

key-decisions:
  - "Classifier metadata stays optional on product and draft contracts so existing products remain parseable."
  - "The domain policy maps human store presentation into existing ProductMode values instead of adding a new persisted taxonomy."
  - "Conservative classifiers can accept a product override mode but do not automatically enable rebaixa."

patterns-established:
  - "Product presentation policy is resolved by a pure domain helper before UI surfaces render mode-specific copy."
  - "Operator copy uses classifier labels and next-action terms instead of raw ProductMode labels."

requirements-completed: ["OPS-02", "OPS-04"]

duration: 6 min
completed: 2026-06-30
---

# Phase 15 Plan 01: Product Policy Foundation Summary

**Store-presentation classifier contracts, deterministic domain policy, and public mobile copy for lot-first product flow.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-30T10:04:00Z
- **Completed:** 2026-06-30T10:09:52Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added `StorePresentationKindSchema` with all eight operator-facing classifier states and optional product/draft metadata.
- Added `resolveProductOperationalPolicy` to map classifier/category/product override input to existing mode, lot fields, markdown permission, quality window, terminal action, review flag, and public policy key.
- Added shared mobile copy for `Como esse produto esta na loja?`, all classifier choices, and the lot preview terms `fica no radar`, `pedir rebaixa`, `retirar/perda`, `reembalar/perda`, and `conferir qualidade`.

## Task Commits

1. **Task 1: Add classifier contract schema and compatibility tests** - `515e4619` (feat)
2. **Task 2: Implement deterministic product operational policy** - `3ec4bd51` (feat)
3. **Task 3: Add public classifier and preview copy constants** - `c1f23287` (feat)

## Files Created/Modified

- `packages/contracts/src/capture.ts` - Adds classifier schema/type and optional metadata on product/catalog/draft payloads.
- `packages/contracts/src/capture.test.ts` - Covers all classifier values, rejects unknown values, and proves old product/draft payloads still parse.
- `packages/domain/src/product-policy.ts` - Pure policy helper for classifier-to-mode/window/action resolution.
- `packages/domain/src/product-policy.test.ts` - Covers every classifier, conservative unknown handling, markdown permission, and override windows.
- `packages/domain/src/index.ts` - Exports the new policy helper.
- `apps/mobile/src/capture/capture-copy.ts` - Adds public classifier and preview vocabulary constants.
- `apps/mobile/src/capture/mobile-product-polish.test.tsx` - Asserts public policy vocabulary does not expose raw mode labels.

## Decisions Made

- Optional classifier metadata preserves pre-Phase-15 data compatibility.
- Domain owns deterministic policy, while mobile owns public copy.
- `unknown_other` maps to `receiving_monitored`, blocks markdown, and requires central review.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact on plan:** No scope change.

## Issues Encountered

- `.agents/skills/impeccable/PRODUCT.md` referenced by the plan was not present. The available Impeccable product guidance was read from `.agents/skills/impeccable/reference/product.md`, which is the existing project skill reference for product UI.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 100 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - passed, 14 files / 142 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 220 tests.

## Self-Check: PASSED

- `StorePresentationKindSchema` and `StorePresentationKind` are exported.
- All eight classifier values and five preview terms are present in public copy.
- Domain policy maps classifiers to existing modes and keeps unknown/PED/prepared products out of automatic markdown.
- Existing product and draft fixtures without classifier metadata still parse.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 15-02 to render classifier-first product creation and gate product creation behind no-safe-reuse lookup.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
