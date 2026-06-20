---
phase: 05-push-and-escalation
plan: "01"
subsystem: domain-contracts
tags: [alerts, escalation, push, zod, domain]
requires:
  - phase: 04-today-task-workflow
    provides: Persistent Hoje task records, active keys, due buckets, required resolutions, and safe task resolution flow.
provides:
  - Pure alert cadence and escalation policy for Hoje tasks.
  - Privacy-safe lock-screen notification content helper.
  - Strict runtime contracts for alert state, device registration, dispatch, delivery results, and push-open intents.
affects: [mobile-alert-state, hoje-push-ui, api-alert-provider, cron-dispatch]
tech-stack:
  added: []
  patterns:
    - Pure domain policy before mobile/API/provider integration.
    - Strict Zod boundary contracts for push payloads and provider results.
key-files:
  created:
    - packages/domain/src/alerts.ts
    - packages/domain/src/alerts.test.ts
    - packages/contracts/src/alerts.ts
    - packages/contracts/src/alerts.test.ts
  modified:
    - packages/domain/src/index.ts
    - packages/contracts/src/index.ts
key-decisions:
  - "Alert delivery never resolves or hides a Hoje task; it only creates cadence, escalation, and routing state."
  - "Lock-screen dispatch content is validated to exclude lot/task identity details while retaining taskId and activeKey in data."
patterns-established:
  - "Alert policy remains pure in @validade-zero/domain and imports only domain-local task vocabulary."
  - "Provider-facing alert payloads are strict contracts with persistent task identity for stale-push handling."
requirements-completed: [RSK-05, PSH-01, PSH-02, PSH-05]
duration: 8 min
completed: 2026-06-20
---

# Phase 05 Plan 01: Alert Policy and Contracts Summary

**Pure reminder/escalation policy plus strict push/provider contracts for persistent Hoje tasks**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-20T12:56:00-03:00
- **Completed:** 2026-06-20T13:03:50-03:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added deterministic alert cadence for `now`, `shift`, off-shift suppression, recheck restart, escalation, and leadership acknowledgement.
- Added privacy-safe notification content that exposes only action, product, location, and `Abrir tarefa` on the lock screen.
- Added strict runtime contracts for alert state, device registration, dispatch payloads, provider delivery results, and push-open routing.
- Proved dispatch payloads keep persistent `taskId` and `taskActiveKey` while rejecting lock-screen lot/task identity leakage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pure alert cadence and escalation policy** - `5613f29` (feat)
2. **Task 2: Add runtime alert contracts and provider boundary schemas** - `634ae9b` (feat)

**Plan metadata:** pending in this commit.

## Files Created/Modified

- `packages/domain/src/alerts.ts` - Pure alert audiences, channel/attempt/escalation states, cadence helpers, audience selection, next-action derivation, and privacy-safe notification content.
- `packages/domain/src/alerts.test.ts` - Focused tests for cadence thresholds, off-shift behavior, recheck cadence, leadership acknowledgement, and lock-screen privacy.
- `packages/domain/src/index.ts` - Exports alert policy helpers from the domain package.
- `packages/contracts/src/alerts.ts` - Zod schemas and inferred types for alert state, device registration, dispatch, delivery result, and push-open intent.
- `packages/contracts/src/alerts.test.ts` - Focused tests for strict parsing, fake-safe token fixtures, lot leakage rejection, DeviceNotRegistered, and persistent task mapping.
- `packages/contracts/src/index.ts` - Exports alert contracts for mobile/API consumers.

## Decisions Made

- Alert/provider state is additive to the task workflow: no delivery result, push tap, or leadership acknowledgement can imply physical task resolution.
- Dispatch contracts validate lock-screen privacy at the boundary and still preserve `taskId` plus `taskActiveKey` in payload data for stale-push routing.
- Cadence override hooks are type-level/profile inputs only; Phase 5 does not add an admin configuration UI.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Issues Encountered

- PowerShell blocked `gsd-sdk.ps1`; execution used `gsd-sdk.cmd`, matching the known Windows shim workaround for this repo.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- alerts` - passed, 8 files / 66 tests.
- `pnpm.cmd --filter @validade-zero/contracts test -- alerts` - passed, 2 files / 10 tests.
- `pnpm.cmd --filter @validade-zero/domain typecheck` - passed.
- `pnpm.cmd --filter @validade-zero/contracts typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Mobile alert state can now consume a pure cadence policy and strict contracts without inventing local-only alert vocabulary. API/provider work can rely on the same dispatch and delivery-result boundary.

---
*Phase: 05-push-and-escalation*
*Completed: 2026-06-20*
