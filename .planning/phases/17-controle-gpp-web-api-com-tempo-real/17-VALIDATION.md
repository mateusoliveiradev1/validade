---
phase: 17
slug: controle-gpp-web-api-com-tempo-real
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-02
---

# Phase 17 - Validation Strategy

> Per-phase validation contract for the Controle GPP web/API foundation and realtime refresh hints.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x, React Testing Library, Playwright, Drizzle schema tests, repo security scripts |
| **Config files** | `vitest.config.ts`, `playwright.config.ts`, package `tsconfig.json`, `apps/api/wrangler.toml` |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` or the plan-specific focused package test |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | ~1-5 minutes for focused checks; full gate depends on repo cache |

---

## Sampling Rate

- **After every task commit:** Run the plan-specific focused command.
- **After every wave:** Run all focused package tests touched by the wave.
- **Before Phase 17 verification:** Run `cmd /c pnpm.cmd check`.
- **Max feedback latency:** 5 minutes for focused checks, 15 minutes for full gate when cache is warm.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | GPP-01, GPP-04 | T-17-01 | GPP role/capability matrix is explicit and does not inherit lead/admin powers. | domain/contract | `cmd /c pnpm.cmd --filter @validade-zero/domain test && cmd /c pnpm.cmd --filter @validade-zero/contracts test` | planned | pending |
| 17-01-02 | 01 | 1 | GPP-01, GPP-07 | T-17-02 | Feature flag and session actions gate GPP route default-off. | contract/api/web | `cmd /c pnpm.cmd --filter @validade-zero/api test && cmd /c pnpm.cmd --filter @validade-zero/web test` | planned | pending |
| 17-02-01 | 02 | 1 | GPP-02, GPP-03, GPP-05 | T-17-03 | Additive tables model avaria, movements, purchases, lifecycle, saldo, and idempotency. | database | `cmd /c pnpm.cmd --filter @validade-zero/database test` | planned | pending |
| 17-02-02 | 02 | 1 | GPP-02, GPP-05 | T-17-04 | Repository blocks movement above saldo and direct edits after baixa. | database | `cmd /c pnpm.cmd --filter @validade-zero/database test` | planned | pending |
| 17-03-01 | 03 | 2 | GPP-02, GPP-03, GPP-04, GPP-05 | T-17-05 | API writes are backend-authorized, store-scoped, idempotent, central-first, and audited. | api | `cmd /c pnpm.cmd --filter @validade-zero/api test` | planned | pending |
| 17-03-02 | 03 | 2 | GPP-05 | T-17-06 | Divergent items cannot be baixados until corrected and reviewed by GPP. | api | `cmd /c pnpm.cmd --filter @validade-zero/api test` | planned | pending |
| 17-04-01 | 04 | 3 | GPP-06 | T-17-07 | Realtime publishes only after central commit and carries refresh hints only. | api/web | `cmd /c pnpm.cmd --filter @validade-zero/api test && cmd /c pnpm.cmd --filter @validade-zero/web test` | planned | pending |
| 17-04-02 | 04 | 3 | GPP-06 | T-17-08 | Disconnect/publish failure keeps data saved and exposes manual refresh fallback. | api/web | `cmd /c pnpm.cmd --filter @validade-zero/api test && cmd /c pnpm.cmd --filter @validade-zero/web test` | planned | pending |
| 17-05-01 | 05 | 4 | GPP-07 | T-17-09 | Web GPP renders sector-first tabs, grouped baixa, details, divergence, and history without dashboard noise. | web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | planned | pending |
| 17-05-02 | 05 | 4 | GPP-04, GPP-06, GPP-07 | T-17-10 | Web feedback never shows success before central response and keeps failed work retryable. | web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | planned | pending |
| 17-06-01 | 06 | 5 | GPP-01..GPP-07 | T-17-11 | Feature flag default-off and no mobile/Hoje changes protect build 170 validation. | repo/docs | `git diff --name-only HEAD~1..HEAD` plus `cmd /c pnpm.cmd check` | planned | pending |
| 17-06-02 | 06 | 5 | GPP-01..GPP-07 | T-17-12 | Final docs record web/API readiness separately from real GPP rollout proof. | docs/security | `cmd /c pnpm.cmd security:evidence` | planned | pending |

---

## Wave 0 Requirements

Existing infrastructure is enough to start execution:

- Vitest projects already cover domain, contracts, database, API, web, and mobile packages.
- API tests already instantiate `createApiApp` with fake auth/membership/repository inputs.
- Database tests already inspect Drizzle schema and SQL repository behavior.
- Web tests already use React Testing Library and route/client fixtures.
- Playwright already covers web route-level readiness.
- Security scripts already scan public-safe evidence and docs.

No new test runner, package, or paid service is required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real GPP desk workflow with physical labels/caixa | GPP-07 | Automated tests can prove UI behavior, but not physical label handling | Keep caderno/caixa in parallel, let GPP clear a small controlled sample, and compare web history against physical labels |
| Cross-device realtime perception in Loja 18 network | GPP-06 | Unit tests can simulate WebSocket events; real perception depends on browser/network/session | Open two web sessions for the same store, perform one GPP write, confirm the second session refreshes after event or shows paused/manual refresh |
| Cutover from physical caderno to app-only | GPP-01..GPP-07 | Phase 17 intentionally does not replace the physical fallback | Defer removal until several days of GPP web/mobile consistency are reviewed |

---

## Validation Sign-Off

- [x] All planned tasks have automated verify commands or documented manual-only proof gates.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Existing infrastructure covers Wave 0 needs.
- [x] No watch-mode flags.
- [x] Feedback latency target under 5 minutes for focused checks.
- [x] `nyquist_compliant: true` set because every required proof has either automated sampling or an explicit manual-only gate.

**Approval:** approved 2026-07-02 for planning; execution must update statuses with real command evidence.
