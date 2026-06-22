---
phase: 07-offline-sync
plan: "04"
subsystem: mobile-offline-ui
tags: [offline-sync, hoje, conflict-review, maestro, mobile-ui]
requires:
  - phase: 07-offline-sync
    provides: sync contracts, repository outbox/cache/conflict ports, sync engine, and API seam
provides:
  - Hoje offline/sync status band directly below the sales-area safety verdict.
  - Compact sync queue summary with conflicts before pending commands and manual retry controls.
  - Task row sync markers for pending, failed, syncing, synced, and conflict states.
  - Task panel local-save behavior for task and markdown actions when offline/degraded.
  - Conflict review panel with local action, product, lote, local, local time, remote change, and reason-gated discard.
affects: [mobile-ui, offline-sync, operations-docs, v1-readiness]
tech-stack:
  patterns:
    - Local save feedback never claims central confirmation before a strict transport ack.
    - Hoje remains the operational source of truth; sync support stays inside Hoje instead of becoming a dashboard.
key-files:
  created:
    - apps/mobile/src/capture/offline-sync-ui.tsx
  modified:
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/App.test.tsx
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/capture/today-accessibility.test.tsx
    - apps/mobile/src/capture/task-resolution.test.tsx
    - .maestro/smoke.yaml
    - docs/operations/offline-sync.md
    - eslint.config.mjs
key-decisions:
  - "Keep `Registrar lote` and `Conferir lotes recentes` in the top Hoje safety section so offline/sync status does not push essential paths out of the native smoke viewport."
  - "CaptureApp returns to Hoje after local save with local-save feedback and highlighted task context, letting Hoje refresh queue state from repository ports."
patterns-established:
  - "Offline UI primitives live in `offline-sync-ui.tsx` and use existing RN primitives/actions only."
  - "Task panel checks offline cache status at submit time; existing evidence/confirmation gates run before `saveOfflineAction`."
requirements-completed: [SYN-01, SYN-02, SYN-03]
duration: 24 min
completed: 2026-06-21
---

# Phase 07 Plan 04: Hoje Offline Sync UI Summary

**Hoje now shows offline readiness, local pending work, sync failures, and explicit conflicts inside the operational task flow.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-21T23:18:00-03:00
- **Completed:** 2026-06-21T23:42:00-03:00
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments

- Added Phase 7 sync copy and `offline-sync-ui.tsx` primitives for offline status, queue summary, command rows, retry notice, cache notice, and conflict review.
- Integrated Hoje with offline cache status, sync queue summary, task row sync labels, manual `Sincronizar pendencias`, and conflict review/resolve repository calls.
- Kept the sales-area verdict first and moved `Registrar lote` plus `Conferir lotes recentes` into the top safety section so core paths remain visible after the offline/sync band.
- Updated `TaskResolutionPanel` so task resolution, markdown requests, markdown decisions, markdown application, and shelf confirmation save through `saveOfflineAction` when offline/degraded after the same gates as online actions.
- Wired `CaptureApp` to pass an optional sync engine into Hoje and return to Hoje after local save with local-save feedback and highlighted task context.
- Expanded tests for offline ready/mode/unavailable/stale states, pending task markers, conflict-before-pending ordering, manual sync, reason-gated discard, offline save gates, App smoke, accessibility order, and native smoke copy.
- Updated operations docs and ESLint typed-test allowlist for Phase 7 sync tests.

## Task Commits

Implementation was committed atomically:

1. **Task 1/2: Hoje offline sync UI, task-panel local save, smoke, docs, and regression** - `f4ff8f4` (feat)

**Plan metadata:** this docs commit

## Files Created/Modified

- `apps/mobile/src/capture/offline-sync-ui.tsx` - New RN sync UI primitives and conflict review panel.
- `apps/mobile/src/capture/today-copy.ts` - Adds exact Phase 7 user-facing sync copy.
- `apps/mobile/src/capture/TodayScreen.tsx` - Loads cache/queue state, renders sync status directly under safety verdict, adds queue/conflict review, task sync markers, manual retry, and top task paths.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - Saves offline/degraded commands locally after existing evidence/confirmation gates and shows local-save plus pending-sync feedback.
- `apps/mobile/src/capture/CaptureApp.tsx` - Passes sync engine into Hoje and refreshes back to Hoje after local save.
- `apps/mobile/src/App.test.tsx`, `today-screen.test.tsx`, `today-accessibility.test.tsx`, `task-resolution.test.tsx` - Adds deterministic offline/sync UI and local-save coverage.
- `.maestro/smoke.yaml` - Adds native assertions for offline-ready/sync status and keeps Hoje navigation smoke visible.
- `docs/operations/offline-sync.md` - Adds final operator flow, conflict discard, and developer verification guidance.
- `eslint.config.mjs` - Adds Phase 7 sync tests to typed lint allowlist.
- `apps/api/src/sync.test.ts`, `apps/mobile/src/capture/memory-repository.ts`, `repository.ts`, `sqlite-repository.ts`, `sync-engine.test.ts`, `sync-engine.ts`, `packages/contracts/src/sync.ts`, `tasks.ts`, `packages/domain/src/sync.ts` - Prettier/lint cleanup for Phase 7 sync files; `sync.ts` also removes an unused import.

## Decisions Made

- Kept sync UI in Hoje instead of adding a separate dashboard, preserving the operational first screen.
- Treated `offline_ready` as online-submit state and all other cache states as local-save state for the task panel.
- Required a non-empty discard reason before `discard_offline_action`; critical conflict details stay visible until explicit resolution.
- Used component smoke for pending-sync fixture coverage because the native app has no deterministic fixture mode yet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept Hoje navigation visible after adding offline/sync status**
- **Found during:** Native Maestro verification
- **Issue:** The new offline/sync band pushed `Registrar lote` and then `Conferir lotes recentes` below the first native smoke viewport.
- **Fix:** Added both actions to the top Hoje safety section while preserving the empty-state paths.
- **Files modified:** `apps/mobile/src/capture/TodayScreen.tsx`, `.maestro/smoke.yaml`
- **Verification:** `pnpm.cmd test:e2e:mobile` passed on `ValidadeZeroApi36`.

**2. [Rule 3 - Blocking] Updated typed lint allowlist for Phase 7 sync tests**
- **Found during:** `pnpm.cmd lint`
- **Issue:** New sync test files were not included in ESLint's typed project-service allowlist.
- **Fix:** Added the Phase 7 sync tests and raised the file-match cap from 40 to 45; removed an unused contract import.
- **Files modified:** `eslint.config.mjs`, `packages/contracts/src/sync.ts`
- **Verification:** `pnpm.cmd lint` and `pnpm.cmd check` passed.

---

**Total deviations:** 2 auto-fixed (native smoke visibility, lint housekeeping)
**Impact on plan:** Plan behavior is complete; the UI change improves first-viewport operational access.

## Issues Encountered

- Existing test repository doubles did not include the new offline sync repository methods; updated them to default to synced/online behavior unless a test explicitly opts into offline.
- React test renderer serializes split text nodes, so queue count assertions now read flattened rendered text where needed.

## User Setup Required

None. Native smoke ran successfully against the available `ValidadeZeroApi36` device/runtime.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- sync` - passed (10 files, 87 tests)
- `pnpm.cmd --filter @validade-zero/contracts test -- sync` - passed (4 files, 30 tests)
- `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` - passed (21 files, 116 tests)
- `pnpm.cmd --filter @validade-zero/mobile test -- sync-engine` - passed (21 files, 116 tests)
- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed (21 files, 116 tests)
- `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` - passed (21 files, 115 tests before App smoke addition; rerun covered in mobile/full gates)
- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed (21 files, 116 tests)
- `pnpm.cmd --filter @validade-zero/api test -- sync` - passed (3 files, 15 tests)
- `pnpm.cmd --filter @validade-zero/mobile test` - passed (21 files, 116 tests)
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed
- `pnpm.cmd lint` - passed
- `pnpm.cmd test` - passed (41 files, 253 tests)
- `pnpm.cmd test:e2e:mobile` - passed on `ValidadeZeroApi36`
- `pnpm.cmd check` - passed

## Self-Check: PASSED

- Safety verdict renders before offline/sync content.
- Offline-ready, offline-mode, unavailable, and stale cache states have text labels.
- Pending, retry-error, syncing, synced, and conflict task states are textual, not color-only.
- Critical conflicts sort before ordinary pending commands.
- Local save feedback says the action is saved on the device and remains pending until sync.
- Destructive conflict discard requires an explicit reason.
- Native smoke and root check are green.

## Next Phase Readiness

Ready for Phase 8: audit, roles, evidence controls, and shift-close assurance can build on durable local command history, explicit conflict handling, and visible pending sync state.

---
*Phase: 07-offline-sync*
*Completed: 2026-06-21*
