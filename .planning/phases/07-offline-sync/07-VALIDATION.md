---
phase: 07
slug: offline-sync
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-22
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` |
| **Full suite command** | `pnpm.cmd test` |
| **Estimated runtime** | ~60 seconds focused, ~180 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the focused command listed on that task.
- **After every plan wave:** Run all focused commands for the package(s) touched by the wave.
- **Before `$gsd-verify-work`:** `pnpm.cmd test`, `pnpm.cmd lint`, and relevant package typechecks must be green.
- **Max feedback latency:** one task without a focused automated command.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SYN-01/SYN-03 | T-07-01/T-07-02 | Pure policy keeps stale/pending/conflict states explicit | unit | `pnpm.cmd --filter @validade-zero/domain test -- sync` | yes | pending |
| 07-01-02 | 01 | 1 | SYN-02/SYN-03 | T-07-03/T-07-04 | Strict contracts reject duplicate/unsafe/raw evidence payloads | unit/contract | `pnpm.cmd --filter @validade-zero/contracts test -- sync` | yes | pending |
| 07-02-01 | 02 | 2 | SYN-01/SYN-02 | T-07-05/T-07-06 | Offline action is durable before visible local projection | integration | `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` | yes | pending |
| 07-02-02 | 02 | 2 | SYN-02/SYN-03 | T-07-07/T-07-08 | SQLite outbox uses transaction, idempotency, and visible pending state | integration | `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync` | yes | pending |
| 07-03-01 | 03 | 3 | SYN-02/SYN-03 | T-07-09/T-07-10 | Sync runner retries safely and never drops failed commands | unit/integration | `pnpm.cmd --filter @validade-zero/mobile test -- sync-engine` | yes | pending |
| 07-03-02 | 03 | 3 | SYN-03 | T-07-11/T-07-12 | API/transport seam parses idempotent commands and returns ack/conflict | contract/API | `pnpm.cmd --filter @validade-zero/api test -- sync` | yes | pending |
| 07-04-01 | 04 | 4 | SYN-01/SYN-03 | T-07-13/T-07-14 | Hoje shows cache, pending, stale, and conflict state without hiding safety risk | component | `pnpm.cmd --filter @validade-zero/mobile test -- today-screen` | yes | pending |
| 07-04-02 | 04 | 4 | SYN-02/SYN-03 | T-07-15/T-07-16 | Task panel saves offline actions and conflict discard requires reason | component/a11y | `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution` | yes | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real device network flap behavior | SYN-01/SYN-03 | Native network conditions and app foreground/background behavior depend on device runtime | If a native device is available, start mobile app, open Hoje online, disable connectivity, complete a fake task, re-enable connectivity, and confirm pending/conflict copy persists until sync result. Record blocker if native runtime is unavailable. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 seconds for focused tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-22

