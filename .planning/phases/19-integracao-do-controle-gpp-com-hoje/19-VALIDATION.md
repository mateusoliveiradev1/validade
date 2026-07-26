---
phase: 19
slug: integracao-do-controle-gpp-com-hoje
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-25
---

# Phase 19 — Validation Strategy

> Per-phase contract sampling for execution. Phase 19 source execution remains blocked until 19-01 passes.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Native test renderer |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/today-screen.test.tsx` |
| **Full suite command** | `cmd /c pnpm.cmd check` |
| **Estimated runtime** | Focused project run after each task; full gate in Wave 7 |

## Sampling Rate

- **After each task commit:** Run the exact narrow command in the task map.
- **After each plan wave:** Run touched-package typecheck plus both plan task commands.
- **Before `$gsd-verify-work`:** Run `cmd /c pnpm.cmd check` and `cmd /c pnpm.cmd security:evidence`.
- **Max feedback latency:** One task commit; no source-changing task lacks an automated command.

## Executable Security Baseline

- **Checklist:** OWASP ASVS 5.0.0, Level 1, selected because `.planning/config.json` pins `security_asvs_level: 1` but no version. Version was verified against the [current official release](https://github.com/OWASP/ASVS/releases/tag/latest) and [versioned 5.0.0 requirements CSV](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv) on 2026-07-25.
- **Fail closed:** Any unresolved HIGH-severity threat finding blocks its plan and every dependent wave. A HIGH closes only when its exact task `<verify>` command exits zero and all linked `<acceptance_criteria>` evidence below is present.
- The original per-task `Threat Ref` remains the primary row reference; this index is authoritative when one task proves multiple HIGH threats.

| HIGH threat(s) | ASVS 5.0.0 L1 | Task | Exact automated evidence | Required acceptance evidence |
|----------------|-----------------|------|--------------------------|------------------------------|
| T-19-01 | V2.3.1 | 19-01-01 | `powershell -NoProfile -Command "$p = Get-Content '.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-HUMAN-UAT.md' -Raw; if ($p -notmatch '(?m)^status:\s*passed\s*$' -or $p -notmatch '(?m)^result:\s*passed\s*$') { exit 1 }"` plus the task `<human-check>` | Approved build/device and all five conflict-discard observations; no Phase 19/build/deploy mutation. |
| T-19-02-01 | V2.2.1, V2.2.2 | 19-02-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project domain packages/domain/src/linked-gpp-removal.test.ts` | Invalid quantity/unit cases, no clamp/default, exact full/partial state, and typed impact pass. |
| T-19-02-02 | V2.2.1, V2.2.2, V8.2.2 | 19-02-02 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project contracts packages/contracts/src/capture.test.ts packages/contracts/src/gpp.test.ts packages/contracts/src/tasks.test.ts` | Missing provenance/unit/idempotency is rejected; same-code lots remain distinct; conflict combinations are strict. |
| T-19-03-02 | V2.3.1, V8.2.2 | 19-03-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project database packages/database/src/repositories.test.ts` | One-row replay, same-code lot separation, cross-store rejection, and complete append-only audit pass. |
| T-19-03-01, T-19-03-03 | V8.2.1, V8.2.2, V8.3.1, V15.3.1 | 19-03-02 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/gpp.test.ts` | Feature/capability denial has no mutation; forged claims/cross-store access fail; public errors are minimized and legacy routes pass. |
| T-19-04-01 | V2.2.1, V2.2.2 | 19-04-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/linked-gpp-state.test.ts apps/mobile/src/capture/capture-repository.test.ts` | Full/partial/above-pending/missing-data/discard cases preserve immutable receipt and exact active remainder. |
| T-19-04-03 | V2.3.1 | 19-04-02 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/capture/sqlite-migrations.test.ts` | Atomic rollback/restart parity, forward migration, and explicit unknown-unit recovery pass. |
| T-19-05-01 | V2.2.1, V2.2.2 | 19-05-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-client.test.ts apps/mobile/src/capture/gpp-offline-queue.test.ts` | Only transport becomes pending; 4xx never becomes pending/success; idempotency/provenance survive retry without duplicate. |
| T-19-05-03 | V2.2.1, V2.3.1 | 19-05-02 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | Typed impact scopes re-projection; correction/conflict remain visible; discard requires justification and retains receipt. |
| T-19-06-01 | V2.2.1, V2.3.1 | 19-06-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | Destinations follow confirmation; sold-out makes zero GPP calls; reconference/evidence/accessibility requirements pass. |
| T-19-06-02 | V2.1.1, V2.3.1 | 19-06-02 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | Review is locked/complete; physical receipt precedes send; labels remain distinct; no premature success copy. |
| T-19-07-01, T-19-07-02 | V2.2.1, V2.3.1, V8.2.1, V8.2.2, V8.3.1, V15.3.1 | 19-07-01 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | Follow-up/count separation, affected-quantity review, scoped deep links, deterministic ordering, and Phase 20/21/purchase exclusions pass. |
| T-19-07-04 | V2.3.1 | 19-07-02 | `cmd /c pnpm.cmd exec prettier --check .maestro/phase19-linked-gpp-central.yaml .maestro/phase19-linked-gpp-offline-retry.yaml` | Both executable Maestro artifacts cover central confirmation, offline/retry, and the two interruption boundaries without building or running an APK. |
| T-19-07-03, T-19-07-04 | V2.3.1, V15.3.1 | 19-07-03 | `cmd /c pnpm.cmd check &amp;&amp; pnpm.cmd security:evidence` | Actual task/scenario/mutation/security evidence is recorded; native Maestro execution stays blocked until an approved Phase 19 build; build/deploy diff audit is clean. |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | GPP-09 | T-19-01 | Phase 18 native conflict-discard proof passes before any Phase 19 source mutation | dependency/human gate | `powershell -NoProfile -Command "$p = Get-Content '.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-HUMAN-UAT.md' -Raw; if ($p -notmatch '(?m)^status:\s*passed\s*$' -or $p -notmatch '(?m)^result:\s*passed\s*$') { exit 1 }"` | ✅ | ⬜ blocked by physical UAT |
| 19-02-01 | 02 | 2 | GPP-09 | T-19-02-01 | Invalid/mismatched quantities are rejected; typed impact is the only review path | unit/property | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project domain packages/domain/src/linked-gpp-removal.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 2 | GPP-09 | T-19-02-02 | Strict provenance/unit recovery stays additive and Phase 18 payloads remain compatible | contract | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project contracts packages/contracts/src/capture.test.ts packages/contracts/src/gpp.test.ts packages/contracts/src/tasks.test.ts` | ✅ | ⬜ pending |
| 19-03-01 | 03 | 3 | GPP-09 | T-19-03-02 | Provenance, distinct lots, audit, isolation, and replay round-trip centrally | database/security | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project database packages/database/src/repositories.test.ts` | ✅ | ⬜ pending |
| 19-03-02 | 03 | 3 | GPP-09 | T-19-03-01 | Store/actor claims come from authenticated server context | API/security | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/gpp.test.ts` | ✅ | ⬜ pending |
| 19-04-01 | 04 | 4 | GPP-09 | T-19-04-01 | Physical receipt survives missing code/unit and partial remainder stays active | repository/state | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/linked-gpp-state.test.ts apps/mobile/src/capture/capture-repository.test.ts` | ❌ W0 | ⬜ pending |
| 19-04-02 | 04 | 4 | GPP-09 | T-19-04-03 | Memory/SQLite preserve atomic full/partial and restart behavior | repository/parity | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/capture/sqlite-migrations.test.ts` | ✅ | ⬜ pending |
| 19-05-01 | 05 | 5 | GPP-09 | T-19-05-01 | Only transport failure enters outbox; central rejection stays correction/conflict | client/outbox | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-client.test.ts apps/mobile/src/capture/gpp-offline-queue.test.ts` | ✅ | ⬜ pending |
| 19-05-02 | 05 | 5 | GPP-09 | T-19-05-03 | Retry/replay are idempotent and conflict/discard retain physical receipt | route/integration | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | ✅ | ⬜ pending |
| 19-06-01 | 06 | 6 | GPP-09 | T-19-06-01 | Destinations require physical confirmation; sold-out makes zero GPP calls | component/accessibility | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | ✅ | ⬜ pending |
| 19-06-02 | 06 | 6 | GPP-09 | T-19-06-02 | Locked review/receipt expose physical and delivery truth separately | component/accessibility | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | ✅ | ⬜ pending |
| 19-07-01 | 07 | 7 | GPP-09 | T-19-07-01 | Hoje follow-up stays outside resolved physical-risk counts and Phase 20 queue | route/regression | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | ✅ | ⬜ pending |
| 19-07-02 | 07 | 7 | GPP-09 | T-19-07-04 | Executable central and offline/retry Maestro specifications exist without an APK build/run | native-E2E specification | `cmd /c pnpm.cmd exec prettier --check .maestro/phase19-linked-gpp-central.yaml .maestro/phase19-linked-gpp-offline-retry.yaml` | ❌ W0 | ⬜ pending |
| 19-07-03 | 07 | 7 | GPP-09 | T-19-07-03, T-19-07-04 | Full repository/mutation evidence is truthful and native closure remains blocked until approved-build Maestro passes | regression/full | `cmd /c pnpm.cmd check && pnpm.cmd security:evidence` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `packages/domain/src/linked-gpp-removal.test.ts` — created by 19-02-01 for full/partial, invalid quantity, mismatch, and no-clamp coverage.
- [ ] `apps/mobile/src/capture/linked-gpp-state.test.ts` — created by 19-04-01 for discriminated physical/delivery state coverage.
- [ ] Confirm the existing focused mobile project accepts `sqlite-migrations.test.ts`; change 19-04-02 only if repository artifacts prove a different filename.
- [ ] Preserve current Vitest projects; no new framework, dependency, or watch-mode command.

## Mandatory Scenario Matrix

1. Full avaria central confirmed with separate physical/delivery facts — 19-03, 19-04, 19-06.
2. `Confirmar esgotado` produces zero GPP calls/records — 19-06.
3. Partial removal keeps remainder active — 19-02, 19-04, 19-06.
4. Missing code preserves physical receipt and never says local pending — 19-02, 19-04, 19-06.
5. Real simulated transport failure enters pending/retry — 19-05.
6. Central validation rejection becomes `Corrigir envio` — 19-03, 19-05, 19-06.
7. Conflict without physical implication leaves removed risk resolved — 19-02, 19-05.
8. Conflict with physical implication reprojects affected quantity — 19-02, 19-05, 19-07.
9. Retry/replay creates no duplicate — 19-03, 19-05.
10. Justified discard retains physical audit — 19-04, 19-05.
11. TalkBack order and 48dp targets — automated assertions 19-06; later native confirmation.
12. Narrow labels and reduced motion — automated assertions 19-06; later native confirmation.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 18 conflict-discard proof before Phase 19 source execution | GPP-09 dependency gate | Renderer/repository tests cannot prove approved Android behavior | Complete `18-HUMAN-UAT.md` Test 1 in 19-01; execute 19-02 only after passed evidence. |
| One-handed flow, TalkBack order, 48dp, narrow labels, reduced motion | GPP-09 | Static assertions cannot prove physical reachability/cadence/ambient readability | On a later intentionally approved Phase 19 build, run UI-SPEC scenarios 11-12 and full/partial one-handed. |
| Real airplane-mode retry and restart persistence | GPP-09 | Simulated failures cannot prove OS connectivity/process restart | On the later approved build: remove, submit offline, restart, reconnect, retry once, confirm no duplicate. |

## Validation Sign-Off

- [x] All final task IDs have an automated command or explicit Wave 0 test creation.
- [x] Every task maps to GPP-09 and a concrete threat.
- [x] Mandatory scenarios 1-10 have automated owners; 11-12 preserve automated plus later-native truth.
- [x] No build/APK/push/deploy, new dependency, internal-purchase integration, Phase 20 queue, or Phase 21 realtime gate is introduced.
- [x] `nyquist_compliant: true` is set.

**Approval:** pending plan-checker review

## Revision Gate — Durable Destination, Mutation, Sync, and Native E2E

This section is normative where it strengthens the earlier matrix.

| Gate | Owner | Wave | Automated verification | Acceptance evidence | Status |
|------|-------|------|------------------------|---------------------|--------|
| Durable post-confirmation state | 19-04-01, 19-04-02 | 4 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/linked-gpp-state.test.ts apps/mobile/src/capture/capture-repository.test.ts apps/mobile/src/capture/sqlite-migrations.test.ts` | `awaiting_destination` is created atomically with the physical receipt; restart before destination restores it; restart after reviewed destination restores `ready`; neither creates an outbox row. | pending |
| Interrupted-flow UI/deep links | 19-06-02, 19-07-01 | 6, 7 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | Remount/restart before destination and before send restores the exact actionable step with preserved task/lot/quantity/destination and zero implicit send. | pending |
| Sync affordance scope | 19-07-01 | 7 | `cmd /c pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | Positive assertion for `pending_retry`; negative assertions for isolated `awaiting_destination`, `ready`, `awaiting_code`, `awaiting_unit`, `correction_required`, and `conflict`. | pending |
| Linked-removal mutation gate | 19-02-01, 19-07-03 | 2, 7 | `cmd /c pnpm.cmd exec stryker run stryker.config.json --mutate packages/domain/src/linked-gpp-removal.ts --thresholds.break 100 --reporters clear-text` | Scoped mutation score reaches 100%; no safety-critical survivor remains unreviewed. Result is copied to `19-TESTING.md`. | pending |
| Executable native E2E artifacts | 19-07-02 | 7 | `cmd /c pnpm.cmd exec prettier --check .maestro/phase19-linked-gpp-central.yaml .maestro/phase19-linked-gpp-offline-retry.yaml` | Central-confirmed and offline/retry Maestro YAML files are executable and contain both interruption boundaries. | pending |
| Native E2E execution/phase closure | 19-07-03 | 7 | Later approved-build commands: `maestro test .maestro/phase19-linked-gpp-central.yaml` and `maestro test .maestro/phase19-linked-gpp-offline-retry.yaml` | Both flows pass on an intentionally approved Phase 19 Android build with a sanitized deterministic fixture. D-23 forbids creating that build in this phase. | blocked — approved Phase 19 build required |

### HIGH Threat: post-confirmation destination gap

| Threat ID | Severity | ASVS 5.0.0 L1 | Mitigation | Exact verification | Fail-closed evidence |
|-----------|----------|----------------|------------|--------------------|----------------------|
| T-19-04-04 / T-19-07-04 | HIGH | V2.3.1 | Persist `awaiting_destination` atomically with physical receipt; persist selected review as `ready`; project both in Hoje; deep-link to exact step; reserve sync for `pending_retry`; require native central/offline E2E. | The wave 4 and wave 7 commands in the table above, followed later by both Maestro commands. | Any missing restart/deep-link/sync assertion, mutation survivor, malformed Maestro spec, or unexecuted/failed native flow blocks its plan and every dependent wave. GPP-09 and Phase 19 cannot be marked complete. |

### Additional mandatory scenarios

13. Interruption after physical confirmation and before destination survives navigation/process restart as actionable `awaiting_destination`.
14. Interruption after destination review and before send survives restart as actionable `ready`, with preserved destination and no transport attempt.
15. `Sincronizar pendências GPP` appears only with at least one `pending_retry`; every non-transport actionable state has a negative renderer assertion.
16. Targeted Stryker mutation gate has zero unreviewed survivors in linked-removal safety branches.
17. Maestro central-confirmed and offline/retry flows exist now, but native execution and phase closure remain blocked until an intentionally approved Phase 19 build is available.
