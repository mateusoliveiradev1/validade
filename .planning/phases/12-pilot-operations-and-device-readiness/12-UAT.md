---
phase: 12-pilot-operations-and-device-readiness
artifact: UAT
status: complete_with_external_blockers
created: 2026-06-28
updated: 2026-06-28
verification_result: repo-ready-with-external-blockers
---

# Phase 12 UAT - Loja 18 Guided Pilot

## Result

Repository behavior is ready for Phase 12 pilot-readiness tracking. The Command Center now exposes device readiness, safe push-test timeline, build compatibility, guided `UAT Loja 18`, and `Bloqueios do piloto` with cause, next action, severity, and ownership.

Physical pilot rollout is still blocked externally. This public artifact does not mark real Loja 18 execution as passed because there is no connected approved Android target, no current Maestro installed-app pass, no approved provider push delivery/open proof, no approved Android camera/fallback proof, and no controlled physical-device UAT record.

## Evidence Rules

- Use real Loja 18 product and lot input during the controlled UAT run, but do not commit real product names, real lot values, raw screenshots, photos, device serials, push tokens, provider tickets, build URLs, dashboard links, private URLs, or customer/store-sensitive details.
- Public evidence may record only sanitized status, timestamp, actor role label, masked device label, checklist state, blocker cause, next action, and safe command output.
- Product or lot fixtures containing `FICTICIO`, seed data, or generated demo records cannot mark `Produto real da Loja 18` or `Lote real registrado` as passed.
- `external_blocked` is a valid truthful outcome for Android/provider/camera gaps when the blocker and next action are explicit.

## Guided Checklist

| Step | Current public status | Evidence label | Cause / next action |
| --- | --- | --- | --- |
| Preparar turno | Pending real device | Aguardando registro seguro | Run `Preparar turno` on the approved APK and record only sanitized central-read status. |
| Produto real da Loja 18 | Pending real input | No fake product accepted | Use a real user-entered product from Loja 18; do not commit the product name. |
| Lote real registrado | Pending real input | No fake lot accepted | Register a real lot for the chosen product; do not commit the lot value. |
| Resolucao terminal | Pending physical action | Aguardando confirmacao central | Perform a compatible physical action and wait for central resolved history. |
| Segundo aparelho | Pending approved second device | Aguardando convergencia | Prepare turn on another approved device/account and compare central truth. |
| Command Center consistente | Pending real run | Aguardando painel real | Refresh Command Center after the mobile run and compare task/history state. |
| Teste seguro de push | External blocked | Provider bloqueado externamente | Needs approved Android APK/device/provider run. Push remains reminder-only. |
| Camera ou fallback | External blocked | Camera bloqueada externamente | Needs approved Android hardware camera path or no-photo fallback proof. |
| Fechamento de turno | Blocked until prior steps pass | Fechamento bloqueado | Safe close is allowed only after central revalidation and pending blocker removal. |

## Operational Blocker Synthesis

| Blocker source | Public status | Owner | Next action |
| --- | --- | --- | --- |
| Device readiness | Repo behavior passed; real target blocked | External/operator | Connect approved Android device, install approved APK, run prepare-turn, and confirm Command Center compatibility. |
| Safe push test | Repo behavior passed; provider proof blocked | External/operator | Run the safe push test from an approved native APK/device/provider setup and record sanitized outcome. |
| Build compatibility | Repo behavior passed; installed proof blocked | External/operator | Confirm device reports `atual` against `phase-12-staging-apk-120`. |
| Loja 18 checklist | Repo behavior passed; physical UAT blocked | Operator/external | Execute the real flow with approved device and sanitized evidence. |
| Product review | Repo behavior passed | Operator | Resolve drafts before declaring catalog ready. |
| Sync conflicts/discards | Repo behavior passed | Operator | Review conflicts/discards before safe close or rollout. |
| Shift close | Repo behavior passed | Operator | Close only after central revalidation and blocker removal. |

## Current Installed-Device Output

```text
adb devices
List of devices attached
```

```text
pnpm.cmd test:e2e:mobile
You have 0 devices connected, which is not enough to run 1 shards. Missing 1 device(s).
$ maestro test .maestro/v1-readiness.yaml
Not enough devices connected (0) to run the requested number of shards (1).
```

## Repository Verification

| Command | Result |
| --- | --- |
| `pnpm.cmd --filter @validade-zero/contracts test -- command-center alerts capture` | Passed: 11 files / 98 tests. |
| `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center alerts authorization` | Passed: 12 files / 82 tests. |
| `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` | Passed: 9 files / 32 tests. |
| `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn push-alerts` | Passed: 35 files / 183 tests. |
| `adb devices` | Blocked externally: no attached device rows. |
| `pnpm.cmd test:e2e:mobile` | Blocked externally: no connected device for Maestro shard. |

Final security, web E2E, and repo gates are recorded in `12-VALIDATION.md` and `12-05-SUMMARY.md`.

## Pass Conditions

Loja 18 UAT can move from blocked to passed only when all of the following have sanitized evidence:

1. Approved APK/device reports compatible build in Command Center.
2. Real Loja 18 product and lot were entered by the operator and observed from central truth.
3. Terminal resolution appears as central resolved history, not only local save or sync attempt.
4. A second approved device/account reads the same central state after prepare-turn.
5. Safe push test timeline records provider/device outcome without resolving any task.
6. Camera path or no-photo fallback is exercised on approved Android hardware.
7. Shift close revalidates central truth and does not hide active blockers.
