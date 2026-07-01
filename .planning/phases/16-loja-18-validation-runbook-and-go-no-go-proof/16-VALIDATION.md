---
phase: 16
slug: loja-18-validation-runbook-and-go-no-go-proof
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-01
---

# Phase 16 - Validation Strategy

> Per-phase validation contract for Loja 18 validation runbook and Go/No-Go proof.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x, React Testing Library, Playwright, repo security scripts |
| **Config files** | `vitest.config.ts`, `playwright.config.ts`, package `tsconfig.json` files |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/api test` or the plan-specific focused package test |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | ~1-5 minutes for focused checks; full gate depends on repo cache |

---

## Sampling Rate

- **After every task commit:** Run the plan-specific focused command.
- **After every plan wave:** Run the focused package tests touched by that wave.
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd check`.
- **Max feedback latency:** 5 minutes for focused checks, 15 minutes for full gate when cache is warm.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | VAL-01, VAL-02 | T-16-01 | Runbook contract keeps exact nine-step order and blocked states causal. | contract | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | yes | pending |
| 16-01-02 | 01 | 1 | VAL-02, VAL-03 | T-16-02 | Public-safe evidence labels reject private URLs, tokens, build links, raw ids, and photos. | contract/security | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | yes | pending |
| 16-02-01 | 02 | 2 | VAL-01, VAL-03 | T-16-03 | Product, lot, resolution, command-center consistency, and safe close pass only from central proof. | api | `cmd /c pnpm.cmd --filter @validade-zero/api test` | yes | pending |
| 16-02-02 | 02 | 2 | VAL-01, VAL-04 | T-16-04 | Missing central facts fail closed to pending or blocked with route/action copy. | api | `cmd /c pnpm.cmd --filter @validade-zero/api test` | yes | pending |
| 16-03-01 | 03 | 3 | VAL-03 | T-16-05 | APK install, push, camera/fallback, and second-device gates remain explicit external/critical blockers. | api | `cmd /c pnpm.cmd --filter @validade-zero/api test` | yes | pending |
| 16-03-02 | 03 | 3 | VAL-02, VAL-03 | T-16-06 | Blockers preserve external ownership and sanitized affected/evidence labels. | api/contracts | `cmd /c pnpm.cmd --filter @validade-zero/api test && cmd /c pnpm.cmd --filter @validade-zero/contracts test` | yes | pending |
| 16-04-01 | 04 | 4 | VAL-01, VAL-04 | T-16-07 | Web Validacao renders the guided sequence, verdict reason, next action, and owner routes without manual pass UI. | web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | yes | pending |
| 16-04-02 | 04 | 4 | VAL-02 | T-16-08 | Web route and fixtures do not expose real/sensitive proof text. | web/e2e/security | `cmd /c pnpm.cmd --filter @validade-zero/web test && cmd /c pnpm.cmd test:e2e:web` | yes | pending |
| 16-05-01 | 05 | 5 | VAL-04 | T-16-09 | Store runbook tells operator/leadership next actions and external proof boundaries. | docs/security | `cmd /c pnpm.cmd security:evidence` | yes | pending |
| 16-05-02 | 05 | 5 | VAL-01..VAL-04 | T-16-10 | Final validation records repo evidence separately from physical/provider/device proof. | repo gate | `cmd /c pnpm.cmd check` | yes | pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:

- `packages/contracts/src/command-center.test.ts` already exercises UAT step order and public-safe text.
- `apps/api/src/command-center.test.ts` already exercises Command Center projection and pilot UAT fixtures.
- `apps/web/src/command-center/command-center.test.tsx` already exercises `Validacao`, route owners, and sensitive-string denylist.
- `apps/mobile/src/capture/task-resolution.test.tsx` already exercises evidence/no-photo metadata and central confirmation copy.
- `apps/mobile/src/capture/shift-close.test.tsx` already exercises central safe-close validation.
- `scripts/check-no-sensitive-evidence.mjs` already scans public evidence artifacts.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approved APK installed on a real Loja 18 Android device | VAL-01, VAL-03 | Repo can verify build labels and central readiness schema, but cannot prove physical install without the device | Install approved APK, prepare turn, confirm `Aparelho Loja 18 #1` reports approved version/build through central readiness |
| Remote push received/opened on approved device | VAL-03 | Provider acceptance/local-only state is not physical receipt | Use `Aparelhos` safe push test, record only sanitized timeline state and next action |
| Camera evidence or accepted no-photo fallback | VAL-02, VAL-03 | Repo can prove sanitized metadata only, not real camera hardware | Resolve the required task on approved Android device and record public-safe evidence/fallback label |
| Second approved mobile device reads the same central facts | VAL-01, VAL-03 | Web route does not count as mobile convergence | Prepare turn on a second approved mobile device and confirm same product/lot/task/resolution facts |
| Physical Loja 18 UAT in aisle | VAL-04 | Store-floor execution cannot be simulated by repo tests | Follow `16-UAT.md`, record only public-safe state/timestamp/owner/masked-device labels |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or documented manual-only proof gates.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Existing infrastructure covers Wave 0 needs.
- [x] No watch-mode flags.
- [x] Feedback latency target under 5 minutes for focused checks.
- [x] `nyquist_compliant: true` set because every required proof has either automated sampling or an explicit manual-only gate.

**Approval:** approved 2026-07-01 for planning; execution must update statuses with real command evidence.
