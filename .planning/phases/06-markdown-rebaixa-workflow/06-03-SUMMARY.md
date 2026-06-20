---
phase: 06-markdown-rebaixa-workflow
plan: "03"
subsystem: mobile-ui
tags: [markdown, rebaixa, mobile, today, lot-detail, evidence]

requires:
  - phase: 06-markdown-rebaixa-workflow
    provides: local markdown workflow repositories and alertable stage tasks from 06-02
provides:
  - Stage-specific Hoje labels for markdown approval, application, and shelf confirmation
  - Task panel flows for approval, rejection, application evidence, and final shelf evidence
  - Lot-detail markdown entry with presence gate, early exception, and already-active routing
  - Component and app-level tests for markdown UI safety rules
affects: [mobile, today-tasks, task-resolution, lot-detail, app-routing]

tech-stack:
  added: []
  patterns: [repository-backed-ui-command, presence-gated-secondary-entry, metadata-only-evidence]

key-files:
  modified:
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/LotDetailScreen.tsx
    - apps/mobile/src/capture/CaptureApp.tsx
    - apps/mobile/src/capture/task-resolution.test.tsx
    - apps/mobile/src/capture/today-screen.test.tsx
    - apps/mobile/src/App.test.tsx

key-decisions:
  - "Markdown stage tasks bypass generic resolveTodayTask and call dedicated repository workflow commands."
  - "Rejection requires Motivo da reprovacao before the submit action is enabled."
  - "Application and shelf confirmation evidence remains metadata-only: photo placeholder or explicit no-photo reason."
  - "Lot detail acts as a secondary entry only after repository-provided eligibility confirms presence safety."

patterns-established:
  - "TaskResolutionPanel branches by requiredResolution for workflow-specific commands while preserving legacy task flows."
  - "CaptureApp loads markdown entry state beside lot detail and returns to Hoje after a successful request."
  - "Already-active lot-detail state opens the current markdown task instead of creating a duplicate workflow."

requirements-completed: [MRK-01, MRK-02, MRK-03]

duration: 24 min
completed: 2026-06-20
---

# Phase 06 Plan 03: Mobile Markdown Workflow UI Summary

**Hoje, task resolution, and lot detail now expose the blocked markdown lifecycle with safe evidence controls.**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-06-20T20:22:27-03:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added Phase 6 markdown copy for stage labels, delayed labels, rejection reason, early exception, and evidence prompts.
- Added markdown-specific task panel behavior for approve/reject, apply label evidence, and final shelf confirmation evidence.
- Added lot-detail markdown entry states:
  - rule-window request submits `reason: rule_window`;
  - early exception requires reason plus justification;
  - presence-required routes to the observation flow;
  - already-active opens the current markdown task.
- Wired `CaptureApp` to load entry state, refresh detail after observation, return to Hoje after request, and open active markdown tasks without duplication.
- Added tests covering stage labels, rejection gating, evidence gating, metadata-only command payloads, presence routing, early exception validation, and already-active routing.

## Task Commits

Both planned UI tasks landed in one implementation commit because the panel, detail entry, routing, and tests share the same repository contract:

1. **Task 1: Add markdown stage copy and task-panel flows** - `a3f70fc` (feat)
2. **Task 2: Add lot-detail markdown entry, early exception, and presence gate routing** - `a3f70fc` (feat)

**Plan metadata:** recorded with the GSD state update for this plan

## Files Modified

- `apps/mobile/src/capture/today-copy.ts` - Markdown stage labels, delayed labels, evidence, rejection, and early exception copy.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - Stage-specific markdown workflow command UI.
- `apps/mobile/src/capture/LotDetailScreen.tsx` - Presence gate, rule-window request, early exception, and active-workflow entry.
- `apps/mobile/src/capture/CaptureApp.tsx` - Entry-state loading, request routing, observation refresh, and active-task routing.
- `apps/mobile/src/capture/task-resolution.test.tsx` - Markdown decision/evidence command coverage.
- `apps/mobile/src/capture/today-screen.test.tsx` - Markdown stage labels and escalation row visibility.
- `apps/mobile/src/App.test.tsx` - App-level lot-detail markdown routing coverage.

## Deviations from Plan

### Clarified Implementation

**1. Today row rendering did not need structural changes**
- **Plan mention:** `TodayScreen.tsx`
- **Outcome:** Existing row anatomy already rendered stage labels through `todayActionLabel`, due labels, risk labels, and alert state.
- **Change made:** Updated copy helpers and tests instead of adding redundant Today row branching.
- **Impact:** Lower UI churn with the same user-visible behavior.

---

**Total deviations:** 1 clarified implementation.
**Impact on plan:** No acceptance reduction.

## Issues Encountered

- React test snapshots split text nodes around punctuation, so the app-level already-active assertion now checks visible text fragments instead of one joined string.

## User Setup Required

None.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` - passed
- `pnpm.cmd --filter @validade-zero/mobile test -- App` - passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed

## Next Phase Readiness

Ready for Plan 06-04: integration/E2E/docs can now verify the full markdown path across repository, UI, alerts, and project documentation.

---
*Phase: 06-markdown-rebaixa-workflow*
*Completed: 2026-06-20*
