---
phase: 05-push-and-escalation
plan: "02"
subsystem: mobile-alert-state
tags: [expo-notifications, expo-constants, sqlite, alerts, push]
requires:
  - phase: 05-push-and-escalation
    provides: Plan 05-01 alert cadence policy and runtime contracts.
provides:
  - Expo notification dependency/config seam for the mobile app.
  - Mockable push alert channel with fake test adapter.
  - Local memory and SQLite alert state, attempt, escalation, and push-open persistence.
affects: [hoje-push-ui, api-alert-provider, offline-sync]
tech-stack:
  added:
    - expo-notifications
    - expo-constants
  patterns:
    - Native notification calls sit behind a mockable port.
    - Alert state is additive to persistent Hoje tasks and never resolves them.
key-files:
  created:
    - apps/mobile/src/capture/alert-channel.ts
    - apps/mobile/src/capture/push-channel.test.ts
    - apps/mobile/src/capture/alert-state.test.ts
    - .planning/phases/05-push-and-escalation/05-USER-SETUP.md
  modified:
    - apps/mobile/package.json
    - apps/mobile/app.json
    - pnpm-lock.yaml
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/today-task-repository.test.ts
key-decisions:
  - "Notification permissions are requested only by an explicit channel method, so UI controls when the system prompt appears."
  - "SQLite stores alert state, attempts, and escalation receipts separately from today_tasks status."
  - "Push-open routing checks taskId plus activeKey and falls back for updated, resolved, or missing tasks."
patterns-established:
  - "Use local interfaces around Expo modules to keep typecheck independent from native/transitive Expo config plugin types."
  - "Use shared repository helpers to derive alert state for memory and SQLite adapters."
requirements-completed: [RSK-05, PSH-01, PSH-02, PSH-05]
duration: 12 min
completed: 2026-06-20
---

# Phase 05 Plan 02: Mobile Alert State Summary

**Expo push channel seam and durable local alert/escalation state layered over Hoje tasks**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-20T13:04:00-03:00
- **Completed:** 2026-06-20T13:15:40-03:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added `expo-notifications` and `expo-constants`, plus the `expo-notifications` app plugin while preserving existing native plugins.
- Added a `PushAlertChannel` port, production Expo adapter, fake adapter, and tests for permission, token, scheduling, retry, and payload behavior.
- Extended the capture repository with alert device registration, alert-state refresh, attempt recording, escalation acknowledgement, and push-open intent resolution.
- Added memory and SQLite persistence for device channels, task alert states, alert attempts, and escalation receipts with due-alert indexes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Expo notification adapter behind a mockable channel port** - `20b49ab` (feat)
2. **Task 2: Persist alert state, attempts, escalation, and open intents in repository adapters** - `7101f3a` (feat)

**Plan metadata:** pending in this commit.

## Files Created/Modified

- `apps/mobile/src/capture/alert-channel.ts` - Push notification port, Expo adapter, fake adapter, and strict response payload parsing.
- `apps/mobile/src/capture/push-channel.test.ts` - Tests for permission, fake token, scheduling, failure, and payload behavior without native runtime.
- `apps/mobile/src/capture/repository.ts` - Shared alert operation types, parsing helpers, alert-state derivation, and delivery-result mapping.
- `apps/mobile/src/capture/memory-repository.ts` - In-memory alert device, state, attempt, acknowledgement, and push-open routing support.
- `apps/mobile/src/capture/sqlite-repository.ts` - Idempotent alert tables, indexes, mappers, and repository operations.
- `apps/mobile/src/capture/alert-state.test.ts` - Tests for cadence creation, idempotence, off-shift suppression, retries, acknowledgement, recheck cadence, and push-open fallback.
- `apps/mobile/src/capture/today-task-repository.test.ts` - Updated source assertion now that push code is valid Phase 5 scope.
- `apps/mobile/package.json`, `apps/mobile/app.json`, `pnpm-lock.yaml` - Expo notification dependencies and config plugin.
- `.planning/phases/05-push-and-escalation/05-USER-SETUP.md` - Native push setup limitation and verification note.

## Decisions Made

- Production adapter uses local minimal interfaces plus runtime imports so TypeScript does not depend on native Expo config-plugin transitive types.
- Alert attempt and escalation state lives beside tasks, not inside task resolution history.
- A recheck replacement takes precedence over a stale resolved push payload, so the user lands on the current physical task path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided Expo transitive native type failures**
- **Found during:** Task 1 (mobile typecheck)
- **Issue:** Importing Expo module types pulled transitive `xcode`, `node:fs`, and `expo-manifests` declarations into the mobile TypeScript build.
- **Fix:** Replaced direct Expo type imports with local minimal interfaces and runtime dynamic imports.
- **Files modified:** `apps/mobile/src/capture/alert-channel.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck` passed.
- **Committed in:** `20b49ab`

**2. [Rule 3 - Blocking] Updated obsolete no-push SQLite source assertion**
- **Found during:** Task 2 (existing repository regression)
- **Issue:** The prior source assertion rejected any `push` string in `sqlite-repository.ts`, but Phase 5 intentionally adds push-open routing there.
- **Fix:** Replaced the assertion with a real-token guard while preserving R2/object-key exclusions.
- **Files modified:** `apps/mobile/src/capture/today-task-repository.test.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` passed.
- **Committed in:** `7101f3a`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes kept the plan within scope and made the intended Phase 5 behavior verifiable.

## Issues Encountered

- Native remote push delivery could not be claimed from local tests alone. This is documented in `05-USER-SETUP.md`; local tests use fake tokens and adapter seams only.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- push-channel` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test -- alert-state` - passed.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` - passed.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.

## User Setup Required

External native push verification requires manual setup. See `05-USER-SETUP.md`.

## Next Phase Readiness

The Hoje UI can now read alert channel state, per-task alert state, escalation acknowledgement, and push-open fallback results from a repository port without owning scheduling or provider details.

---
*Phase: 05-push-and-escalation*
*Completed: 2026-06-20*
