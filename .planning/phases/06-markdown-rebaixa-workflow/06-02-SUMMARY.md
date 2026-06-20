---
phase: 06-markdown-rebaixa-workflow
plan: "02"
subsystem: mobile-persistence
tags: [markdown, sqlite, repository, today-tasks, alerts]

requires:
  - phase: 06-markdown-rebaixa-workflow
    provides: domain markdown policy and runtime contracts from 06-01
provides:
  - CaptureRepository markdown lifecycle operations
  - Memory and SQLite markdown workflow state transitions
  - Local markdown workflow table, indexes, and stage history persistence
  - Alertable active Today tasks for delayed markdown stages
affects: [mobile, sqlite, today-tasks, alerts, phase-06-ui]

tech-stack:
  added: []
  patterns: [local-first-workflow-coordinator, transactional-stage-transition, strict-json-history]

key-files:
  created:
    - apps/mobile/src/capture/markdown-workflow.test.ts
  modified:
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/today-copy.ts
    - packages/domain/src/markdown.ts

key-decisions:
  - "Repository commands are the local coordinator for markdown lifecycle transitions."
  - "One active Today task exists per active markdown stage."
  - "SQLite stores strict JSON stage history and metadata-only evidence, not binary or remote photo references."

patterns-established:
  - "Workflow transition writes resolve the current task and create the next stage task together."
  - "Active markdown workflows suppress recreation of the generic request_markdown task during Today refresh."
  - "Alert acknowledgement mutates only alert state; workflow and Today task remain active."

requirements-completed: [MRK-01, MRK-02, MRK-03, MRK-04]

duration: 11 min
completed: 2026-06-20
---

# Phase 06 Plan 02: Local Markdown Workflow Repository And Alertable Stage Tasks Summary

**Local-first markdown coordinator with memory and SQLite stage transitions, active Today tasks, and alertable delayed work**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-20T22:54:00Z
- **Completed:** 2026-06-20T23:05:16Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added markdown operations to `CaptureRepository`: request, decide, apply, shelf-confirm, workflow lookup, active list, and lot-detail entry state.
- Implemented memory lifecycle behavior for request, approval, rejection, application evidence, and final shelf confirmation.
- Added SQLite markdown persistence with `markdown_workflows`, required indexes, strict row mapping, and transactional stage transitions.
- Prevented Today refresh from recreating a generic `request_markdown` task while a markdown workflow is active.
- Proved delayed markdown application remains alertable and leadership acknowledgement does not resolve the task or workflow.

## Task Commits

Both planned tasks landed in one cohesive implementation commit because the shared repository interface, memory adapter, SQLite adapter, and tests had to move together for type safety:

1. **Task 1: Add repository port and memory lifecycle transitions** - `10c8fc7` (feat)
2. **Task 2: Persist markdown workflows in SQLite and keep delayed stages alertable** - `10c8fc7` (feat)

**Plan metadata:** recorded with the GSD state update for this plan

## Files Created/Modified

- `apps/mobile/src/capture/repository.ts` - Markdown command parsers, repository methods, entry-state type, risk helpers, and stage task factory.
- `apps/mobile/src/capture/memory-repository.ts` - In-memory workflow map and lifecycle transitions.
- `apps/mobile/src/capture/sqlite-repository.ts` - SQLite workflow table, indexes, row mapping, and transactional transitions.
- `apps/mobile/src/capture/markdown-workflow.test.ts` - Lifecycle, entry-state, alertability, and SQLite source-safety coverage.
- `apps/mobile/src/capture/today-copy.ts` - Minimal markdown action labels needed after enum expansion.
- `packages/domain/src/markdown.ts` - Broadened stage-task source-risk typing for real repository assessment reasons.

## Decisions Made

- Kept markdown state local-first and adapter-owned; UI will call repository commands instead of mutating tasks directly.
- Used one active workflow per lot until terminal `rejected` or `shelf_confirmed`.
- Stored application/final evidence as strict metadata JSON only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] UI copy maps did not cover new task actions**
- **Found during:** Task 1/2 mobile typecheck
- **Issue:** Extending the domain action enum made `TaskResolutionPanel` indexes unsafe until copy labels existed for new markdown actions.
- **Fix:** Added minimal Phase 6 labels to `today-copy.ts`; full stage-specific UI still remains in Plan 06-03.
- **Files modified:** `apps/mobile/src/capture/today-copy.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/mobile typecheck`
- **Committed in:** `10c8fc7`

---

**Total deviations:** 1 auto-fixed (blocking type coverage).
**Impact on plan:** No product scope expansion; this unblocked typed repository work and will be refined by the planned UI task.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- markdown-workflow` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- alert` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed

## Next Phase Readiness

Ready for Plan 06-03: mobile screens can now submit markdown workflow commands against a typed local repository and receive active stage tasks in Hoje.

---
*Phase: 06-markdown-rebaixa-workflow*
*Completed: 2026-06-20*
