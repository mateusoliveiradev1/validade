---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
plan: "02"
subsystem: mobile
tags: [gpp, navigation, react-native, feature-flags, hub]
requires:
  - phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
    provides: 18-01 mobile GPP client and pending queue
provides:
  - Role-aware mobile Controle GPP route
  - Controle GPP hub with four approved entries
  - Separate shell entry gated by server session feature flag and GPP actions
affects:
  - 18-03 mobile avaria flow
  - 18-04 purchase and pending surfaces
  - 18-05 Today boundary proof
tech-stack:
  added: []
  patterns: [role-aware initial route, session-action gated shell entry, one-column operational hub]
key-files:
  created:
    - apps/mobile/src/capture/ControleGppScreen.tsx
    - apps/mobile/src/capture/mobile-gpp-navigation.test.tsx
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
key-decisions:
  - "The GPP role starts on Controle GPP only when `controle_gpp_enabled` and a GPP action are present."
  - "Eligible non-GPP roles open Controle GPP from a separate session-bar entry; Hoje remains free of GPP actions."
patterns-established:
  - "Client-side GPP visibility treats missing feature flags/actions as disabled for compatibility with older sessions."
  - "Controle GPP hub uses existing capture UI primitives with no dashboard or hero treatment."
requirements-completed: ["GPP-08"]
duration: 18min
completed: 2026-07-03
---

# Phase 18 Plan 02: Controle GPP Route and Hub Summary

Role-aware mobile Controle GPP entry with a separate hub for avaria, purchase, pending records, and sent-today review.

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-03T01:31:00-03:00
- **Completed:** 2026-07-03T01:49:00-03:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `gpp-control` to the mobile route stack and exported route eligibility helpers for focused regression coverage.
- Added `ControleGppScreen` with the approved title, body, `Registrar avaria`, `Solicitar compra interna`, `Minhas pendencias`, and `Enviadas hoje`.
- Added a separate `Controle GPP` session-bar entry gated by `controle_gpp_enabled` and GPP session actions.
- Preserved Hoje as the daily validation surface for collaborator, lead, and admin starts.

## Task Commits

1. **Tasks 1-3: GPP route, hub, shell entry, and navigation tests** - `3c54ea7f`

**Plan metadata:** committed with this summary

## Files Created/Modified

- `apps/mobile/src/capture/ControleGppScreen.tsx` - One-column mobile GPP hub.
- `apps/mobile/src/capture/CaptureApp.tsx` - GPP route, initial-route resolver, and gated shell entry.
- `apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` - Role, feature flag, shell entry, and Today-boundary tests.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- mobile-gpp-navigation` - passed, 41 files / 302 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `rg "Registrar avaria|Solicitar compra interna|Controle GPP" TodayScreen/CaptureApp/ControleGppScreen/tests` - confirmed GPP action labels are absent from `TodayScreen.tsx`.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

- Older mobile session fixtures lacked GPP feature flag/action fields. The eligibility helper now treats missing fields as disabled instead of throwing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-03. The avaria flow can mount from the `Registrar avaria` hub action without altering Hoje.

---

*Phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas*
*Completed: 2026-07-03*
