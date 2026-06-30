---
phase: 15
slug: operational-surface-distillation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 15 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, React Test Renderer, Playwright for web E2E when needed |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | ~180-600 seconds depending on full build/security gates |

---

## Sampling Rate

- **After every task commit:** Run the focused package test named in the plan.
- **After every plan wave:** Run affected package typecheck plus affected package test.
- **Before `$gsd-verify-work`:** `cmd /c pnpm.cmd check` must pass, or an exact external blocker must be recorded.
- **Max feedback latency:** 10 minutes for focused package tests; full gate only at final plan/wave.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | OPS-02/OPS-04 | T-15-01 | Classifier schema accepts only public operational choices and keeps old products valid. | contract/unit | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | W0 existing | pending |
| 15-01-02 | 01 | 1 | OPS-02/OPS-04 | T-15-02 | Policy helper maps classifier to existing mode/rebaixa semantics without UI-side magic. | unit | `cmd /c pnpm.cmd --filter @validade-zero/domain test` | W0 existing | pending |
| 15-02-01 | 02 | 2 | OPS-02 | T-15-03 | Product creation cannot bypass safe reuse/similar review. | mobile component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-02-02 | 02 | 2 | OPS-02/OPS-04 | T-15-04 | Classifier renders before categories and hides technical ProductMode labels. | mobile component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-03-01 | 03 | 3 | OPS-02 | T-15-05 | Lot fields and preview follow deterministic policy and never auto-rebaixa unknown/PED. | unit/mobile | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-03-02 | 03 | 3 | OPS-02 | T-15-06 | Existing pre-Phase-15 products/lots still render in recent lots and Hoje. | mobile/domain | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-04-01 | 04 | 4 | OPS-01/OPS-02/OPS-04 | T-15-07 | Empty store is first-lot guidance, not safe-area proof. | mobile component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-04-02 | 04 | 4 | OPS-01/OPS-04 | T-15-08 | Healthy readiness stays compact; blockers remain prominent. | mobile component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-05-01 | 05 | 5 | OPS-03/OPS-04 | T-15-09 | Safe close remains blocked by active tasks, sync, stale central, device/build blockers, or checklist gaps. | domain/mobile | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | W0 existing | pending |
| 15-06-01 | 06 | 6 | OPS-01..OPS-04 | T-15-10 | Web/mobile vocabulary stays public-safe and final gates do not claim external proof. | web/security/full | `cmd /c pnpm.cmd check` | W0 existing | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- Existing Vitest package projects cover contracts, domain, mobile, and web.
- Existing React Native mocks in mobile component tests cover capture screens.
- Existing security/evidence scripts cover public-repo fixture safety.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Physical safe area confirmation | OPS-03 | Requires real store, physical shelf, and leadership checklist | Do not claim during Phase 15 execution unless a real UAT record is captured separately. |
| Installed Android push/camera proof | OPS-01/OPS-04 | Requires device/provider/camera outside repo-local tests | Record as external blocker unless actually run with sanitized evidence. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or documented external blocker.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency under 10 minutes for focused gates.
- [ ] `nyquist_compliant: true` set only after execution evidence is recorded.

**Approval:** pending
