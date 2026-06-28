---
phase: 12-pilot-operations-and-device-readiness
plan: "03"
subsystem: mobile-api-web-release-truth
tags: [build-metadata, android, command-center, device-readiness, release-truth]
requires:
  - phase: 12-pilot-operations-and-device-readiness
    plan: "02"
    provides: "Registered pilot devices and safe push-test timeline in Command Center."
provides:
  - "Traceable Phase 12 mobile versioning: app 0.12.0 and Android versionCode 120."
  - "Sanitized mobile build-info adapter and authenticated build truth surface."
  - "Command Center build compatibility against approved staging artifact phase-12-staging-apk-120."
affects: [phase-12, mobile, command-center, release-readiness, device-readiness]
tech-stack:
  added:
    - "expo-application@56.0.3"
  patterns:
    - "Installed-build truth is public metadata, not install evidence."
    - "Compatibility compares against the approved staging artifact, not every commit on main."
    - "Optional native Expo modules are read through a fallback adapter for Node/Vitest safety."
key-files:
  created:
    - apps/mobile/src/build-info.ts
    - apps/mobile/src/build-info.test.ts
  modified:
    - package.json
    - apps/mobile/package.json
    - apps/mobile/app.json
    - apps/mobile/app.config.js
    - apps/mobile/App.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/prepare-turn.test.tsx
    - packages/contracts/src/command-center.ts
    - packages/database/src/capture-repository.ts
    - apps/api/src/command-center.ts
    - apps/web/src/command-center/CommandCenter.tsx
    - docs/release/android-pilot-install.md
    - docs/release/v1-readiness.md
key-decisions:
  - "Approved staging artifact label is phase-12-staging-apk-120; no install URL is committed."
  - "Build status values are atual, desatualizado, desconhecido, and incompativel."
  - "An old APK can still sync while remaining Atencao/Bloqueado for rollout readiness."
patterns-established:
  - "Mobile prepare-turn payload includes sanitized version, build, environment, API target, device label, and foreground timestamp."
  - "Device readiness returns approved artifact label/version/build alongside compatibility."
requirements-completed: [P12-RELEASE-03, P12-DEVICE-01, P12-OPS-05]
duration: 64 min
completed: 2026-06-28
---

# Phase 12 Plan 03: Pilot Build Truth Summary

**The pilot APK now has traceable installed-build truth across mobile, API, and Command Center without treating build metadata as device/provider proof.**

## Performance

- **Duration:** 64 min
- **Started:** 2026-06-28T15:09:03Z
- **Completed:** 2026-06-28T16:13:14Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments

- Replaced placeholder `0.0.0` versioning with Phase 12 `0.12.0` and Android `versionCode` `120`.
- Added public-safe Expo `extra` build metadata for environment, approved artifact label, approved app version/build, and bounded build reference.
- Added `apps/mobile/src/build-info.ts` with native `expo-application` values when available and Expo config fallback when native values are missing.
- Rendered `Build do piloto` in the authenticated mobile app with version, build, environment, API target, package id, approved artifact, and compatibility.
- Added prepare-turn build telemetry so Command Center can compare installed devices against `phase-12-staging-apk-120`.
- Extended device readiness contracts and repository/API projection with `buildCompatibility`, approved artifact label, approved app version, and approved build.
- Rendered build compatibility in Command Center and documented that current Android/provider/camera proof remains externally blocked.

## Task Commits

1. **Task 1-3: Pilot versioning, mobile build-info, and Command Center compatibility** - `11b7fba9`

## Files Created/Modified

- `apps/mobile/src/build-info.ts` - Sanitized mobile build metadata adapter and compatibility resolver input.
- `apps/mobile/src/build-info.test.ts` - Native/fallback/masking/compatibility coverage.
- `apps/mobile/app.json` - Version `0.12.0`, Android `versionCode` `120`, and public-safe metadata.
- `apps/mobile/app.config.js` - EAS env override support while preserving ignored Firebase file-variable behavior.
- `apps/mobile/src/capture/CaptureApp.tsx` - Prepare-turn payload now includes sanitized build telemetry.
- `apps/mobile/src/capture/TodayScreen.tsx` - Authenticated mobile build truth surface.
- `packages/contracts/src/command-center.ts` - Device build compatibility schema and resolver.
- `packages/database/src/capture-repository.ts` - Approved artifact comparison and build blockers.
- `apps/api/src/command-center.ts` - Capture-backed Command Center passes approved staging artifact metadata.
- `apps/web/src/command-center/CommandCenter.tsx` - Per-device build compatibility labels.
- `docs/release/android-pilot-install.md` and `docs/release/v1-readiness.md` - Public-safe release truth updates.

## Decisions Made

- `phase-12-staging-apk-120` is the public-safe compatibility anchor; it is not an install URL.
- Build compatibility is calculated against approved staging artifact metadata, not arbitrary commits on main.
- Sensitive build evidence remains outside Git: no build URL, provider ticket, Firebase file, raw device identifier, or token is committed.
- Missing native module data degrades to `nao informado` and `desconhecido` instead of crashing the app or tests.

## Deviations from Plan

- Added the shared compatibility resolver to `packages/contracts/src/command-center.ts` so mobile/backend tests use the same comparison semantics.
- Added `apps/mobile/src/build-info.test.ts` to the typed ESLint default-project allowlist because mobile test files are intentionally excluded from the build tsconfig.

## Issues Encountered

- Static imports from `expo-application` pulled React Native/Expo native internals into Vitest and failed. The adapter now loads Expo modules optionally with a localized lint exception and safe fallback.
- `format:check` initially found formatting deltas after the edits. The touched files were formatted and the gate was re-run.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn auth-flow` - 35 files, 183 tests passed.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd --filter @validade-zero/contracts test -- command-center` - 11 files, 95 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center` - 12 files, 82 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` - 9 files, 32 tests passed.
- `pnpm.cmd --filter @validade-zero/database test -- repositories` - 2 files, 43 tests passed.
- `pnpm.cmd typecheck` - passed.
- `pnpm.cmd lint` - passed.
- `pnpm.cmd format:check` - passed.
- `pnpm.cmd security:evidence` - passed.
- `cmd /c gsd-sdk.cmd query state.validate` - passed.

## User Setup Required

Approved Android hardware/emulator, installed APK, provider push, camera, and physical-device UAT proof are still external blockers. This plan made build truth visible and comparable; it did not create installed-device proof.

## Next Phase Readiness

Ready for 12-04 guided Loja 18 UAT checklist and sanitized evidence record. Command Center can now identify whether a registered pilot phone is on the approved staging build before UAT evidence is accepted.

---
*Phase: 12-pilot-operations-and-device-readiness*
*Completed: 2026-06-28*
