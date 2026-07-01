---
phase: 16-loja-18-validation-runbook-and-go-no-go-proof
plan: "03"
subsystem: api
tags: [command-center, validation-gates, devices, push, camera, build]
requires:
  - phase: 16-loja-18-validation-runbook-and-go-no-go-proof
    provides: 16-02 central runbook facts
provides:
  - Approved-device and second-device validation gates
  - Installed-vs-approved build blockers derived from device compatibility
  - Push and camera UAT states classified as passed, blocked, or external-blocked
affects: [phase-16, validacao, aparelhos, atualizacoes]
tech-stack:
  added: []
  patterns: [external-proof-gates, build-compatibility-blockers]
key-files:
  created:
    - .planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-03-SUMMARY.md
  modified:
    - apps/api/src/command-center.ts
    - apps/api/src/command-center.test.ts
key-decisions:
  - "Second-device proof requires two approved mobile device records with current central reads and central product/lot/resolution facts."
  - "Build/install blockers are synthesized from buildCompatibility even when device blocker rows are absent."
  - "Safe push-test proof can pass from provider_accepted/opened timeline only; local-only remains external and provider failures remain actionable."
patterns-established:
  - "approvedValidationDevicesFor filters validation devices before UAT proof can pass."
  - "deriveSafePushProof and deriveCameraProof keep provider/camera states bounded and public-safe."
requirements-completed: ["VAL-01", "VAL-02", "VAL-03"]
duration: 10min
completed: 2026-07-01
---

# Phase 16 Plan 03: External Validation Gates Summary

**Loja 18 validation now exposes APK/build, second-device, push, and camera/fallback proof as explicit API gates.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-01T12:14:00Z
- **Completed:** 2026-07-01T12:24:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Added approved validation device filtering for current mobile device records.
- Made second-device convergence pass only with two approved mobile records after central product, lot, and resolution facts exist.
- Added build blockers for `desatualizado`, `incompativel`, and `desconhecido` compatibility states.
- Classified push proof from safe push-test timeline states: accepted/opened pass, local-only external, provider/token/permission failures blocked.
- Kept camera/fallback external unless future central safe evidence/fallback metadata exists, with denied permission becoming actionable.

## Task Commits

1. **Tasks 1-3: Expose external validation gates** - `60fd7f10` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/api/src/command-center.ts` - Adds external proof derivation for approved devices, second-device convergence, build compatibility, push, and camera.
- `apps/api/src/command-center.test.ts` - Adds API tests for one/two approved devices, build blockers, safe push pass, local-only push, provider failure, and camera external proof.

## Decisions Made

- Web Command Center never counts as second-device proof; only approved mobile device snapshots do.
- Push timeline remains diagnostic and never resolves tasks or safe close.
- Camera remains external until central evidence/fallback metadata exists; permission denial is actionable but not a repository proof.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The local post-commit push hook still cannot push `main` because `origin/main` is ahead; commits remain local.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/api test` - passed, 12 files / 94 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 103 tests.
- `cmd /c pnpm.cmd security:evidence` - passed, 455 tracked text files scanned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `16-04`: the web `Validacao` route can render these API-derived proof states and owner-route actions.

---
*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Completed: 2026-07-01*
