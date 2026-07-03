---
phase: 18
slug: controle-gpp-mobile-para-avaria-e-compras-internas
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-03
---

# Phase 18 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Native test renderer |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` |
| **Type command** | `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | Existing Phase 17 evidence: focused mobile tests passed with 38 files / 292 tests |

## Sampling Rate

- **After every task commit:** Run `cmd /c pnpm.cmd --filter @validade-zero/mobile test`
- **After every plan wave:** Run `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck && cmd /c pnpm.cmd --filter @validade-zero/mobile test`
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd check`
- **Max feedback latency:** one task commit

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | GPP-08 | T-18-01 | GPP client parses Phase 17 contracts and does not treat central errors as offline success | unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-01-02 | 01 | 1 | GPP-08 | T-18-02 | Local pending GPP queue stores idempotency keys and deduplicates retries | unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-02-01 | 02 | 2 | GPP-08 | T-18-03 | Feature flag and session actions hide unauthorized Controle GPP entry | component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-02-02 | 02 | 2 | GPP-08 | T-18-04 | GPP role opens Controle GPP while collaborators keep Hoje | component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-03-01 | 03 | 3 | GPP-08 | T-18-05 | Avaria blocks submit without product code, quantity/unit, and finality/destination | component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-03-02 | 03 | 3 | GPP-08 | T-18-06 | Avaria online success is shown only after central-confirmed response | component/unit | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-04-01 | 04 | 4 | GPP-08 | T-18-07 | Purchase request allows optional product code but requires name, quantity/unit, and finality | component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-04-02 | 04 | 4 | GPP-08 | T-18-08 | Minhas pendencias exposes sent/attended/partial/no-product/canceled and local pending states | component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-05-01 | 05 | 5 | GPP-08 | T-18-09 | Retry preserves idempotency and central rejection becomes reviewable conflict | unit/component | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |
| 18-05-02 | 05 | 5 | GPP-08 | T-18-10 | Today remains free of GPP-linked action integration | regression | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | yes | pending |

## Wave 0 Requirements

Existing infrastructure covers this phase:

- `vitest.config.ts` already includes the mobile project.
- `apps/mobile/src/capture/*test.tsx` already covers React Native component behavior.
- `apps/mobile/src/capture/sync-engine.test.ts` already covers offline/degraded/manual sync behavior.
- `apps/mobile/src/capture/capture-repository.test.ts` already covers repository/idempotency patterns.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One-hand GPP form usability in aisle | GPP-08 | Automated renderer cannot prove physical reachability, tap rhythm, or label scanning speed | Run on Android target or Expo dev build; create one avaria and one purchase while holding device one-handed; confirm text wraps and primary actions remain reachable. |
| Real offline transition | GPP-08 | Unit tests can simulate NetInfo, but real device connectivity and central reachability need physical proof | Start online, disable network, submit avaria and purchase, confirm `Pendente neste aparelho`; re-enable network and manually sync. |
| Sector mobile to GPP web perception | GPP-08 | Requires central API plus GPP web queue in staging/test store | Submit from sector mobile and verify GPP web queue sees the record only after central acknowledgement. |

## Validation Sign-Off

- [x] All planned tasks have automated verification targets
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing infrastructure references
- [x] No watch-mode flags
- [x] Feedback latency bounded by task commit
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
