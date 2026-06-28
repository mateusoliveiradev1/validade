---
phase: 12-pilot-operations-and-device-readiness
plan: "02"
subsystem: api-web-contracts-auth
tags: [push-test, command-center, rbac, timeline, provider-readiness]
requires:
  - phase: 12-pilot-operations-and-device-readiness
    plan: "01"
    provides: "Store-scoped pilot device readiness rows for the Command Center."
provides:
  - "Safe push-test command and sanitized outcome timeline contracts."
  - "Same-store leadership/admin authorization for pilot push tests."
  - "Command Center push-test action and timeline per registered pilot device."
affects: [phase-12, command-center, push-readiness, pilot-uat, rbac]
tech-stack:
  added: []
  patterns:
    - "Push tests are diagnostic reminders, never task or shift truth."
    - "Provider/token/permission outcomes are represented as sanitized bounded states."
    - "Session actions expose canSendPilotPushTest instead of inferring from role names."
key-files:
  created: []
  modified:
    - packages/contracts/src/alerts.ts
    - packages/contracts/src/command-center.ts
    - packages/contracts/src/authorization.ts
    - packages/domain/src/authorization.ts
    - apps/api/src/index.ts
    - apps/api/src/auth.ts
    - apps/api/src/command-center.ts
    - apps/web/src/App.tsx
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center-client.ts
    - packages/database/src/capture-repository.ts
key-decisions:
  - "Capability `pilot.push_test.send` belongs to active same-store lead/admin only."
  - "Command Center admin read remains separate from push-test authority."
  - "A provider accepted row still says it is not physical execution proof."
patterns-established:
  - "Push-test timeline rows carry requester, timestamp, permission/provider/open state, detail, and next action."
  - "UI appends the returned safe push-test result immediately while preserving central reload behavior."
requirements-completed: [P12-PUSH-02, P12-DEVICE-01, P12-OPS-05]
duration: 22 min
completed: 2026-06-28
---

# Phase 12 Plan 02: Safe Push-Test Timeline Summary

**Leadership can now send a safe push-test diagnostic to a registered pilot device and see a sanitized timeline without confusing provider success with task execution.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-28T14:47:01Z
- **Completed:** 2026-06-28T15:09:03Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments

- Added `SafePushTestCommand`, timeline item, state, and result contracts covering permission denied, local-only, provider accepted, provider failed, token invalid, opened, and unknown/no-signal outcomes.
- Added `pilot.push_test.send` to domain authorization and session actions; collaborators are denied, while same-store lead/admin can run the diagnostic.
- Implemented `POST /pilot/push-tests` with sanitized denial behavior, no raw token/device leakage, and tests proving active tasks remain unresolved after the test.
- Rendered a per-device `Enviar teste seguro` action and timeline in the Command Center with explicit copy: push does not resolve tarefa, does not prove area segura, and only validates the reminder channel.
- Fixed exact-optional telemetry writes in `capture-repository.ts` uncovered by `pnpm.cmd typecheck`.

## Task Commits

1. **Task 1: Add push-test contracts and result timeline states** - `702b5c70`
2. **Task 2: Enforce leadership-only same-store push testing** - `a639829`
3. **Task 3: Render safe push-test action and timeline** - `43acbfd`

## Files Created/Modified

- `packages/contracts/src/alerts.ts` - Safe push-test command/result schemas and timeline states.
- `packages/contracts/src/command-center.ts` - Device readiness can include safe push-test timeline rows.
- `packages/domain/src/authorization.ts` - Added `pilot.push_test.send` to lead/admin authority.
- `apps/api/src/index.ts` - Added authorized push-test endpoint and timeline result synthesis.
- `apps/api/src/command-center.ts` - Capture-backed projection can attach push-test timeline rows.
- `apps/web/src/command-center/CommandCenter.tsx` - Safe push-test action, disabled states, and per-device timeline.
- `apps/web/src/command-center/command-center-client.ts` - Web client can call the push-test endpoint.
- `packages/database/src/capture-repository.ts` - Optional telemetry writes now satisfy exact optional property typing.

## Decisions Made

- Push-test success is observability only: it never resolves tasks, closes shifts, or marks the sales area safe.
- Admin can send same-store pilot push tests but still cannot read the operational Command Center unless separately authorized.
- Timeline output stays public-safe: masked device IDs, bounded states, no Expo token, no provider ticket payload, and no raw device identifier.

## Deviations from Plan

- Added `canSendPilotPushTest` to session contracts and web shell props so UI authority is server-owned.
- Fixed a typecheck blocker in `capture-repository.ts` that came from optional device telemetry fields introduced in 12-01.

## Issues Encountered

- `pnpm.cmd typecheck` initially failed on exact optional properties and readonly push-test arrays. Both were fixed and the gate was re-run successfully.
- `format:check` found two pre-existing formatting deltas in files touched during 12-02; both were formatted and relevant tests were re-run.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- authorization alerts command-center` - 11 files, 94 tests passed.
- `pnpm.cmd --filter @validade-zero/domain test -- authorization` - 13 files, 122 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center alerts authorization` - 12 files, 82 tests passed.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` - 9 files, 32 tests passed.
- `pnpm.cmd --filter @validade-zero/database test -- repositories health` - 2 files, 43 tests passed.
- `pnpm.cmd typecheck` - passed.
- `pnpm.cmd lint` - passed.
- `pnpm.cmd format:check` - passed.

## User Setup Required

Approved native APK/device/provider proof is still required before claiming real remote push delivery as passed. This plan added the safe diagnostic command and visible timeline; it did not turn local mocks, Expo Go, or component tests into provider proof.

## Next Phase Readiness

Ready for 12-03 pilot build metadata, versioning, and installed-build truth. The Command Center can now show which registered device is ready for push diagnostics and what follow-up is needed when permission, provider, or token state fails.

---
*Phase: 12-pilot-operations-and-device-readiness*
*Completed: 2026-06-28*
