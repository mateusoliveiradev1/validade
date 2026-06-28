---
phase: 12-pilot-operations-and-device-readiness
plan: "04"
subsystem: command-center-uat
tags: [uat, loja-18, command-center, evidence-hygiene, e2e]
requires:
  - phase: 12-pilot-operations-and-device-readiness
    plan: "03"
    provides: "Installed build truth and approved staging artifact compatibility."
provides:
  - "Contract-backed guided Loja 18 UAT checklist."
  - "Command Center UAT panel with pending, passed, blocked, and external-blocked states."
  - "Public-safe Phase 12 UAT artifact and operations runbook updates."
affects: [phase-12, command-center, uat, operations-docs, release-readiness]
tech-stack:
  added: []
  patterns:
    - "Checklist state is part of Command Center projection and remains public-safe."
    - "Real product/lot UAT steps cannot pass from fixtures, seeds, or FICTICIO data."
    - "External Android/provider/camera blockers stay visible as external_blocked."
key-files:
  created:
    - .planning/phases/12-pilot-operations-and-device-readiness/12-UAT.md
  modified:
    - packages/contracts/src/command-center.ts
    - packages/contracts/src/command-center.test.ts
    - apps/api/src/command-center.ts
    - apps/api/src/command-center.test.ts
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center.test.tsx
    - apps/web/e2e/v1-readiness.spec.ts
    - apps/web/e2e/fixtures/v1-readiness.ts
    - docs/operations/staging-loja-18-uat.md
    - docs/operations/pilot-flow.md
key-decisions:
  - "UAT steps are fixed to the D-15 real pilot loop."
  - "Blocked and external-blocked checklist rows require cause and next action."
  - "Evidence references are labels/statuses only, with URLs/tokens/build links rejected by contract."
patterns-established:
  - "Command Center presents UAT next action without overriding device readiness or push-test truth."
  - "UAT docs distinguish repo-ready checklist behavior from real Android/provider/camera proof."
requirements-completed: [P12-UAT-04, P12-DEVICE-01, P12-PUSH-02, P12-RELEASE-03, P12-OPS-05]
duration: 13 min
completed: 2026-06-28
---

# Phase 12 Plan 04: Guided Loja 18 UAT Summary

**Loja 18 UAT now has a guided, public-safe Command Center checklist and a repo-safe evidence record, while real Android/provider/camera execution remains explicitly external until proven.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-28T16:13:14Z
- **Completed:** 2026-06-28T16:26:50Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added `PilotUatChecklist` and `PilotUatStep` contracts with the nine required D-15 steps.
- Enforced blocked/external-blocked cause + next action and public-safe evidence reference labels.
- Added generated Command Center checklist projection for empty, fail-closed, audit-backed, and capture-backed reads.
- Rendered `UAT Loja 18` in the Command Center with summary counts, next action, blocker causes, and evidence labels.
- Updated web component and Playwright fixtures to cover passed, pending, blocked, and external-blocked rows.
- Created `12-UAT.md` with sanitized checklist rows and explicit real product/lot rules.
- Updated operations runbooks to require real Loja 18 product/lot input without committing raw operational data.

## Task Commits

1. **Task 1-3: Guided UAT checklist, Command Center panel, and sanitized UAT record** - `c9934c4`

## Files Created/Modified

- `packages/contracts/src/command-center.ts` - UAT checklist schemas, step ids, states, and validation rules.
- `apps/api/src/command-center.ts` - UAT checklist projection helper and integration across read modes.
- `apps/web/src/command-center/CommandCenter.tsx` - Dense operational UAT panel.
- `apps/web/e2e/fixtures/v1-readiness.ts` - Web readiness fixture now includes device and UAT projection.
- `.planning/phases/12-pilot-operations-and-device-readiness/12-UAT.md` - Phase 12 public-safe UAT record.
- `docs/operations/staging-loja-18-uat.md` - Loja 18 guided UAT procedure.
- `docs/operations/pilot-flow.md` - Command Center/UAT evidence rules.

## Decisions Made

- The checklist guides UAT; it does not execute mobile work or prove physical completion by itself.
- Product and lot rows remain pending unless the controlled real-store UAT run records sanitized pass status.
- `external_blocked` is honest success for repo work when Android/provider/camera proof is unavailable.

## Deviations from Plan

- Added `apps/web/src/App.test.tsx` fixture coverage because the web shell also parses Command Center projection responses.

## Issues Encountered

- Playwright strict mode initially saw `Produto real da Loja 18` in multiple UI places. The E2E assertion was narrowed to the exact row label.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center` - 11 files, 97 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center` - 12 files, 82 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` - 9 files, 32 tests passed.
- `pnpm.cmd test:e2e:web` - 6 Playwright tests passed.
- `pnpm.cmd security:evidence` - passed.
- `pnpm.cmd security:data` - passed.
- `pnpm.cmd typecheck` - passed.
- `pnpm.cmd lint` - passed.
- `pnpm.cmd format:check` - passed.
- `cmd /c gsd-sdk.cmd query state.validate` - passed.

## User Setup Required

Real Loja 18 UAT still needs approved Android hardware/emulator, approved APK, real operator-entered product/lot input, provider push evidence, camera/fallback evidence, and a controlled release record. Public repo artifacts can only record sanitized status.

## Next Phase Readiness

Ready for 12-05 operational blocker synthesis, release docs, and final validation gates. The Command Center now has device readiness, build compatibility, safe push tests, and guided UAT status available for final blocker synthesis.

---
*Phase: 12-pilot-operations-and-device-readiness*
*Completed: 2026-06-28*
