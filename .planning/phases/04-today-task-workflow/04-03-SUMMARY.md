---
phase: 04-today-task-workflow
plan: "03"
subsystem: mobile-task-resolution
tags: [today-tasks, resolution, recheck, evidence-metadata, react-native, sqlite]
requires:
  - phase: 04-today-task-workflow
    provides: 04-02 Hoje-first mobile task surface.
provides:
  - Compatible-action task resolution panel.
  - Reinforced confirmation for destructive and conditional task outcomes.
  - Sales-area withdrawal/loss recheck creation and evidence/no-photo metadata contract.
  - Repository safeguards for recheck evidence.
affects: [phase-04-a11y-smoke-hardening, phase-08-audit-evidence]
tech-stack:
  added: []
  patterns: [compatible-resolution-matrix, sales-area-recheck, metadata-only-evidence]
key-files:
  created:
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/task-resolution.test.tsx
  modified:
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/ConfirmationSheet.tsx
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/capture/today-task-repository.test.ts
    - eslint.config.mjs
key-decisions:
  - "Task rows now open a dedicated resolution panel instead of lot detail."
  - "Incompatible actions remain visible when useful for training but cannot mutate state."
  - "Expired or critical sales-area withdrawal/loss creates a separate active recheck task."
  - "Recheck completion requires metadata-only evidence: photo placeholder or explicit no-photo reason."
patterns-established:
  - "Resolution compatibility is checked in UI and backed by repository validation for evidence-critical rechecks."
  - "Evidence in Phase 4 remains local metadata only, with no binary, R2, sync, audit, or access-control scope."
requirements-completed: [RSK-04, UI-02, UI-03]
duration: 13 min
completed: 2026-06-19
---

# Phase 04 Plan 03: Task Resolution Summary

**Compatible task resolution with reinforced confirmation, sales-area recheck, and evidence metadata only**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-19T23:34:00-03:00
- **Completed:** 2026-06-19T23:46:45-03:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `TaskResolutionPanel` and routed active Hoje task rows into it.
- Blocked incompatible task actions inline without mutating repository state.
- Added outcome-named reinforced confirmation labels such as `Confirmar retirada`, `Confirmar perda`, and `Confirmar reconferencia`.
- Required withdrawal/loss destination `retirada_perda` for expired sales-area task resolution commands.
- Created active `sales_area_recheck` tasks after expired/critical sales-area withdrawal or loss.
- Kept the Hoje safety header unsafe while a recheck task remains open.
- Required recheck evidence as either `photo_recorded_placeholder` or an explicit no-photo reason.
- Kept evidence metadata free of binary fields, R2 object keys, sync, audit storage, and access-control scope.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add compatible resolution options and inline incompatible-action blocking** - `4dc9c67` (feat)
2. **Task 2: Add reinforced confirmation, recheck creation, and evidence/no-photo contract** - `9d7edf9` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - Compatible action selection, blocking notices, evidence prompt, confirmation, and resolution command dispatch.
- `apps/mobile/src/capture/CaptureApp.tsx` - Routes Hoje tasks to the resolution panel.
- `apps/mobile/src/capture/ConfirmationSheet.tsx` - Supports configurable confirmation title and outcome labels.
- `apps/mobile/src/capture/repository.ts` - Shared helpers for recheck creation, recheck evidence validation, and sales-area recheck predicates.
- `apps/mobile/src/capture/memory-repository.ts` - Creates local recheck tasks and rejects recheck completion without evidence metadata.
- `apps/mobile/src/capture/sqlite-repository.ts` - Persists resolution and recheck task creation atomically.
- `apps/mobile/src/capture/today-copy.ts` - Resolution, confirmation, evidence, and recheck copy.
- `apps/mobile/src/capture/task-resolution.test.tsx` - Component coverage for incompatible actions, confirmations, recheck evidence, and metadata-only evidence.
- `apps/mobile/src/capture/today-screen.test.tsx` - Safety header remains unsafe while recheck is open.
- `apps/mobile/src/capture/today-task-repository.test.ts` - Repository recheck creation and evidence validation.

## Decisions Made

- The panel keeps incompatible actions visible with explanatory copy when that helps the collaborator learn the correct path, but only compatible actions can submit.
- Recheck is represented as a first-class Today task instead of a hidden flag on the resolved task, so the safety header can stay honest.
- Recheck evidence records only a placeholder or reason now; real photo capture, storage, sync, and audit remain future phase scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Confirmation changed the existing resolution test flow**
- **Found during:** Task 2
- **Issue:** The first resolution test expected the repository command after one tap, but reinforced confirmation now requires a second explicit confirm.
- **Fix:** Updated the test to assert the confirmation content, consequence copy, then confirm the command.
- **Files modified:** `apps/mobile/src/capture/task-resolution.test.tsx`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution`
- **Committed in:** `9d7edf9`

**2. [Rule 3 - Blocking] No-photo reason labels initially drifted from plan copy**
- **Found during:** Task 2 summary review
- **Issue:** The first implementation used operationally reasonable no-photo labels, but the plan specified `Camera indisponivel`, `Sem autorizacao de foto`, and `Ambiente sem permissao`.
- **Fix:** Aligned `todayCopy.noPhotoReasons` and tests to the specified labels while preserving custom reason support.
- **Files modified:** `apps/mobile/src/capture/today-copy.ts`, `apps/mobile/src/capture/task-resolution.test.tsx`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution`, mobile typecheck, `pnpm.cmd lint`
- **Committed in:** `9d7edf9`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes tightened conformance with the intended safety contract.

## Issues Encountered

- The local automatic push hook rejected the amended `9d7edf9` commit because the remote branch already had the pre-amend commit. Code and local history are valid; remote reconciliation remains pending and was not force-pushed.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed, 14 files / 32 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` - passed, 14 files / 32 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed, 14 files / 32 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - passed, including dependency boundary check for 64 source files.

## User Setup Required

None - no external service, image picker, storage, sync, or audit configuration was added.

## Next Phase Readiness

Ready for Plan 04-04. The remaining work is overdue labeling, accessibility hardening, Maestro/App smoke updates, and full regression evidence.

---
*Phase: 04-today-task-workflow*
*Completed: 2026-06-19*
