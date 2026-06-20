---
phase: 04-today-task-workflow
plan: "04"
subsystem: mobile-hardening
tags: [overdue, accessibility, smoke, regression, maestro, prettier]
requires:
  - phase: 04-today-task-workflow
    provides: 04-03 task resolution, recheck, and evidence metadata.
provides:
  - Overdue task pinning and explicit `Atrasada` copy.
  - Accessibility/copy regression tests for Hoje.
  - Hoje-first native smoke YAML.
  - Full Phase 4 regression evidence and native E2E blocker.
affects: [phase-04-verification, phase-05-push-escalation]
tech-stack:
  added: []
  patterns: [overdue-top-section, source-backed-a11y-tests, native-smoke-handoff]
key-files:
  created:
    - apps/mobile/src/capture/today-accessibility.test.tsx
  modified:
    - .maestro/smoke.yaml
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/today-screen.test.tsx
    - eslint.config.mjs
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/task-resolution.test.tsx
    - apps/mobile/src/capture/today-task-repository.test.ts
    - packages/contracts/src/tasks.test.ts
    - packages/domain/src/tasks.test.ts
key-decisions:
  - "Phase 4 treats a task as overdue when it was created before the current local day."
  - "Overdue tasks render in a fixed top section instead of changing Phase 5 reminder/escalation behavior."
  - "Native smoke protects Hoje first, then verifies the registration path remains reachable."
patterns-established:
  - "Accessibility tests combine render assertions with source checks for 48dp targets, accessible labels, no generic primary labels, and no truncation props."
  - "Final gate fixes can include mechanical Prettier normalization when `pnpm check` exposes drift."
requirements-completed: [RSK-03, RSK-04, PSH-03, UI-01, UI-02, UI-03]
duration: 9 min
completed: 2026-06-19
---

# Phase 04 Plan 04: Hardening and Regression Summary

**Overdue pinning, accessibility/copy protection, Hoje-first smoke, and full regression evidence**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-19T23:47:35-03:00
- **Completed:** 2026-06-19T23:54:48-03:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added an `Atrasadas` section that pins active tasks created before the current local day above non-overdue work.
- Added `Atrasada` due copy while preserving `Agora`, `Ainda no turno`, `Hoje`, and `Reconferir area de venda` copy.
- Added `today-accessibility.test.tsx` to protect visible labels, accessible names, 48dp touch targets, text-based risk meaning, wrapping-friendly source, stable refresh state, and no generic primary labels.
- Updated `.maestro/smoke.yaml` to assert `Hoje`, sales-area safety, `Atualizar tarefas`, `Registrar lote`, and registration reachability.
- Ran and recorded the final Phase 4 command ladder.
- Fixed Prettier drift exposed by the first `pnpm.cmd check` run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden overdue, refresh, accessibility, wrapping, and copy states** - `1daa669` (feat)
2. **Task 2: Update smoke coverage and run final Phase 4 regression gates** - `a4460b6` (test)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/mobile/src/capture/today-accessibility.test.tsx` - A11y/copy/source guardrails for Hoje.
- `apps/mobile/src/capture/TodayScreen.tsx` - Overdue top section and deterministic due labels.
- `apps/mobile/src/capture/today-copy.ts` - `Atrasadas` and overdue helper logic.
- `apps/mobile/src/capture/today-screen.test.tsx` - Overdue ordering coverage.
- `.maestro/smoke.yaml` - Hoje-first native smoke assertions.
- `eslint.config.mjs` - Type-aware test allowlist update.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx`, `apps/mobile/src/capture/sqlite-repository.ts`, `apps/mobile/src/capture/task-resolution.test.tsx`, `apps/mobile/src/capture/today-task-repository.test.ts`, `packages/contracts/src/tasks.test.ts`, `packages/domain/src/tasks.test.ts` - Prettier-only normalization required by the final root check.

## Decisions Made

- Overdue is intentionally conservative in Phase 4: tasks created on a prior local day are pinned with `Atrasada`; repeat reminders, escalation, and push remain Phase 5.
- The native smoke stays narrow and stable: it checks the Hoje entry and the route into product discovery instead of trying to build task fixtures on device.
- The accessibility suite inspects source for truncation props and 48dp targets because React Test Renderer cannot prove physical device layout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root check failed at format gate**
- **Found during:** Task 2 final ladder
- **Issue:** First `pnpm.cmd check` failed at `pnpm format:check`; Prettier reported eight files.
- **Fix:** Ran `pnpm.cmd exec prettier --write` on the reported files only.
- **Files modified:** `apps/mobile/src/capture/sqlite-repository.ts`, `apps/mobile/src/capture/task-resolution.test.tsx`, `apps/mobile/src/capture/TaskResolutionPanel.tsx`, `apps/mobile/src/capture/today-copy.ts`, `apps/mobile/src/capture/today-task-repository.test.ts`, `apps/mobile/src/capture/TodayScreen.tsx`, `packages/contracts/src/tasks.test.ts`, `packages/domain/src/tasks.test.ts`
- **Verification:** `pnpm.cmd check`
- **Committed in:** `a4460b6`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Formatting drift was corrected without behavior changes.

## Issues Encountered

- `pnpm.cmd test:e2e:mobile` was blocked because `maestro` is not installed or not on PATH in this shell. Exact output: `'maestro' não é reconhecido como um comando interno ou externo, um programa operável ou um arquivo em lotes.`
- The automatic git push hook continued to reject local commits with non-fast-forward because an earlier amended commit diverged from the remote. No force push was attempted.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- tasks` - passed, 7 files / 58 tests.
- `pnpm.cmd --filter @validade-zero/contracts test -- tasks` - passed, 1 file / 4 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` - passed, 15 files / 37 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed, 15 files / 37 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed, 15 files / 37 tests.
- `pnpm.cmd --filter @validade-zero/mobile test` - passed, 15 files / 37 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - passed, including dependency boundary check for 65 source files.
- `pnpm.cmd test` - passed, 27 files / 107 tests.
- `pnpm.cmd test:e2e:mobile` - blocked; Maestro command unavailable in shell.
- First `pnpm.cmd check` - failed at `format:check` only; fixed with Prettier.
- Final `pnpm.cmd check` - passed: typecheck, lint, format, root tests, smoke Vitest, build, and security all completed.

## User Setup Required

- Install or expose Maestro on PATH, then run `pnpm.cmd test:e2e:mobile` with an Android emulator/device configured to execute the native smoke.
- Remote branch reconciliation is needed before automatic push can succeed, because the local branch now diverges from the already-pushed pre-amend commit.

## Next Phase Readiness

Phase 4 implementation is ready for GSD phase verification/UAT. Phase 5 can build push, reminders, and escalation on top of the now-persistent Today task workflow.

---
*Phase: 04-today-task-workflow*
*Completed: 2026-06-19*
