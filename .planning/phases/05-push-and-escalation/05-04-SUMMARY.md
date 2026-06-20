---
phase: 05-push-and-escalation
plan: "04"
subsystem: api-provider-cron-smoke-docs
tags: [push, escalation, api, cron, expo, maestro, docs]
requires:
  - phase: 05-push-and-escalation
    provides: Plan 05-03 Hoje push alert UX and push-open routing.
provides:
  - Fakeable Expo alert delivery provider seam.
  - Cloudflare scheduled dispatch handler and 15-minute UTC cron config.
  - Native smoke coverage for Hoje-first alert affordance.
  - Push alert operations documentation and full Phase 5 verification evidence.
affects: [api, adapters, mobile-smoke, docs, phase-05-verification]
key-files:
  created:
    - docs/operations/push-alerts.md
  modified:
    - packages/adapters/src/alerts.ts
    - packages/adapters/src/index.ts
    - apps/api/src/index.ts
    - apps/api/src/alerts.test.ts
    - apps/api/wrangler.toml
    - apps/mobile/src/capture/alert-channel.ts
    - apps/mobile/App.tsx
    - apps/mobile/src/App.test.tsx
    - .maestro/smoke.yaml
    - eslint.config.mjs
key-decisions:
  - "Remote provider dispatch remains behind fakeable ports until durable task/device storage exists."
  - "Missing native expo-notifications support degrades to unavailable state instead of crashing Hoje."
  - "Native smoke asserts the alert affordance but does not claim real remote push delivery."
patterns-established:
  - "Provider responses map into contract-validated delivery results before API/mobile state consumes them."
  - "App smoke tests inject a fake PushAlertChannel instead of loading native modules."
requirements-completed: [RSK-05, PSH-01, PSH-02, PSH-05]
duration: 40 min
completed: 2026-06-20
---

# Phase 05 Plan 04: API/Provider Cron Seam, Smoke, Docs, and Regression Evidence Summary

**Phase 5 now has a tested provider/cron seam, deterministic native smoke, and honest operations docs for push limitations.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-06-20T13:30:00-03:00
- **Completed:** 2026-06-20T13:49:00-03:00
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments

- Added a fakeable Expo alert delivery provider in `packages/adapters/src/alerts.ts`.
- Added API scheduled alert dispatch ports, in-memory test repository, default no-op service, and Worker scheduled export.
- Added `[triggers] crons = ["*/15 * * * *"]` for the Cloudflare scheduled seam.
- Added API tests for scheduled dispatch, privacy-safe payloads, retryable provider failure, `DeviceNotRegistered`, permanent invalid payload handling, no raw token echoing, and no remote task-resolution field.
- Updated native smoke to wait through cold Metro startup and assert Hoje-first alert affordance.
- Added `docs/operations/push-alerts.md` documenting push limitations, fake-token policy, UTC cron, delivery limits, and the rule that push never resolves tasks.
- Hardened the mobile alert channel so missing native `expo-notifications` support degrades instead of crashing the Hoje screen.
- Registered new Phase 5 test files with typed ESLint project-service config and formatted Phase 5 files.

## Task Commits

1. **Task 1: API/provider cron seam** - `ce7cf74` (feat)
2. **Task 2: Smoke/docs/regression and native hardening** - pending in this commit

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- alerts` - passed, 8 files / 66 tests.
- `pnpm.cmd --filter @validade-zero/contracts test -- alerts` - passed, 2 files / 10 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- alert` - passed, 18 files / 65 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- push` - passed, 18 files / 65 tests.
- `pnpm.cmd --filter @validade-zero/api test -- alerts` - passed, 2 files / 8 tests.
- `pnpm.cmd --filter @validade-zero/mobile test` - passed, 18 files / 65 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - passed, dependency boundary check covered 76 source files.
- `pnpm.cmd test` - passed, 33 files / 154 tests.
- `pnpm.cmd test:e2e:mobile` - passed on `ValidadeZeroApi36`.
- `pnpm.cmd check` - passed: typecheck, lint, format, tests, smoke, build, and security.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Native smoke exposed a Metro variable-import issue**
- **Found during:** `pnpm.cmd test:e2e:mobile`
- **Issue:** Expo Metro rejected `import(moduleName)` in `alert-channel.ts`.
- **Fix:** Replaced the variable dynamic import with a Metro-compatible runtime loader.
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck` and native Maestro passed.

**2. [Rule 3 - Blocking] Installed native runtime lacked `ExpoPushTokenManager`**
- **Found during:** `pnpm.cmd test:e2e:mobile`
- **Issue:** The current dev app/runtime did not include the native `expo-notifications` module and crashed on mount-time subscription.
- **Fix:** Made native response subscription lazy after successful module load and mapped missing native support to degraded channel state.
- **Verification:** Added `push-channel` coverage for missing native module degradation; native Maestro passed.

**3. [Rule 2 - Local quality gate] New Phase 5 test files were not in typed ESLint project-service allow list**
- **Found during:** `pnpm.cmd lint`
- **Issue:** ESLint rejected the new Phase 5 tests before type-aware linting.
- **Fix:** Added the Phase 5 test files to `eslint.config.mjs` and formatted the Phase 5 files.
- **Verification:** `pnpm.cmd lint` and `pnpm.cmd check` passed.

---

**Total deviations:** 3 auto-fixed.
**Impact on plan:** The delivered behavior is stronger than planned because native smoke now verifies graceful degradation when remote push support is not present.

## Limitations

- Real remote multi-device fan-out remains blocked on future durable auth, task sync, role/device registry, and server-side task storage.
- Expo tickets/receipts still are not proof of task execution or physical shelf resolution.
- The API default scheduled handler is intentionally no-op until a real due-alert repository exists.

## Phase Readiness

Phase 5 is ready for closeout. The alert cadence, contracts, mobile state, Hoje UX, provider seam, cron config, smoke, docs, and regression gates are all complete.

---
*Phase: 05-push-and-escalation*
*Completed: 2026-06-20*
