---
phase: 13
slug: web-operational-navigation-and-readiness-surfaces
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-29
---

# Phase 13 - Validation Strategy

> Per-phase validation contract for splitting web operation, devices, updates, and validation surfaces.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x for web unit/component tests; Playwright for web E2E |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/web test` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | ~120-300 seconds for full suite |

---

## Sampling Rate

- **After every task commit:** Run the plan-specific Vitest or typecheck command listed below.
- **After every plan wave:** Run `cmd /c pnpm.cmd --filter @validade-zero/web test` and `cmd /c pnpm.cmd --filter @validade-zero/web typecheck`.
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd test:e2e:web` and `cmd /c pnpm.cmd check`.
- **Max feedback latency:** 5 minutes for focused checks, 15 minutes for full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | WEB-01..WEB-05 | T-13-01 | Routes remain fail-closed by session actions | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-01-02 | 01 | 1 | WEB-02 | T-13-02 | Shared projection host does not duplicate or desync `/command-center` truth | typecheck | `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` | yes | pending |
| 13-02-01 | 02 | 2 | WEB-01, WEB-02 | T-13-03 | Daily route hides rollout diagnostics from first scan | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-02-02 | 02 | 2 | WEB-01 | T-13-03 | Operational blockers stay visible with cause and next action | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-03-01 | 03 | 3 | WEB-03 | T-13-04 | Device list uses masked ids and public-safe state labels | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-03-02 | 03 | 3 | WEB-03 | T-13-05 | Safe push test remains diagnostic and capability-gated | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-04-01 | 04 | 4 | WEB-04 | T-13-06 | Update route does not render private build URLs or tokens | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-04-02 | 04 | 4 | WEB-04 | T-13-06 | Installed builds compare against approved artifact labels only | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-05-01 | 05 | 5 | WEB-05 | T-13-07 | Validation route uses public-safe evidence and explicit Go/No-Go labels | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 13-05-02 | 05 | 5 | WEB-01..WEB-05 | T-13-08 | E2E proves route separation and navigation reachability | e2e | `cmd /c pnpm.cmd test:e2e:web` | yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:

- `apps/web/src/command-center/command-center.test.tsx` exists and already exercises the current projection.
- `apps/web/e2e/v1-readiness.spec.ts` exists and already installs public-safe fixtures.
- `apps/web/e2e/fixtures/v1-readiness.ts` already carries device, UAT, blocker, and build-truth fixture data.
- `cmd /c pnpm.cmd --filter @validade-zero/web test` is available through the web package script.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual density across desktop and mobile | WEB-01..WEB-05 | Automated tests can check content and navigation, but final layout polish needs a browser pass | Start the web app, inspect desktop and a narrow viewport, confirm no text overlap and no route hides critical next action |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or existing Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 5 minutes for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-29
