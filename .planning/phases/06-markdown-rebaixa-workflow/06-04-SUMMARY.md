---
phase: 06-markdown-rebaixa-workflow
plan: "04"
subsystem: mobile-hardening-docs
tags: [markdown, alerts, accessibility, smoke, docs, regression]

requires:
  - phase: 06-markdown-rebaixa-workflow
    provides: mobile markdown UI from 06-03
provides:
  - Delayed markdown row warning/critical treatment with explicit text labels
  - Alert acknowledgement regression proving workflow/task remain active
  - Accessibility/source checks for markdown controls and evidence rows
  - Phase 6 native smoke note and operations documentation
  - Full regression command evidence
affects: [mobile, alerts, accessibility, docs, maestro, eslint, formatting]

tech-stack:
  added: []
  patterns: [non-color-only-status, alert-acknowledgement-is-not-completion, honest-pilot-docs]

key-files:
  created:
    - docs/operations/markdown-workflow.md
  modified:
    - .maestro/smoke.yaml
    - apps/mobile/src/capture/TodayScreen.tsx
    - apps/mobile/src/capture/alert-state.test.ts
    - apps/mobile/src/capture/today-accessibility.test.tsx
    - eslint.config.mjs
    - apps/mobile/src/App.test.tsx
    - apps/mobile/src/capture/LotDetailScreen.tsx
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/today-copy.ts
    - apps/mobile/src/capture/today-screen.test.tsx
    - packages/contracts/src/tasks.ts
    - packages/domain/src/markdown.ts

key-decisions:
  - "Overdue markdown approval uses warning treatment; overdue application/final confirmation keep stronger high-severity row treatment."
  - "Leadership acknowledgement records alert receipt only and does not resolve markdown workflow or Today task state."
  - "Native Maestro smoke remains Hoje-first and camera/storage-free until real evidence storage lands."
  - "Operations docs explicitly scope Phase 6 to local metadata, not ERP pricing, R2 storage, RBAC, audit, or offline sync."

patterns-established:
  - "Accessibility tests assert delayed state text and source-level primitive usage instead of brittle visual snapshots."
  - "Phase 6 test files are listed in ESLint project-service allowDefaultProject so root lint remains type-aware."
  - "Final summaries record native runtime blockers separately from automated repo gates."

requirements-completed: [MRK-02, MRK-03, MRK-04]

duration: 15 min
completed: 2026-06-20
---

# Phase 06 Plan 04: Delayed Escalation, Smoke, Docs, And Regression Summary

**Phase 6 is hardened with delayed-stage accessibility, truthful pilot documentation, and full automated regression evidence.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-06-20T20:32:43-03:00
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added warning treatment for overdue approval rows while keeping application/final confirmation rows in stronger high-severity treatment.
- Added explicit accessibility coverage for delayed markdown copy, stage reasons, and markdown action/evidence control labels.
- Added a markdown-specific alert acknowledgement regression: leadership receipt leaves the approval task active and workflow in `requested`.
- Updated Maestro smoke to keep Hoje as first screen, assert recent-lots access, and document why native smoke does not require markdown/camera/storage fixtures.
- Added `docs/operations/markdown-workflow.md` with pilot behavior, early exception rules, delayed escalation behavior, metadata-only evidence scope, and explicit non-goals.
- Updated ESLint project-service allowlist for the Phase 6 markdown tests.
- Ran Prettier on Phase 6 files required by `pnpm check`.

## Task Commits

Both planned tasks landed in one implementation commit because docs, smoke, accessibility, lint config, and final formatting were verified together:

1. **Task 1: Harden delayed markdown alert visibility and accessibility** - `8c5de3b` (feat)
2. **Task 2: Update smoke, operations docs, and final regression evidence** - `8c5de3b` (feat)

**Plan metadata:** recorded with the GSD state update for this plan

## Deviations from Plan

### Native Smoke Blocker

**1. `pnpm.cmd test:e2e:mobile` did not complete**
- **Observed:** command timed out after 124004 ms with no stdout/stderr.
- **Environment check:** `maestro --version` returned `2.6.1`; `adb devices` showed `emulator-5554 device`.
- **Disposition:** documented as a native/runtime blocker. No native delivery claim made.

### Auto-fixed Issues

**2. Root lint needed Phase 6 test files in ESLint project-service allowlist**
- **Found during:** `pnpm.cmd lint`
- **Issue:** `markdown.test.ts` and `markdown-workflow.test.ts` were outside `allowDefaultProject`.
- **Fix:** Added the three Phase 6 markdown test paths and bumped the configured max file count.
- **Verification:** `pnpm.cmd lint` passed.

**3. Root check required formatting of Phase 6 files**
- **Found during:** first `pnpm.cmd check`
- **Issue:** Prettier reported 9 Phase 6 files with style differences.
- **Fix:** Ran Prettier on the reported files.
- **Verification:** second `pnpm.cmd check` passed.

---

**Total deviations:** 1 external/native blocker, 2 auto-fixed repo issues.
**Impact on plan:** Automated repo gate passed; native Maestro smoke remains unclaimed because it timed out.

## Command Results

- `pnpm.cmd --filter @validade-zero/domain test -- alerts` - passed, 9 files / 78 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- alert` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/domain test -- markdown` - passed, 9 files / 78 tests.
- `pnpm.cmd --filter @validade-zero/contracts test -- markdown` - passed, 3 files / 20 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- markdown-workflow` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- alert` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile test` - passed, 19 files / 84 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd lint` - failed first on ESLint project-service allowlist; passed after config fix.
- `pnpm.cmd test` - passed, 36 files / 195 tests.
- `pnpm.cmd test:e2e:mobile` - blocked: timed out after 124004 ms with no output; Maestro 2.6.1 and emulator `emulator-5554` were present.
- `pnpm.cmd check` - failed first on Prettier formatting; passed after formatting.

## Limitations Documented

- Phase 6 stores evidence metadata only.
- Phase 6 does not store real photos, local photo URIs, base64 image data, R2 object keys, or private evidence assets.
- Phase 6 does not change ERP/POS prices.
- Phase 6 does not integrate sales, stock, pricing, or internal supermarket APIs.
- Phase 6 does not provide formal RBAC, store-level audit trail, or offline sync.
- Push/escalation/acknowledgement never resolves a markdown stage.

## User Setup Required

- Native Maestro smoke needs a responsive local mobile runtime. The CLI and emulator were visible, but the test command timed out without output in this session.

## Next Phase Readiness

Phase 6 is ready for final phase completion bookkeeping: all planned code/docs are committed, full automated repo check passes, and the native smoke blocker is recorded honestly.

---
*Phase: 06-markdown-rebaixa-workflow*
*Completed: 2026-06-20*
