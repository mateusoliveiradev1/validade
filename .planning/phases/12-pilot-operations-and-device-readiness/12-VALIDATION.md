---
phase: 12-pilot-operations-and-device-readiness
status: planned
nyquist_compliant: false
created_at: 2026-06-28
---

# Phase 12 Validation Matrix

Phase 12 validation must prove readiness truth without substituting code, docs, or local mocks for real installed-device/provider proof.

| Gate | Requirement | Validation | Expected Status Before Close |
|---|---|---|---|
| P12-DEVICE-01 | Per-device readiness | Contract/API/web tests show Apto, Atencao, Bloqueado, stale central read, missing first read, wrong store/user, denied camera, and old build states. | Required |
| P12-PUSH-02 | Safe push test | API/domain tests prove only lead/admin same-store can test, timeline records provider/token/permission/open outcomes, and no task/resolution state changes. | Required |
| P12-RELEASE-03 | Installed build truth | Mobile tests expose version/build/env/API target; web tests show approved staging compatibility; docs confirm `0.12.0` or chosen Phase 12 version replaces `0.0.0`. | Required |
| P12-UAT-04 | Guided Loja 18 UAT | Web/API tests cover checklist pass/block records for real pilot loop; public evidence is sanitized; no fake products/lots are treated as passing UAT. | Required |
| P12-OPS-05 | Operational blockers | Web/API tests show cause and next action for no approved device, stale sync, invalid token, denied camera, wrong membership, product review, conflict, unsafe shift close. | Required |
| Android installed target | Native installed app proof | `pnpm.cmd test:e2e:mobile` passes on connected approved Android target, or exact blocked output is recorded as external blocker. | Pass or External Blocker |
| Remote provider push | Physical provider delivery | Approved native APK/device/provider run proves push receipt/open signal, or provider remains external blocker. | Pass or External Blocker |
| Camera/device proof | Physical evidence path | Approved Android hardware run proves camera permission/evidence path, or camera remains external blocker with fallback documented. | Pass or External Blocker |
| Evidence hygiene | Public repo safety | `pnpm.cmd security:evidence` and `pnpm.cmd security:secrets` pass after docs/UAT artifacts. | Required |
| Full repo gates | Regression safety | `pnpm.cmd check` passes, or failures are recorded with exact blocker. | Required |

## Evidence Rules

- Public artifacts may contain sanitized statuses, fictional labels, masked build/commit identity, and safe command output.
- Public artifacts must not contain raw push tokens, private URLs, EAS build links, Firebase files, device serials, raw photos, real evidence images, credentials, or customer/store-sensitive details.
- A blocked provider/device gate is acceptable only when the blocker is explicit and does not masquerade as pass.

## Closeout Rule

Set `nyquist_compliant: true` only after each gate has either a verified pass or a named external blocker with next action. A green `pnpm.cmd check` alone is not enough to close Phase 12.
