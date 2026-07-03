---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
status: human_needed
requirements: ["GPP-08"]
verified_at: 2026-07-03T03:05:00-03:00
source:
  - 18-01-PLAN.md
  - 18-02-PLAN.md
  - 18-03-PLAN.md
  - 18-04-PLAN.md
  - 18-05-PLAN.md
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
  - 18-04-SUMMARY.md
  - 18-05-SUMMARY.md
  - 18-SUMMARY.md
  - 18-TESTING.md
  - 18-UAT.md
---

# Phase 18 Verification - Controle GPP Mobile

## Status

`human_needed`

Automated repository verification passed. Phase completion still requires manual device/provider proof from `18-UAT.md`.

## Requirement Trace

| Requirement | Result | Evidence |
| --- | --- | --- |
| `GPP-08`: Mobile can add a separate Controle GPP entry for Registrar avaria and Solicitar compra interna with central-ack feedback and local-pending only during real offline use. | automated-pass / manual-pending | `18-SUMMARY.md`, `18-TESTING.md`, `18-UAT.md`, mobile tests |

## Must-Have Verification

| Must-have | Result | Evidence |
| --- | --- | --- |
| Separate mobile Controle GPP entry with Registrar avaria, Solicitar compra interna, Minhas pendencias, Enviadas hoje. | passed | Navigation and GPP flow tests; `18-02-SUMMARY.md`, `18-03-SUMMARY.md`, `18-04-SUMMARY.md`. |
| Avaria requires product code, quantity/unit, finality, and destination before submission. | passed | `gpp-avaria-flow.test.tsx`; `18-03-SUMMARY.md`. |
| Purchase request allows product description without product code, with quantity/unit/finality. | passed | `gpp-purchase-flow.test.tsx`; `18-04-SUMMARY.md`. |
| Online success only from `central_confirmed` or `replayed`. | passed | `gpp-client.test.ts`; `18-01-SUMMARY.md`; `18-SUMMARY.md`. |
| Local pending only on real transport/offline failure with `Pendente neste aparelho`. | passed | `gpp-client.test.ts`, `gpp-offline-queue.test.ts`; `18-01-SUMMARY.md`, `18-05-SUMMARY.md`. |
| Central validation/auth/feature/business failures do not enqueue local pending. | passed | `gpp-client.test.ts`; `18-01-SUMMARY.md`. |
| Manual retry preserves original idempotency keys and maps central rejection to conflict. | passed | `gpp-offline-queue.test.ts`; `18-05-SUMMARY.md`. |
| Conflict discard requires non-empty justification. | passed | `gpp-pending-screen.test.tsx`; `18-05-SUMMARY.md`. |
| `Hoje` remains free of GPP action entry points in Phase 18. | passed | `today-screen.test.tsx`, `mobile-gpp-navigation.test.tsx`; `18-05-SUMMARY.md`. |

## Automated Gates

- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed
- `pnpm.cmd --filter @validade-zero/mobile test` - passed, 44 files / 313 tests
- `pnpm.cmd check` - passed during Plan 18-05 closeout
- `gsd-sdk.cmd query verify.schema-drift 18` - passed, no drift detected
- `gsd-sdk.cmd query verify.codebase-drift 18` - skipped, no structure map active

## Human Verification Required

1. Physical one-hand aisle usability for avaria and purchase on Android.
2. Real offline-to-online transition on Android for one avaria and one purchase.
3. GPP web/provider perception after central acknowledgement, confirming no duplicate records.
4. Real central rejection path becomes visible conflict and discard requires retained justification.

These are documented in `18-UAT.md` and mirrored in `18-HUMAN-UAT.md`.

## Gaps

No repository gaps found. Remaining items are manual verification gates, not code gaps.

## Decision

Do not mark Phase 18 complete until human UAT is approved or explicitly deferred by the operator.
