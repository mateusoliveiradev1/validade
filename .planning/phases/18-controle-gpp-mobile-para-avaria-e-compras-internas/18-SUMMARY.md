---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
status: repository-complete-manual-uat-pending
requirements: ["GPP-08"]
updated: 2026-07-03T02:56:00-03:00
---

# Phase 18 Summary - Controle GPP Mobile

Phase 18 shipped a separate mobile Controle GPP surface for avaria and internal purchase work, without mixing GPP actions into `Hoje`.

## Shipped Behavior

- GPP users enter `Controle GPP` only when `controle_gpp_enabled` and GPP actions are present.
- Collaborator, lead, and admin users keep the daily validation surface in `Hoje`; GPP remains a separate shell entry.
- `Registrar avaria` requires product code, quantity/unit, finality, and destination before review/submission.
- `Solicitar compra interna` requires product description, quantity/unit, and finality while keeping product code optional.
- Online success is shown only for parsed `central_confirmed` or `replayed` responses.
- Transport failure creates `Pendente neste aparelho`; central validation, permission, feature, and business-rule failures remain central failures.
- Local GPP records preserve idempotency keys, retry visibly, and central rejection becomes a reviewable conflict.
- `Minhas pendencias` and `Enviadas hoje` distinguish local-only pending records from central-confirmed records.

## Requirement Trace

- `GPP-08` covered by:
  - `18-01-SUMMARY.md`: client, classification, local pending queue
  - `18-02-SUMMARY.md`: role-aware route hub
  - `18-03-SUMMARY.md`: avaria flow
  - `18-04-SUMMARY.md`: purchase flow and pending/sent surfaces
  - `18-05-SUMMARY.md`: retry/conflict/docs/final gates

## Evidence

- Focused mobile tests passed for GPP client, offline queue, navigation, avaria, purchase, pending, and Today boundary.
- Mobile typecheck passed.
- Full `pnpm.cmd check` passed after lint/format/type/test/build/security/performance gates.
- Manual UAT is documented in `18-UAT.md` and remains pending for physical one-hand aisle use, real Android offline/online transitions, and provider/web GPP queue perception.

## Remaining Manual Proof

- Physical Android aisle test for one avaria and one purchase.
- Real offline-to-online retry with the installed APK.
- GPP web perception after central acknowledgement.
- Real central rejection converted to conflict and discarded only with justification.

## Next Readiness

Phase 18 is repository-complete and ready for GSD verification. Phase 19 can integrate GPP signals into `Hoje` only after this boundary remains explicit.
