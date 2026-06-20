---
phase: 05
slug: push-and-escalation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-20
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x for domain/contracts/api/mobile tests; Maestro for native smoke |
| **Config file** | `vitest.config.ts`, `.maestro/smoke.yaml`, `apps/api/wrangler.toml`, `apps/mobile/app.json` |
| **Quick run command** | Focused `pnpm.cmd --filter @validade-zero/* test -- alerts|push|alert` commands per plan |
| **Full suite command** | `pnpm.cmd check` |
| **Estimated runtime** | ~90-240 seconds for focused gates; full suite varies with build/native environment |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed in that task's `<verify><automated>` block.
- **After every plan wave:** Run the plan's full verification block.
- **Before `$gsd-verify-work`:** `pnpm.cmd check` must be green, with native push/smoke result or exact runtime blocker recorded.
- **Max feedback latency:** 240 seconds for focused tests.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | RSK-05 / PSH-02 | T-05-01 | Cadence repeats and escalates unresolved tasks without resolving them | unit | `pnpm.cmd --filter @validade-zero/domain test -- alerts` | W1 | pending |
| 05-01-02 | 01 | 1 | PSH-01 / PSH-05 | T-05-02 | Alert contracts reject malformed tokens/payloads and keep task ids explicit | contract | `pnpm.cmd --filter @validade-zero/contracts test -- alerts` | W1 | pending |
| 05-02-01 | 02 | 2 | PSH-01 / PSH-02 / PSH-05 | T-05-03 | Mobile alert state persists reminders, retries, escalation, and no task resolution | integration | `pnpm.cmd --filter @validade-zero/mobile test -- alert` | W2 | pending |
| 05-02-02 | 02 | 2 | PSH-01 | T-05-04 | Expo notification adapter handles permission/token unavailable states behind a mockable port | unit/component | `pnpm.cmd --filter @validade-zero/mobile test -- push-channel` | W2 | pending |
| 05-03-01 | 03 | 3 | PSH-05 / UI contract | T-05-05 | Hoje keeps task list stable while showing permission, denied, pending, failed, and active channel notices | component | `pnpm.cmd --filter @validade-zero/mobile test -- push` | W3 | pending |
| 05-03-02 | 03 | 3 | RSK-05 / PSH-02 | T-05-06 | Leadership acknowledgement records receipt time but leaves task open until physical resolution | component/integration | `pnpm.cmd --filter @validade-zero/mobile test -- escalation` | W3 | pending |
| 05-04-01 | 04 | 4 | PSH-01 / PSH-02 | T-05-07 | API/cron/provider seam maps tickets, receipts, transient failures, and invalid tokens safely | api/provider | `pnpm.cmd --filter @validade-zero/api test -- alerts` | W4 | pending |
| 05-04-02 | 04 | 4 | all phase requirements | T-05-08 | Full regression proves alerts did not break Hoje, capture, contracts, security, or smoke | full suite | `pnpm.cmd check` | W4 | pending |

*Status: pending until execution summaries record real command results.*

---

## Wave 0 Requirements

Existing infrastructure covers Phase 5 requirements:

- `vitest.config.ts` already includes `domain`, `contracts`, `mobile`, and `api` projects.
- `packages/contracts/src/tasks.ts` and `packages/domain/src/tasks.ts` already provide Phase 4 task vocabulary to extend.
- `apps/mobile/src/App.test.tsx`, `today-screen.test.tsx`, and `today-task-repository.test.ts` provide current mock patterns for React Native, Expo SQLite, and task fixtures.
- `apps/api/src/index.test.ts` provides current Hono request test style.
- `apps/mobile/app.json` exists and can receive the Expo Notifications config plugin.
- `.maestro/smoke.yaml` already exists, but native execution may still be blocked by `maestro` not being on PATH.

No separate Wave 0 install is required before planning. Plan 05-02 must install/configure notification dependencies before adapter code imports them.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native remote push delivery on physical Android/iOS | PSH-01 | Expo remote push requires a device/emulator with push support, credentials/development build, and provider availability | Use a development build or supported simulator/device, register a fake pilot device, send a test alert through the configured provider/tool, tap it, and confirm the app opens the current task or stale fallback. |
| OS permission/settings recovery | PSH-01 / PSH-05 | Component tests can mock denied permissions, but system settings behavior is OS-owned | Deny notification permission, verify "Alertas desativados neste aparelho" remains visible, open system settings when supported, re-enable, and retry registration. |
| Store-shift operational timing | RSK-05 / PSH-02 | Shift boundaries depend on local operational policy not yet backed by roles/schedules | Run with fictitious shift times and confirm paused/off-shift copy appears only for non-critical eligible tasks while critical/recheck tasks continue. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or existing Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 240s for focused tests.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-20
