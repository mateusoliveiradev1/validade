---
phase: 19
slug: integracao-do-controle-gpp-com-hoje
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-25
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Native test renderer |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/today-screen.test.tsx` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | Focused project runs after each task; full repository gate after each wave |

## Sampling Rate

- **After every task commit:** Run the narrowest focused Vitest project command covering the touched layer.
- **After every plan wave:** Run focused tests and typechecks for every package changed in that wave.
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd check`.
- **Max feedback latency:** one task commit; no three consecutive tasks without automated verification.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | GPP-09 | T-19-01 | Removal arithmetic rejects invalid or mismatched quantities instead of clamping or resolving risk silently | unit/property-style | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project domain packages/domain/src/linked-gpp-removal.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | GPP-09 | Linked provenance and structured conflict impact remain strict while Phase 18 payloads stay compatible | contract | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project contracts packages/contracts/src/gpp.test.ts packages/contracts/src/tasks.test.ts` | ✅ | ⬜ pending |
| 19-02-01 | 02 | 2 | GPP-09 | Store and actor claims come from the authenticated server context, not client overrides | integration/security | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/gpp.test.ts` | ✅ | ⬜ pending |
| 19-02-02 | 02 | 2 | GPP-09 | Provenance, lot identity, audit facts, and idempotency round-trip without cross-store leakage | database | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project database packages/database/src/repositories.test.ts` | ✅ | ⬜ pending |
| 19-03-01 | 03 | 3 | GPP-09 | Physical removal receipt survives missing product code and never becomes a false pending-central claim | repository | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/capture-repository.test.ts` | ✅ | ⬜ pending |
| 19-03-02 | 03 | 3 | GPP-09 | In-memory and SQLite adapters preserve identical full/partial removal and restart behavior | repository/parity | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/capture/sqlite-migrations.test.ts` | ✅ | ⬜ pending |
| 19-04-01 | 04 | 4 | GPP-09 | Only genuine transport failures enter the outbox; central validation and conflicts remain correction states | unit/integration | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-offline-queue.test.ts` | ✅ | ⬜ pending |
| 19-04-02 | 04 | 4 | GPP-09 | Retry and replay preserve idempotency and discard never erases the durable physical receipt | unit/integration | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | ✅ | ⬜ pending |
| 19-05-01 | 05 | 5 | GPP-09 | GPP choices appear only after explicit physical-removal confirmation; sold-out makes zero GPP calls | component/accessibility | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | ✅ | ⬜ pending |
| 19-05-02 | 05 | 5 | GPP-09 | Locked review and the receipt expose physical-risk and GPP-delivery truth as separate labeled facts | component | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx` | ✅ | ⬜ pending |
| 19-06-01 | 06 | 6 | GPP-09 | Hoje follow-up excludes resolved physical risk from active-risk counts and routes correction/retry without duplicating the Phase 20 queue | route/regression | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | ✅ | ⬜ pending |
| 19-06-02 | 06 | 6 | GPP-09 | Phase 18 standalone avaria/purchase behavior, internal-purchase separation, and build semantics remain unchanged | regression/full | `cmd /c pnpm.cmd check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `packages/domain/src/linked-gpp-removal.test.ts` — pure full/partial removal, unit mismatch, invalid quantity, and no-clamp coverage for GPP-09.
- [ ] Confirm the focused mobile path for SQLite migration tests and update the 19-03-02 command if the repository uses a differently named existing file.
- [ ] Preserve `vitest.config.ts` project definitions; no new test framework or watch-mode command is required.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 18 conflict-discard proof before Phase 19 source execution | GPP-09 dependency gate | Renderer and repository tests cannot prove the approved post-170 Android binary behavior on a real device | Complete the remaining `18-HUMAN-UAT.md` conflict-discard scenario on the approved build and record device/build evidence before executing 19-01. |
| One-handed terminal flow, TalkBack order, 48dp targets, narrow labels, and reduced motion | GPP-09 | Static and renderer assertions cannot prove physical reachability, screen-reader cadence, ambient-light readability, or actual touch geometry | On the intentionally approved future Phase 19 Android build, run UI-SPEC scenarios 11–12 with TalkBack and reduced motion, then repeat full and partial removal one-handed. |
| Real airplane-mode retry and restart persistence | GPP-09 | Simulated network failures cannot prove OS connectivity transitions or process-restart persistence | On the future approved build, remove a lot, submit while offline, restart the app, reconnect, retry once, and confirm no duplicate central record. |

## Validation Sign-Off

- [x] All anticipated plan tasks have automated verification targets.
- [x] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 creates the missing domain test and confirms the SQLite test path.
- [x] No watch-mode flags.
- [x] Feedback latency is bounded by one task commit.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending plan-checker review
