---
phase: 02
slug: domain-and-risk-core
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-19
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for domain and risk core rules.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest root projects plus StrykerJS Vitest runner |
| **Config file** | `vitest.config.ts`, `stryker.config.json`, `eslint.config.mjs`, `scripts/check-boundaries.mjs` |
| **Quick run command** | `pnpm --filter @validade-zero/domain test` |
| **Full suite command** | `pnpm check` |
| **Estimated runtime** | ~180 seconds after domain tests and mutation tests exist |

## Sampling Rate

- **After every task commit:** Run the task-specific `<automated>` command from the plan.
- **After every plan wave:** Run `pnpm --filter @validade-zero/domain test` and `pnpm --filter @validade-zero/domain typecheck`.
- **Before `$gsd-verify-work`:** Run `pnpm lint`, `pnpm test`, `pnpm test:mutation`, and `pnpm check` unless mutation runtime is explicitly recorded as skipped.
- **Max feedback latency:** 180 seconds for the full suite, excluding first-run dependency cache effects.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CAT-04 | T-02-01 | Domain tests execute through root and package scripts | test-config | `pnpm --filter @validade-zero/domain test` | pending | pending |
| 02-01-02 | 01 | 1 | CAT-04 | T-02-01 | Product modes use discriminated unions instead of ambiguous optional fields | unit | `pnpm --filter @validade-zero/domain test -- product-mode` | pending | pending |
| 02-02-01 | 02 | 2 | RSK-01 | T-02-02 | Formal-validity risk calculation is deterministic and clock-injected | unit | `pnpm --filter @validade-zero/domain test -- risk-window` | pending | pending |
| 02-02-02 | 02 | 2 | RSK-02 | T-02-02 | 60/15/3/0 windows produce radar, markdown, critical, and expired states | unit | `pnpm --filter @validade-zero/domain test -- risk-window` | pending | pending |
| 02-03-01 | 03 | 3 | LOC-04 | T-02-03 | Stale or missing physical confirmation produces blocking uncertain state | unit | `pnpm --filter @validade-zero/domain test -- presence` | pending | pending |
| 02-03-02 | 03 | 3 | RSK-01 | T-02-03 | Risk outputs include structured reasons and operational commands | unit | `pnpm --filter @validade-zero/domain test -- command` | pending | pending |
| 02-04-01 | 04 | 4 | RSK-01 | T-02-04 | Critical branches have mutation-ready scenario coverage | mutation | `pnpm test:mutation` | pending | pending |
| 02-04-02 | 04 | 4 | CAT-04, LOC-04, RSK-01, RSK-02 | T-02-04 | Domain package stays isolated from UI, DB, provider, app, and adapter layers | static | `pnpm lint && pnpm check` | pending | pending |

## Wave 0 Requirements

- [x] `packages/domain` exists as a reserved pure package from Phase 1.
- [x] `scripts/check-boundaries.mjs` already scans domain imports.
- [x] `stryker.config.json` already includes `packages/domain/src/**/*.ts`.
- [x] `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` is ready.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Operational language is understandable for future store workflows | RSK-01 | The domain returns codes and commands, not final UI copy | Review exported command names and reason-code comments against `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` D-14 through D-18. |

## Validation Sign-Off

- [x] All planned tasks have `<automated>` verification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers required command infrastructure from Phase 1.
- [x] No watch-mode flags are used in verification commands.
- [x] Feedback latency target is under 180 seconds after dependencies are installed.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
