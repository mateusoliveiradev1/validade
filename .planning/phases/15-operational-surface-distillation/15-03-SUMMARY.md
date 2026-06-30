---
phase: 15-operational-surface-distillation
plan: "03"
subsystem: mobile-ui
tags: [react-native, lot-registration, product-policy, markdown-gate, compatibility]

requires:
  - phase: 15-operational-surface-distillation
    provides: Search-first product entry and classifier-derived product policy metadata
provides:
  - Policy-aware lot registration fields
  - Operational lot preview copy using public next-action terms
  - Pre-Phase-15 product/lot compatibility proof in Hoje
affects: [today-readiness, markdown-workflow, recent-lots, mobile-capture]

tech-stack:
  added: []
  patterns:
    - Effective lot policy resolver with classifier-first and legacy-mode fallback
    - Deterministic lot preview tests through injectable `now`

key-files:
  created: []
  modified:
    - apps/mobile/src/capture/LotRegistrationScreen.tsx
    - apps/mobile/src/capture/lot-registration.test.tsx
    - apps/mobile/src/capture/product-policy-copy.ts
    - apps/mobile/src/capture/today-screen.test.tsx

key-decisions:
  - "Lot registration resolves classifier policy when present and falls back to existing product mode/profile for old products."
  - "The lot policy summary stays neutral; `pedir rebaixa` appears only in the risk preview when the current lot date is inside the allowed markdown window."
  - "Pre-Phase-15 products are not migrated or re-registered to satisfy classifier metadata."

patterns-established:
  - "Use policy `requiredLotFields` to decide which date/quality fields the lot form renders."
  - "Use D-10 public next-action terms in lot preview copy instead of risk state/command enum names."

requirements-completed: ["OPS-02", "OPS-04"]

duration: 9 min
completed: 2026-06-30
---

# Phase 15 Plan 03: Lot Policy Registration Summary

**Policy-aware lot registration with classifier-driven fields, safe markdown preview, and legacy product/lots still visible in Hoje.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-30T10:23:30Z
- **Completed:** 2026-06-30T10:31:50Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Updated lot registration to derive its effective policy from `storePresentation` when present and from legacy `ProductMode` when not.
- Replaced raw preview copy with public actions: `fica no radar`, `pedir rebaixa`, `retirar/perda`, `reembalar/perda`, and `conferir qualidade`.
- Proved old products/lots without classifier metadata can still be saved and still generate Hoje tasks from their existing mode/profile.

## Task Commits

1. **Task 1: Drive lot fields from resolved policy** - `e3396558` (feat)
2. **Task 2: Replace raw risk preview with operational next actions** - `e3396558` (feat)
3. **Task 3: Prove pre-Phase-15 product and lot compatibility** - `c6849aa0` (test)

## Files Created/Modified

- `apps/mobile/src/capture/LotRegistrationScreen.tsx` - Resolves lot policy, renders fields from `requiredLotFields`, and shows public action preview.
- `apps/mobile/src/capture/lot-registration.test.tsx` - Covers classifier policy fields, unknown conservative behavior, markdown gates, PED no-rebaixa, and legacy mode saveability.
- `apps/mobile/src/capture/product-policy-copy.ts` - Exposes product policy resolution for UI surfaces that need the effective policy object.
- `apps/mobile/src/capture/today-screen.test.tsx` - Adds pre-Phase-15 formal lot fixture that appears in Hoje and generates a markdown task.

## Decisions Made

- `Data de validade impressa` is used for printed-validity policies; processed/PED/repacked/prepared uses `Data de preparo/validade curta`.
- Expired formal lots show `retirar/perda`, not `pedir rebaixa`, even if the product policy generally allows markdown.
- Products without classifier metadata keep their existing mode/profile behavior through a conservative legacy fallback in the lot screen.

## Deviations from Plan

### Auto-fixed Issues

**1. Add injectable preview date**
- **Found during:** Task 2 (Replace raw risk preview with operational next actions)
- **Issue:** The previous preview used the machine date directly, which would make markdown/expired tests date-sensitive.
- **Fix:** Added optional `now` prop to `LotRegistrationScreen`; production defaults to `new Date()`.
- **Files modified:** `apps/mobile/src/capture/LotRegistrationScreen.tsx`
- **Verification:** Mobile tests and typecheck passed.
- **Committed in:** `e3396558`

**2. Avoid generic markdown copy in lot policy summary**
- **Found during:** Task 2 (Replace raw risk preview with operational next actions)
- **Issue:** Product-level summary copy could say `pedir rebaixa` even when the selected lot date was already expired.
- **Fix:** Made the lot policy summary neutral and reserved `pedir rebaixa` for the risk preview only.
- **Files modified:** `apps/mobile/src/capture/LotRegistrationScreen.tsx`
- **Verification:** Expired formal fixture asserts `retirar/perda` and not `pedir rebaixa`.
- **Committed in:** `e3396558`

**Total deviations:** 2 auto-fixed. **Impact on plan:** No scope expansion; both fixes make the planned markdown safety criteria testable and accurate.

## Issues Encountered

- Test strings with accent encoding were fragile in one legacy-mode loop. The test now uses field order only in that loop, while existing label-based tests still cover accessibility labels elsewhere.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 226 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - passed, 14 files / 142 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## Self-Check: PASSED

- Formal printed-validity fixture renders `Data de validade impressa`.
- Loose/FLV policy renders `Data de recebimento` and `Janela de qualidade (dias)`.
- `Outro/nao sei` renders conservative no-rebaixa copy.
- Formal markdown-window fixture renders `pedir rebaixa`; expired formal renders `retirar/perda`.
- PED/cut policy renders `reembalar/perda` and does not offer markdown.
- Pre-Phase-15 product/lots remain operational without classifier metadata.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 15-04 to connect the empty-store and Hoje readiness surfaces to the same operational vocabulary and safety constraints.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
