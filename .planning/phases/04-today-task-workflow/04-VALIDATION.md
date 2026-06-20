---
phase: 04
slug: today-task-workflow
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-19
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x for domain/contracts/mobile component tests; Maestro for native smoke |
| **Config file** | `vitest.config.ts`, `.maestro/smoke.yaml` |
| **Quick run command** | `pnpm.cmd --filter @validade-zero/mobile test -- today` plus focused package tests per plan |
| **Full suite command** | `pnpm.cmd check` |
| **Estimated runtime** | ~90-180 seconds for focused gates; full suite varies with native/build environment |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed in that task's `<verify><automated>` block.
- **After every plan wave:** Run the plan's full verification block.
- **Before `$gsd-verify-work`:** `pnpm.cmd check` must be green, with native E2E result or exact runtime blocker recorded.
- **Max feedback latency:** 180 seconds for focused tests.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | RSK-03 | T-04-01 | Only actionable risk creates active tasks; radar stays future attention | unit | `pnpm.cmd --filter @validade-zero/domain test -- tasks` | yes | pending |
| 04-01-02 | 01 | 1 | RSK-03 | T-04-02 | Task storage validates records and avoids duplicate active task keys | integration | `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` | yes | pending |
| 04-02-01 | 02 | 2 | PSH-03 / UI-01 | T-04-03 | Hoje screen exposes sales-area safety before task list | component | `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` | yes | pending |
| 04-02-02 | 02 | 2 | UI-02 / UI-03 | T-04-04 | Task rows preserve action/product/lot/location/due text without color-only risk | component | `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` | yes | pending |
| 04-03-01 | 03 | 3 | RSK-04 | T-04-05 | Incompatible resolution is blocked and suggests the correct action | unit/component | `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` | yes | pending |
| 04-03-02 | 03 | 3 | RSK-04 / UI-03 | T-04-06 | Sales-area withdrawal/loss creates recheck before safety can return | integration/component | `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` | yes | pending |
| 04-04-01 | 04 | 4 | UI-01 / UI-02 / UI-03 | T-04-07 | Overdue, refresh failure, a11y, and smoke labels remain explicit | component/e2e/static | `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` | yes | pending |
| 04-04-02 | 04 | 4 | all phase requirements | T-04-08 | Full regression proves the phase did not break prior flows | full suite | `pnpm.cmd check` | yes | pending |

*Status: pending until execution summaries record real command results.*

---

## Wave 0 Requirements

Existing infrastructure covers most phase requirements; Plan 04-01 must add the contracts test project before relying on contract-focused commands:

- Vitest root config already includes `packages/domain` and `apps/mobile`.
- `packages/contracts/package.json` currently has a placeholder `test` script; Plan 04-01 must replace it with a real root Vitest invocation.
- `vitest.config.ts` currently lacks a `contracts` project; Plan 04-01 must add one for `packages/contracts/src/**/*.test.ts`.
- Mobile test mocks already cover React Native, Expo SQLite, Expo Camera, and date picker boundaries.
- ESLint `allowDefaultProject` must be extended only for new focused test files introduced by execution.
- Maestro smoke already exists and can be updated in the final wave.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native one-hand corridor feel on physical device | UI-03 | Component tests cannot prove actual thumb reach, lighting, and device ergonomics | Run the Hoje smoke on an Android emulator/device and inspect that `Hoje`, safety verdict, first critical task, and primary action are visible without horizontal clipping. |
| Camera/photo evidence prompt copy under store policy | RSK-04 / UI-02 | Phase 4 stores no real photos and policy differs by environment | Confirm the UI accepts a no-photo reason and does not require a real image or private asset. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or existing Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 180s for focused tests.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-19
