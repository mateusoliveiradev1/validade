---
phase: 13-web-operational-navigation-and-readiness-surfaces
plan: "03"
subsystem: web-ui
tags: [react, command-center, aparelhos, push-test, vitest]

requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-01 route foundation and shared projection host
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-02 Operacao route separation
provides:
  - Dedicated Aparelhos route with readiness-ordered device rows
  - Safe push-test action and timeline moved out of Operacao
  - Capability and device-scope gate for safe push testing
  - Aparelhos route boundary tests for update and validation separation
affects: [phase-13, aparelhos-route, web-command-center, safe-push-test]

tech-stack:
  added: []
  patterns: [device-readiness-route, diagnostic-push-action]

key-files:
  created:
    - apps/web/src/command-center/AparelhosRoute.tsx
  modified:
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center-view-model.ts
    - apps/web/src/command-center/command-center.test.tsx

key-decisions:
  - "Aparelhos owns detailed device readiness and the safe push-test action."
  - "Safe push tests stay diagnostic-only and never claim task execution or area safety."
  - "Aparelhos may show APK aprovado as compatibility summary, but not install, QR, update, or validation instructions."

patterns-established:
  - "Device rows are sorted by bloqueado, atencao, apto, then updatedAt descending."
  - "Safe push-test disabled reasons are pure view-model logic and reused by route tests."

requirements-completed: ["WEB-03"]

duration: 5 min
completed: 2026-06-29
---

# Phase 13 Plan 03: Aparelhos Route Summary

**Device readiness route with ordered per-device facts and diagnostic-only safe push testing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-29T02:05:40Z
- **Completed:** 2026-06-29T02:10:55Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `AparelhosRoute.tsx` with the dedicated heading `Aparelhos`.
- Rendered devices in readiness order: `bloqueado`, `atencao`, `apto`, then newest `updatedAt`.
- Device rows now show verdict, label, masked id, active user, `Causa:`, `Agora:`, last central read, last sync, push state, camera state, build compatibility summary, and updated timestamp.
- Moved `Enviar teste seguro` and push-test timeline to Aparelhos, preserving `sendSafePushTest({ storeId, deviceIdMasked, deviceLabel })` and append behavior.
- Added view-model disabled logic with the required copy: `Teste seguro exige aparelho autorizado, loja confirmada e leitura central recente.`
- Added tests proving readiness order, diagnostic copy, timeline append, and route boundaries.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract Aparelhos route with readiness-ordered list** - `3de2f9a5` (feat)
2. **Task 2: Keep safe push test diagnostic and capability-gated** - `30439436` (test)
3. **Task 3: Add Aparelhos route tests** - `aa71afbc` (test)

## Files Created/Modified

- `apps/web/src/command-center/AparelhosRoute.tsx` - Dedicated device readiness and safe push-test route.
- `apps/web/src/command-center/CommandCenter.tsx` - Routes `activeRoute="aparelhos"` into AparelhosRoute.
- `apps/web/src/command-center/command-center-view-model.ts` - Adds safe push-test disabled reason helper.
- `apps/web/src/command-center/command-center.test.tsx` - Covers readiness order, send payload, timeline append, diagnostic copy, and route boundaries.

## Decisions Made

- Aparelhos shows build only as compatibility summary. Detailed update/install guidance remains for Atualizacoes.
- The safe push-test button can be present but disabled with explicit reason when authorization or confirmed scope is missing.
- The push timeline remains public-safe and diagnostic; it does not resolve tasks or prove area safety.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion.

## Issues Encountered

- Initial route copy mentioned `QR`; tests caught that as update-instruction leakage. Copy was corrected to a neutral Atualizacoes hint before commit.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files and 36 tests
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed

## Next Phase Readiness

Ready for `13-04`: Atualizacoes can now own approved build, installed versions, stale/incompatible groupings, and safe/manual update path without competing with Aparelhos.

---
*Phase: 13-web-operational-navigation-and-readiness-surfaces*
*Completed: 2026-06-29*
