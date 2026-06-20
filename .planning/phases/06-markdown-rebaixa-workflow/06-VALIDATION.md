---
phase: 06
slug: markdown-rebaixa-workflow
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-20
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x for domain/contracts/mobile tests; Maestro for native smoke |
| **Config file** | `vitest.config.ts`, `.maestro/smoke.yaml`, `apps/mobile/app.json` |
| **Quick run command** | Focused `pnpm.cmd --filter @validade-zero/* test -- markdown|alert|today-accessibility` commands per plan |
| **Full suite command** | `pnpm.cmd check` |
| **Estimated runtime** | ~90-240 seconds for focused gates; full suite varies with build/native environment |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed in that task's `<verify><automated>` block.
- **After every plan wave:** Run the plan's full verification block.
- **Before `$gsd-verify-work`:** `pnpm.cmd check` must be green, with native smoke result or exact runtime blocker recorded.
- **Max feedback latency:** 240 seconds for focused tests.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MRK-01 / MRK-02 | T-06-01 | Markdown lifecycle stages and presence gate are pure and deterministic | unit | `pnpm.cmd --filter @validade-zero/domain test -- markdown` | W1 | pending |
| 06-01-02 | 01 | 1 | MRK-02 / MRK-03 | T-06-02 | Workflow records and commands reject malformed stage/evidence data | contract | `pnpm.cmd --filter @validade-zero/contracts test -- markdown` | W1 | pending |
| 06-02-01 | 02 | 2 | MRK-01 / MRK-02 | T-06-03 | Local repository creates one active stage task at a time and prevents duplicate active workflows | integration | `pnpm.cmd --filter @validade-zero/mobile test -- markdown` | W2 | pending |
| 06-02-02 | 02 | 2 | MRK-04 | T-06-04 | Delayed markdown stages stay visible and enter Phase 5 alert/escalation state without resolving | integration | `pnpm.cmd --filter @validade-zero/mobile test -- alert` | W2 | pending |
| 06-03-01 | 03 | 3 | MRK-01 / MRK-02 | T-06-05 | Hoje and lot detail expose eligible request/approval/application/confirmation paths with presence blocking | component | `pnpm.cmd --filter @validade-zero/mobile test -- markdown` | W3 | pending |
| 06-03-02 | 03 | 3 | MRK-03 | T-06-06 | Application and shelf confirmation require photo placeholder or explicit no-photo reason, with no binary/object key fields | component | `pnpm.cmd --filter @validade-zero/mobile test -- markdown` | W3 | pending |
| 06-04-01 | 04 | 4 | MRK-04 / UI | T-06-07 | Overdue copy, accessible controls, and escalation acknowledgement keep stage tasks open until physical action | component/a11y | `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` | W4 | pending |
| 06-04-02 | 04 | 4 | all phase requirements | T-06-08 | Full regression proves markdown did not break Hoje, capture, alerts, contracts, security, or smoke expectations | full suite | `pnpm.cmd check` | W4 | pending |

*Status: pending until execution summaries record real command results.*

---

## Wave 0 Requirements

Existing infrastructure covers Phase 6 requirements:

- `vitest.config.ts` already includes `domain`, `contracts`, and `mobile` projects.
- `packages/domain/src/tasks.ts` and `packages/domain/src/alerts.ts` provide task and alert vocabulary to extend.
- `packages/contracts/src/tasks.ts` already provides strict task/evidence schemas.
- `apps/mobile/src/capture/today-task-repository.test.ts`, `alert-state.test.ts`, `today-screen.test.tsx`, and `task-resolution.test.tsx` provide current fixture and mock patterns.
- `apps/mobile/src/capture/memory-repository.ts` and `sqlite-repository.ts` already mirror local task behavior.
- `.maestro/smoke.yaml` exists, but native execution may still be blocked by `maestro` or mobile runtime availability.

No separate Wave 0 install is required before planning.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native mobile shelf-confirmation flow on a device | MRK-03 | Component tests can prove commands/copy, but camera/OS behavior is mocked in this phase and no real binary is stored | On a development build or supported runtime, open a markdown confirmation task, choose photo placeholder when available or no-photo reason, and confirm no real image path/base64/object key appears in local debug output. |
| Leadership handoff realism | MRK-02 / MRK-04 | Formal RBAC is deferred to Phase 8, so this phase uses local leadership labels | With fictitious fixtures, approve and reject requests using leadership copy, confirm rejection closes the workflow with reason, and confirm approval creates an application task for the shift team. |
| Store timing for delayed markdown stages | MRK-04 | Exact store SLA may depend on operating policy not yet configured by admin UI | Use controlled timestamps to confirm approval/application/final confirmation delays appear in "Atrasadas" and escalate according to the Phase 5 cadence model. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or existing Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 240s for focused tests.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-20
