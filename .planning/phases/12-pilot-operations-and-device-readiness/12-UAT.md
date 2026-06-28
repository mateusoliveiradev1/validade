---
phase: 12-pilot-operations-and-device-readiness
artifact: UAT
status: in_progress
created: 2026-06-28
verification_result: repo-ready-with-external-blockers
---

# Phase 12 UAT - Loja 18 Guided Pilot

## Result

The repository now contains a public-safe guided UAT checklist for Loja 18 in the Command Center. Real physical execution is not marked passed in this artifact until an approved Android device, approved APK, real Loja 18 operator input, provider/camera proof, and sanitized evidence record are available.

Current release decision remains blocked for installed Android, provider push, camera/device, and physical-device UAT proof. Repository tests can prove checklist behavior; they do not prove the real store loop.

## Evidence Rules

- Use real Loja 18 product and lot input during the controlled UAT run, but do not commit real product names, real lot values, raw screenshots, photos, device serials, push tokens, provider tickets, build URLs, or private links.
- Public evidence may record only sanitized status, timestamp, actor role label, masked device label, checklist state, and safe command output.
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

## Required Commands For Current Proof

```powershell
adb devices
pnpm.cmd test:e2e:mobile
pnpm.cmd security:evidence
pnpm.cmd security:data
```

Record exact blocked output when no Android target exists. Do not reinterpret a blocked device/provider gate as a pass.

## Repository Verification

| Command | Result |
| --- | --- |
| `pnpm.cmd --filter @validade-zero/contracts test -- command-center` | Passed during 12-04 implementation. |
| `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center` | Passed during 12-04 implementation. |
| `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` | Passed during 12-04 implementation. |

Additional full gates are recorded in `12-04-SUMMARY.md` after closeout.

## Pass Conditions

Loja 18 UAT can move from blocked to passed only when all of the following have sanitized evidence:

1. Approved APK/device reports compatible build in Command Center.
2. Real Loja 18 product and lot were entered by the operator and observed from central truth.
3. Terminal resolution appears as central resolved history, not only local save or sync attempt.
4. A second approved device/account reads the same central state after prepare-turn.
5. Safe push test timeline records provider/device outcome without resolving any task.
6. Camera path or no-photo fallback is exercised on approved Android hardware.
7. Shift close revalidates central truth and does not hide active blockers.

