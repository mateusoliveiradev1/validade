---
phase: 01
slug: engineering-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-18
---

# Phase 01 - Validation Strategy

> Per-phase validation contract for the engineering foundation.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest projects, Playwright web smoke, Maestro mobile smoke, secretlint/security scripts |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `.maestro/`, `.secretlintrc.json`, `turbo.json` |
| **Quick run command** | `pnpm test:smoke` |
| **Full suite command** | `pnpm check` |
| **Estimated runtime** | ~120 seconds after dependencies are installed |

## Sampling Rate

- **After every task commit:** Run the task-specific `<automated>` command.
- **After every plan wave:** Run `pnpm check` once the workspace install exists.
- **Before `$gsd-verify-work`:** `pnpm check` must be green.
- **Max feedback latency:** 120 seconds for the full baseline.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FND-01 | T-01-01 | Workspace graph is explicit and local package links fail fast | config | `pnpm install --frozen-lockfile && pnpm list --depth -1` | pending | pending |
| 01-01-02 | 01 | 1 | FND-02 | T-01-02 | Shared contracts/config/domain boundaries exist without provider secrets | typecheck | `pnpm --filter @validade-zero/contracts test && pnpm --filter @validade-zero/config test` | pending | pending |
| 01-02-01 | 02 | 2 | FND-01 | T-02-01 | Mobile/web/API boot without production credentials | smoke | `pnpm test:smoke` | pending | pending |
| 01-02-02 | 02 | 2 | FND-01 | T-02-02 | Safe probe uses fake adapter and contract validation | integration-smoke | `pnpm --filter @validade-zero/api test` | pending | pending |
| 01-03-01 | 03 | 3 | FND-02 | T-03-01 | Strict TS and typed lint reject unsafe boundary violations | static | `pnpm typecheck && pnpm lint` | pending | pending |
| 01-03-02 | 03 | 3 | FND-04 | T-03-02 | Env validation and ignore rules prevent secrets from entering normal workflows | security | `pnpm security:secrets` | pending | pending |
| 01-04-01 | 04 | 4 | FND-03 | T-04-01 | Test pyramid commands exist and are rooted in real smoke checks | test | `pnpm test && pnpm test:smoke` | pending | pending |
| 01-04-02 | 04 | 4 | FND-04 | T-04-02 | Fixtures are fictitious and checked automatically | test | `pnpm --filter @validade-zero/test-utils test` | pending | pending |
| 01-05-01 | 05 | 5 | AUD-04 | T-05-01 | CI blocks type/lint/test/security regressions | ci-static | `pnpm check` | pending | pending |
| 01-05-02 | 05 | 5 | FND-04 | T-05-02 | Public-repo safety and threat model are documented and checked | security | `pnpm security` | pending | pending |

## Wave 0 Requirements

- [ ] `package.json` - root scripts for install-independent command discovery.
- [ ] `pnpm-workspace.yaml` - workspace membership for apps/packages.
- [ ] `turbo.json` - canonical task graph.
- [ ] `vitest.config.ts` - root Vitest projects once packages exist.

These are created in Plan 01; later waves depend on them.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub repository feature toggles such as branch protection, dependency graph, and secret scanning are enabled | AUD-04 | These settings may require GitHub UI permissions outside the local repo | Review README/security docs and enable the listed repository settings before release hardening. |

## Validation Sign-Off

- [x] All planned tasks have `<automated>` verification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing command infrastructure.
- [x] No watch-mode flags are used in verification commands.
- [x] Feedback latency target is under 120 seconds once dependencies are installed.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
