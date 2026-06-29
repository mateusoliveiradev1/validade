---
phase: 14-mobile-ajustes-and-device-controls
plan: "04"
subsystem: mobile-ui
tags: [react-native, ajustes, build-truth, privacy, auth, sign-out]
requires:
  - phase: 14-mobile-ajustes-and-device-controls
    provides: "14-03 sync health and pending-work truth in Ajustes"
provides:
  - "Ajustes build/update card with installed versus approved APK truth"
  - "Read-only account/store/role/session section"
  - "Privacy entry wired to the existing AuthGate Centro de Privacidade"
  - "Sign-out confirmation that preserves pending-work truth"
affects: [phase-14, mobile-ajustes, auth-gate, build-info]
tech-stack:
  added: []
  patterns:
    - "Ajustes displays server-owned account facts without local role/store switching"
    - "Sign-out is a session action only and does not mutate tasks, sync queue, or conflicts"
key-files:
  modified:
    - apps/mobile/src/capture/AjustesScreen.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/ajustes-screen.test.tsx
    - apps/mobile/src/auth/auth-flow.test.tsx
key-decisions:
  - "Kept `readMobileBuildInfo()` as the source of public-safe build fields and rendered no artifact links."
  - "Privacy remains owned by AuthGate; Ajustes only calls the existing ready-control callback."
  - "Logout requires a second confirmation and does not call sync, conflict resolution, or task-resolution APIs."
patterns-established:
  - "Ajustes cards use explicit action callbacks passed from shell/auth owners instead of owning auth mutations directly."
  - "Build/account/privacy tests pair rendered copy checks with denylist assertions for sensitive strings."
requirements-completed: ["SET-04", "SET-05"]
duration: 12min
completed: 2026-06-29
---

# Phase 14 Plan 04: Build Account Privacy And Sign-Out Summary

**Ajustes account, build/update, privacy, and sign-out controls with public-safe copy and pending-work safeguards**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-29T03:55:45Z
- **Completed:** 2026-06-29T04:01:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Replaced the `Atualizacao do app` placeholder with installed version/build, approved version/build, approved artifact label, compatibility, environment, API target, package id, and a manual update step.
- Expanded `Conta e loja` with actor, store name/id, role, account status, and session expiry while keeping the section read-only.
- Added `Privacidade` copy that summarizes account, store, operational actions, evidence, sync, permissions, installed build, and audit data use.
- Wired `Abrir Centro de Privacidade` to the existing AuthGate ready callback.
- Added `Sair com pendencias visiveis` with first-press confirmation, pending/conflict counts, `Continuar nos Ajustes`, and final logout confirmation.
- Added tests for public-safe build rendering, manual update step, account/store read-only copy, privacy callback, AuthGate privacy routing, and sign-out non-mutation behavior.

## Task Commits

Each task was committed as part of one coupled account/build/privacy implementation:

1. **Task 1: Render public-safe build and manual update truth** - `db54b71` (feat)
2. **Task 2: Add read-only account/store and privacy controls** - `db54b71` (feat)
3. **Task 3: Add sign-out confirmation with pending-work warning** - `db54b71` (feat)

**Plan metadata:** pending in this commit.

## Files Created/Modified

- `apps/mobile/src/capture/AjustesScreen.tsx` - Build/update, account/store, privacy, and sign-out sections.
- `apps/mobile/src/capture/CaptureApp.tsx` - Passes resolved build info into Ajustes.
- `apps/mobile/src/capture/ajustes-screen.test.tsx` - Build, account, privacy, and sign-out behavior tests.
- `apps/mobile/src/auth/auth-flow.test.tsx` - Authenticated privacy callback opens the real privacy center.

## Decisions Made

- Did not modify `build-info.ts`; it already provided the required public-safe installed and approved build fields.
- Kept account/store/role read-only and routed wrong-store guidance to leadership or administration.
- Used the existing AuthGate callbacks for privacy and logout so Ajustes does not own auth state.

## Deviations from Plan

The plan listed `build-info.ts` and `build-info.test.ts` as possible modification targets. They were read and reused as-is because the existing public-safe build contract already met the requirements.

**Total deviations:** 1 intentional scope reduction.
**Impact on plan:** Lower churn; SET-04 and SET-05 are covered through Ajustes and AuthGate tests.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 209 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## Next Phase Readiness

Ready for `14-05`: all Ajustes sections are implemented, so final validation can run the full phase gates and close remaining state.

---
*Phase: 14-mobile-ajustes-and-device-controls*
*Completed: 2026-06-29*
