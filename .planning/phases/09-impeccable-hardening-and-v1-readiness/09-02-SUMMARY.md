---
phase: 09-impeccable-hardening-and-v1-readiness
plan: "02"
subsystem: mobile
tags: [expo, android, eas, auth, privacy, react-native, accessibility]
requires:
  - phase: 09-01
    provides: invite-first API, server-owned sessions, account state, and LGPD request contracts
provides:
  - Deterministic Android icon, adaptive icon, splash, and internal APK EAS profile
  - Session-gated mobile auth, first access, recovery, logout, and Privacy Center flows
  - Finalized Hoje/task/shift-close states using session-resolved identity and truthful loading/sync/evidence copy
affects: [web-command-center, release-readiness, android-pilot, e2e]
tech-stack:
  added: []
  patterns: [deterministic PNG assets, session-gated mobile shell, session-resolved operational actor, static mobile polish guard]
key-files:
  created:
    - scripts/generate-brand-assets.mjs
    - apps/mobile/eas.json
    - apps/mobile/src/auth/AuthGate.tsx
    - apps/mobile/src/privacy/PrivacyCenterScreen.tsx
    - apps/mobile/src/capture/mobile-product-polish.test.tsx
  modified:
    - apps/mobile/app.json
    - apps/mobile/App.tsx
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/ShiftCloseScreen.tsx
key-decisions:
  - "Android launch assets are generated from local deterministic pixels and contain only IHDR/IDAT/IEND PNG chunks."
  - "AuthGate is the only normal route to CaptureApp; active server session and task capability are required before Hoje renders."
  - "Operational commands receive actor and store context from the session shell instead of local display labels."
patterns-established:
  - "Loading state never makes a safety claim before the Hoje refresh completes."
  - "Mobile source guards enforce approved token use, typography weights, and explicit sync/evidence/close semantics."
requirements-completed: [UI-04]
duration: 20min
completed: 2026-06-22
---

# Phase 09 Plan 02: Android Product Shell Summary

**Android-ready operational shell with deterministic VZ identity, invite-first access, Privacy Center, and truth-preserving Hoje hardening.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-22T20:48:00-03:00
- **Completed:** 2026-06-22T21:08:18-03:00
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments

- Generated repo-safe Android icon, adaptive icon, and splash assets from code; Expo config references them and EAS includes an internal APK pilot profile.
- Added `AuthGate` before `CaptureApp` with session loading, login, invitation activation, recovery, account restriction, no-permission, logout, and Privacy Center paths.
- Hardened Hoje, task resolution, and shift close so loading does not imply safety, session identity flows into commands, and pending sync/evidence/close blockers stay explicit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Android brand assets, splash, loading, and APK profile** - `9a59e24` (`feat`)
2. **Task 2: Put AuthGate, first access, recovery, and Privacy Center before Hoje** - `266a92e` (`feat`)
3. **Task 3: Harden mobile operational screens to final product craft** - `9a65767` (`feat`)

**Plan metadata:** pending this summary commit

## Files Created/Modified

- `scripts/generate-brand-assets.mjs` - Deterministic, metadata-free PNG seal generator and config validator.
- `apps/mobile/app.json` and `apps/mobile/eas.json` - Branded Android config and controlled internal APK profile.
- `apps/mobile/src/auth/*` - Session-first access screens and fetch-backed auth client boundary.
- `apps/mobile/src/privacy/PrivacyCenterScreen.tsx` - Seven required privacy/LGPD sections with a bounded rights request path.
- `apps/mobile/src/capture/TodayScreen.tsx` - Safety-first loading, error, empty, sync, and long-copy behavior.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` and `ShiftCloseScreen.tsx` - Session-resolved execution identity and store context.

## Decisions Made

- Used a code-generated seal instead of external artwork, photos, or stock assets to keep the public repository safe and repeatable.
- Kept the session token inside the auth client boundary and require server-resolved account/store/capability data before opening operational work.
- Retained all offline/evidence/close caveats inline; polish improves legibility without converting local states into central confirmation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made fixture data unambiguously synthetic and refined the real-data detector.**
- **Found during:** Task 1 verification
- **Issue:** Existing Phase 09 auth fixtures used `Loja Piloto`, while the real-data scanner also interpreted ordinary prose such as `loja ou capacidade` as a possible store name.
- **Fix:** Marked fixture stores as fictional and made the detector require a title-cased store name after `loja`.
- **Files modified:** `apps/api/src/authentication.test.ts`, `packages/contracts/src/authentication.test.ts`, `packages/database/src/repositories.test.ts`, `scripts/check-no-real-data.mjs`
- **Verification:** Focused auth/repository tests plus `pnpm security:data` and `pnpm security:evidence` passed.
- **Committed in:** `4c9a9fc`

**2. [Rule 3 - Blocking] Registered new TypeScript-aware mobile tests and removed unsafe fetch assumptions.**
- **Found during:** Task 3 verification
- **Issue:** Root lint did not include the new test paths and treated JSON/environment access as unsafe.
- **Fix:** Added the test files to ESLint's project-service allow-list and narrowed fetch/environment data through `unknown` guards.
- **Files modified:** `eslint.config.mjs`, `apps/mobile/src/auth/AuthGate.tsx`
- **Verification:** Root lint and dependency-boundary check passed.
- **Committed in:** `9a65767`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both changes strengthen release gates and preserve the intended security and type-safety constraints without adding product scope.

## Issues Encountered

- The initial subagent quota interruption occurred before this plan began. Execution continued sequentially in the existing GSD recovery flow, with each task committed and independently verified.

## User Setup Required

None - the EAS profile is ready for a controlled APK build, but project credentials and release execution remain outside the public repository.

## Next Phase Readiness

- Plan 09-03 can build the matching web Command Center and admin shell against the completed auth contracts.
- Plan 09-04 can use the mobile auth and operational tests as v1 release journey foundations.

## Self-Check: PASSED

- All three task commits exist and generated assets are referenced by the Expo configuration.
- Asset/config, mobile test, typecheck, lint/boundary, real-data, and evidence-security gates passed.

---
*Phase: 09-impeccable-hardening-and-v1-readiness*
*Completed: 2026-06-22*
