# Phase 15: Operational Surface Distillation - Patterns

**Mapped:** 2026-06-30
**Scope:** Mobile capture surfaces, domain policy, readiness vocabulary, web Command Center clarity

## Pattern Map

| Target Area | Closest Existing Analog | Reuse Pattern |
|-------------|-------------------------|---------------|
| Product classifier | `ProductFormScreen.tsx` category selection and `capture-copy.ts` labels | Keep `SelectionRow`, `StatusNotice`, `Field`, `PrimaryAction`; replace technical mode choice with human classifier rows. |
| Product search gating | `ProductDiscoveryScreen.tsx` central search result handling | Keep central response states `reuse_available`, `similar_requires_review`, `draft_pending_review`, `no_safe_reuse`; make create action conditional on no safe reuse. |
| Policy mapping | `risk.ts`, `tasks.ts`, `repository.ts` helper conversions | Add pure domain helper and tests; feed existing `ProductMode`, `RiskWindows`, and task command semantics rather than new UI-side rules. |
| Lot preview | `LotRegistrationScreen.tsx` `calculatePreview` and `lotSaveConsequence` | Keep risk calculation, replace raw state/command copy with operator action terms. |
| Empty store prepare-turn | `CaptureApp.tsx` `isFirstStoreSetupState` | Reuse detection and route into the same `Registrar lote` flow; do not mark safe area. |
| Hoje readiness | `TodayScreen.tsx`, `offline-sync-ui.tsx`, `ajustes-readiness.ts` | Let Ajustes own detail; Today filters healthy states and promotes only blockers. |
| Safe close | `ShiftCloseScreen.tsx`, `evaluateShiftClose` | Add summary around the existing domain evaluation; never weaken eligibility. |
| Web vocabulary | `command-center-view-model.ts`, `OperacaoRoute.tsx`, `AparelhosRoute.tsx` | Adjust public labels and grouping only; avoid API/schema churn unless tests prove it is required. |

## Component Responsibilities

| File | Role | Phase 15 Guidance |
|------|------|-------------------|
| `packages/contracts/src/capture.ts` | Runtime schemas for product/lote capture | Add classifier schema/types only if needed by mobile/API boundary; keep fields optional for compatibility. |
| `packages/domain/src/product-policy.ts` | New deterministic policy adapter | Pure functions, no UI imports, no clock except explicit input. |
| `apps/mobile/src/capture/capture-copy.ts` | Mobile operational labels | Own the exact human labels from D-05 and next-action terms from D-10. |
| `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` | Search/scan entry | Primary path is search/scan, creation only after no safe reuse. |
| `apps/mobile/src/capture/ProductFormScreen.tsx` | Product draft creation/review | Classifier question renders before categories and controls policy preview. |
| `apps/mobile/src/capture/LotRegistrationScreen.tsx` | Physical lot capture | Render policy-aware fields and preview; existing products remain valid. |
| `apps/mobile/src/capture/CaptureApp.tsx` | Route orchestration and prepare-turn | Empty first-store setup enters `Registrar lote`; pass build/device facts to close if needed. |
| `apps/mobile/src/capture/TodayScreen.tsx` | Daily execution surface | Show blockers that affect execution/safe close/validation; hide healthy diagnostic detail. |
| `apps/mobile/src/capture/ShiftCloseScreen.tsx` | End-of-shift gate | Summarize blockers/checklist before safe-close action; strict domain gate remains source of truth. |
| `apps/web/src/command-center/*` | Leadership clarity | Align vocabulary and route references for central read, local queue/cache, push, camera, build, authorization, product review, lot sync. |

## Test Analogues

| Behavior | Existing Test File | Add/Update |
|----------|--------------------|------------|
| Search before create | `product-lookup.test.tsx` | Assert create hidden before/no reuse; similar candidates block draft creation. |
| Lot field branching | `lot-registration.test.tsx` | Add classifier policy fixtures and no-rebaixa cases. |
| Mobile copy/tokens | `mobile-product-polish.test.tsx` | Assert no raw `ProductMode` labels on operator surfaces. |
| Empty prepare-turn | `mobile-release-journeys.test.tsx` or `today-screen.test.tsx` | Assert first-store state opens `Registrar lote` and does not claim safe area. |
| Hoje readiness | `today-screen.test.tsx`, `mobile-status.test.ts` | Assert healthy states compact; blockers prominent. |
| Safe close | `shift-close.test.tsx`, `packages/domain/src/shift-close.test.ts` | Assert summary and strict blockers for active tasks/sync/stale central/device/build/checklist. |
| Web vocabulary | `command-center.test.tsx`, `packages/contracts/src/command-center.test.ts` | Assert public labels and no sensitive/private text. |

## Constraints for Executors

- Use existing tokens: `captureColors`, `captureSpacing`, `captureRadii`, and web theme tokens.
- Keep cards at 8px radius or existing shadcn radius; no nested card redesign.
- Keep primary mobile touch targets at least 48 dp.
- Do not add dependencies for policy, state machines, icons, forms, or styling.
- All fixtures remain fictitious and public-safe.
