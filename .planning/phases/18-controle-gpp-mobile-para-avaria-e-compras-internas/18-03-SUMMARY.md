---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
plan: "03"
subsystem: mobile
tags: [gpp, avaria, form-validation, offline-pending, central-ack]
requires:
  - phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
    provides: 18-01 client/queue and 18-02 route/hub
provides:
  - Product-code-first Registrar avaria flow
  - Required avaria field validation and approved finality/unit options
  - Central-confirmed, replayed, central-failed, and offline-pending avaria feedback
affects:
  - 18-04 pending status surface
  - 18-05 retry/conflict proof
tech-stack:
  added: []
  patterns: [guided GPP form, central-success-only feedback, offline-only pending save]
key-files:
  created:
    - apps/mobile/src/capture/GppAvariaFlow.tsx
    - apps/mobile/src/capture/gpp-flow-state.ts
    - apps/mobile/src/capture/gpp-avaria-flow.test.tsx
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/ControleGppScreen.tsx
    - apps/mobile/src/capture/gpp-copy.ts
key-decisions:
  - "Avaria submit success is rendered only from parsed central success or replay."
  - "Offline transport failure saves a GPP pending avaria; central failure remains in the form."
patterns-established:
  - "GPP flow validation lives in `gpp-flow-state.ts` for reuse by purchase and pending work."
  - "Hub actions navigate inside the GPP route family, not through Hoje."
requirements-completed: ["GPP-08"]
duration: 29min
completed: 2026-07-03
---

# Phase 18 Plan 03: Registrar Avaria Flow Summary

Guided mobile avaria submission with required product code, quantity/unit, finality/destination, central acknowledgement, and honest offline pending fallback.

## Performance

- **Duration:** 29 min
- **Started:** 2026-07-03T01:50:00-03:00
- **Completed:** 2026-07-03T02:19:00-03:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `GppAvariaFlow` with product-code-first entry, review step, and hub return without falling into Hoje.
- Enforced required product code, positive numeric quantity, unit, finality, and destination before building a central request.
- Added exact finality labels: `Baixa GPP`, `Reaproveitamento`, `Producao interna`, `Transferencia`.
- Wired central-confirmed/replayed success, central failure, and offline-pending local queue behavior.

## Task Commits

1. **Tasks 1-3: Avaria flow, validation, feedback, and tests** - `33e293f3`

**Plan metadata:** committed with this summary

## Files Created/Modified

- `apps/mobile/src/capture/GppAvariaFlow.tsx` - Guided avaria UI and submit behavior.
- `apps/mobile/src/capture/gpp-flow-state.ts` - Avaria draft validation and request builder.
- `apps/mobile/src/capture/gpp-avaria-flow.test.tsx` - Required-field, review, central success, offline pending, and central failure tests.
- `apps/mobile/src/capture/CaptureApp.tsx` - `gpp-avaria` route.
- `apps/mobile/src/capture/ControleGppScreen.tsx` - Hub action wiring.
- `apps/mobile/src/capture/gpp-copy.ts` - Avaria central feedback copy.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-avaria-flow mobile-gpp-navigation` - passed, 42 files / 307 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-04. Purchase flow can reuse the same validation/request and feedback pattern, and pending UI can consume the GPP pending queue states.

---

*Phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas*
*Completed: 2026-07-03*
