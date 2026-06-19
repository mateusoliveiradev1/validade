---
phase: 03-mobile-lot-capture
plan: "02"
subsystem: mobile-capture-ui
tags: [react-native, expo, mobile, zod, product-discovery, lot-registration]
requires:
  - phase: 03-mobile-lot-capture
    provides: Runtime capture contracts and a durable local repository from Plan 03-01.
provides:
  - Camera-independent manual product discovery and explicit confirmation.
  - Minimum product creation with category profile and labeled product override.
  - Mode-aware lot registration with immediate domain risk feedback and repeat reset.
affects: [recent-lot-list, physical-observations, barcode-assistance]
tech-stack:
  added: [@validade-zero/domain workspace dependency in mobile]
  patterns: [native capture primitives, explicit confirmation before lot entry, domain-calculated risk preview]
key-files:
  created:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/ProductDiscoveryScreen.tsx
    - apps/mobile/src/capture/ProductFormScreen.tsx
    - apps/mobile/src/capture/LotRegistrationScreen.tsx
  modified:
    - apps/mobile/App.tsx
    - apps/mobile/src/capture/capture-copy.ts
    - apps/mobile/src/capture/capture-ui.tsx
key-decisions:
  - "Manual search is the first path and candidate selection cannot bypass product confirmation."
  - "The category profile stays the default; a product-specific mode is a visible exception."
  - "Lot registration calls the existing domain risk calculator and resets every lot fact after a successful repeat action."
patterns-established:
  - "Use labeled native action and field primitives with 48dp primary targets and plain-language inline errors."
  - "Keep all visible mobile capture copy in Portuguese-BR and retain manual fallbacks before hardware assistance."
requirements-completed: [CAT-01, CAT-02]
duration: 14 min
completed: 2026-06-19
status: complete
---

# Phase 03 Plan 02: Manual product and lot capture Summary

**A collaborator can now manually find or minimally create a product, confirm it, and persist a product-mode-correct lot without camera permission.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-19T16:42:00Z
- **Completed:** 2026-06-19T16:56:34Z
- **Tasks:** 2/2 complete
- **Files modified:** 13

## Accomplishments

- Replaced the smoke screen with an operational, mobile-first capture flow rooted in manual product discovery.
- Added confirmation-gated product lookup, minimum product creation, and visibly pending optional supplier/GTIN data.
- Added mode-aware lot fields, fixed location order, long-date feedback, local save confirmation, and safe repeat capture powered by the domain risk engine.

## Task Commits

1. **Task 1: Replace the smoke screen with manual product discovery and confirmation** - `c29f30b` (feat)
2. **Task 2: Implement mode-aware lot entry, local save feedback, and safe repeat capture** - `b858ace` (feat)

## Files Created/Modified

- `apps/mobile/App.tsx` - mounts the durable capture flow instead of a smoke-only screen.
- `apps/mobile/src/capture/CaptureApp.tsx` - local navigation across discovery, product creation, confirmation, and lot entry.
- `apps/mobile/src/capture/ProductDiscoveryScreen.tsx` - manual search, supporting shortcuts, and mandatory candidate confirmation.
- `apps/mobile/src/capture/ProductFormScreen.tsx` - minimum product creation with an explicit override choice.
- `apps/mobile/src/capture/LotRegistrationScreen.tsx` - mode-aware fields, location selection, domain risk preview, save feedback, and repeat reset.
- `apps/mobile/src/capture/*.test.tsx` - fictitious component coverage for lookup and registration paths.

## Decisions Made

- Product candidates always show category and operational profile before the `Confirmar produto` action; manual lookup never opens lot entry automatically.
- The lot screen asks for its product-mode dates only after identity, quantity, and location, mirroring the aisle workflow.
- A generated lot identity is visually named internal, while `Registrar outro lote` preserves only the already confirmed product context.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Missing Critical] Added the direct domain dependency to the mobile app**

- **Found during:** Task 1 (mobile composition)
- **Issue:** The mobile lot form must call the Phase 2 risk calculator directly, but the app did not declare the domain workspace package.
- **Fix:** Added `@validade-zero/domain: workspace:*` to the mobile package before consuming domain types and `calculateLotRisk`.
- **Files modified:** `apps/mobile/package.json`, `pnpm-lock.yaml`
- **Verification:** Mobile typecheck, focused component tests, and lint pass.
- **Committed in:** `c29f30b`

**2. [Rule 1 - Bug] Updated the existing App smoke test for the new native surface**

- **Found during:** Task 1 (test execution)
- **Issue:** The Phase 1 smoke test expected retired placeholder copy and did not mock the newly initialized SQLite boundary.
- **Fix:** Kept the test as a smoke check for the manual discovery entry point and mocked only its native storage seam.
- **Files modified:** `apps/mobile/src/App.test.tsx`
- **Verification:** Mobile test project passes.
- **Committed in:** `c29f30b`

---

**Total deviations:** 2 auto-fixed (1 missing dependency, 1 stale smoke test).
**Impact on plan:** Both fixes were required to integrate the approved flow safely; no camera, task, sync, or server scope was added.

## Issues Encountered

None - all task and plan verification gates passed.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- product-lookup` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- lot-registration` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed
- `pnpm.cmd lint` - passed
- Impeccable detector over the capture screens - passed with no findings

## Self-Check: PASSED

The manual path remains usable without camera permission, confirmation precedes durable lot entry, all three product modes expose their required fields, and the repeat path clears lot-specific facts.

## Next Phase Readiness

The next plan can read the same repository snapshots into the recent operational list and append physical observations without reimplementing product or lot registration.

---
*Phase: 03-mobile-lot-capture*
*Plan: 02*
*Completed: 2026-06-19*
