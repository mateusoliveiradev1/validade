---
phase: 15
slug: operational-surface-distillation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-30
completed: 2026-06-30
---

# Phase 15 - Validation Evidence

Phase 15 is repository-validated for operational-surface distillation. This file records command evidence only; it does not claim installed Android, real provider push, real camera/evidence capture, second-device convergence, or physical Loja 18 UAT proof.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, React Test Renderer, Vite build, repo security scripts |
| **Config files** | `vitest.config.ts`, `playwright.config.ts`, package `tsconfig.json` files |
| **Focused commands** | Mobile/domain/contracts/web package tests plus `security:evidence` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Result** | Passed |

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Threat Ref | Secure Behavior | Automated Command | Status |
|---------|------|-------------|------------|-----------------|-------------------|--------|
| 15-01-01 | 01 | OPS-02/OPS-04 | T-15-01 | Classifier schema accepts only public operational choices and keeps old products valid. | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | green |
| 15-01-02 | 01 | OPS-02/OPS-04 | T-15-02 | Policy helper maps classifier to existing mode/rebaixa semantics without UI-side magic. | `cmd /c pnpm.cmd --filter @validade-zero/domain test` | green |
| 15-02-01 | 02 | OPS-02 | T-15-03 | Product creation cannot bypass safe reuse/similar review. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-02-02 | 02 | OPS-02/OPS-04 | T-15-04 | Classifier renders before categories and hides technical ProductMode labels. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-03-01 | 03 | OPS-02 | T-15-05 | Lot fields and preview follow deterministic policy and never auto-rebaixa unknown/PED. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-03-02 | 03 | OPS-02 | T-15-06 | Existing pre-Phase-15 products/lots still render in recent lots and Hoje. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-04-01 | 04 | OPS-01/OPS-02/OPS-04 | T-15-07 | Empty store is first-lot guidance, not safe-area proof. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-04-02 | 04 | OPS-01/OPS-04 | T-15-08 | Healthy readiness stays compact; blockers remain prominent. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | green |
| 15-05-01 | 05 | OPS-03/OPS-04 | T-15-09 | Safe close remains blocked by active tasks, sync, stale central, device/build blockers, and checklist gaps. | `cmd /c pnpm.cmd --filter @validade-zero/mobile test`, `cmd /c pnpm.cmd --filter @validade-zero/domain test` | green |
| 15-06-01 | 06 | OPS-01..OPS-04 | T-15-10 | Web/mobile vocabulary stays public-safe and final gates do not claim external proof. | `cmd /c pnpm.cmd check` | green |

---

## Final Command Evidence

| Command | Result |
|---------|--------|
| `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | passed, 36 files / 234 tests |
| `cmd /c pnpm.cmd --filter @validade-zero/domain test` | passed, 14 files / 145 tests |
| `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | passed, 11 files / 101 tests |
| `cmd /c pnpm.cmd --filter @validade-zero/web test` | passed, 9 files / 38 tests |
| `cmd /c pnpm.cmd security:evidence` | passed, 423 tracked text files checked |
| `cmd /c pnpm.cmd check` | passed: typecheck, lint/boundaries, format, full Vitest, smoke Vitest, build, security, and performance budgets |

`cmd /c pnpm.cmd check` details from the passing run:

- Typecheck: 9 packages successful.
- Lint: dependency boundary check passed for 226 source files.
- Format: all matched files use Prettier style.
- Full Vitest: 88 files / 653 tests passed.
- Smoke Vitest: 57 files / 356 tests passed.
- Build: 9 packages successful; web build produced JS 130808 B gzip and CSS 7852 B gzip.
- Security: env, secret, data, evidence, UI release, and package security gates passed.
- Performance budgets: passed.

---

## Requirement Coverage

| Requirement | Evidence |
|-------------|----------|
| OPS-01 | Hoje readiness hides healthy diagnostic clutter, promotes stale central/critical sync blockers, and first-store empty central read routes to first lot registration. |
| OPS-02 | Product classifier, policy helper, product creation gate, lot fields, and legacy compatibility tests cover the simplified product/lot entry path. |
| OPS-03 | Fechamento summary and `evaluateShiftClose` block safe close on active tasks, missing/stale central read, critical sync, evidence, build/auth blockers, and incomplete checklist. |
| OPS-04 | Mobile Hoje/Ajustes/Fechamento and web Command Center use public labels for leitura central, cache local/fila local, fila de sincronizacao, push, camera, build, autorizacao do aparelho, revisao de produto, and lote sincronizado. |

---

## External Proof Boundaries

These were not executed during Phase 15 and remain explicit external gates:

- Installed approved Android APK proof.
- Real remote provider push delivery/open proof.
- Real camera/evidence capture or approved no-photo fallback on a physical device.
- Second-device physical convergence proof.
- Physical Loja 18 UAT with real product and lot input.

Repository tests prove code behavior and public-safe copy only. They do not prove physical execution in the store.

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented external blocker.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 references resolved by final evidence.
- [x] No watch-mode flags.
- [x] Feedback latency stayed under focused-gate expectations.
- [x] `nyquist_compliant: true` set only after execution evidence was recorded.

**Approval:** repository validation complete with external physical/provider/device proof boundaries preserved.
