---
phase: 17-controle-gpp-web-api-com-tempo-real
plan: "01"
subsystem: auth-contracts-api
tags: [gpp, authorization, zod, hono, feature-flag, realtime-contracts]
requires:
  - phase: 17-controle-gpp-web-api-com-tempo-real
    provides: Phase 17 context, UI contract, and GPP permission decisions
provides:
  - Dedicated GPP authorization role and capability matrix
  - Default-off Controle GPP session feature flag
  - Server-derived GPP session actions
  - Strict GPP contracts for avarias, movements, purchases, queues, history, mutations, and realtime hints
  - Worker runtime flag parsing with checked-in config remaining default-off
affects: [phase-17, gpp-api, gpp-web, authorization, contracts, worker-runtime]
tech-stack:
  added: []
  patterns: [server-owned-session-actions, default-off-feature-flag, central-first-gpp-contracts, refresh-hint-realtime]
key-files:
  created:
    - packages/contracts/src/gpp.ts
    - packages/contracts/src/gpp.test.ts
    - .planning/phases/17-controle-gpp-web-api-com-tempo-real/17-01-SUMMARY.md
  modified:
    - packages/domain/src/authorization.ts
    - packages/domain/src/authorization.test.ts
    - packages/contracts/src/authorization.ts
    - packages/contracts/src/authentication.test.ts
    - packages/contracts/src/authorization.test.ts
    - packages/contracts/src/index.ts
    - apps/api/src/auth.ts
    - apps/api/src/authorization.test.ts
    - apps/api/src/index.ts
    - apps/api/src/worker-runtime.test.ts
key-decisions:
  - "GPP authority is a distinct role with operational baixa permissions but no shift close, user, role, store, or policy governance powers."
  - "Controle GPP session actions require both server-owned capability checks and the default-off controle_gpp_enabled feature flag."
  - "Realtime GPP contracts carry only refresh hints; visible truth must be re-read from the central API."
  - "Checked-in Worker config remains default-off; runtime env can enable GPP with bounded public boolean parsing."
patterns-established:
  - "GPP actions are exposed as explicit session booleans and forced false when controle_gpp_enabled is false."
  - "Divergent avarias cannot be represented as eligible for baixa at the contract layer."
  - "Mutation responses distinguish central_confirmed, central_failed, and replayed instead of optimistic success."
requirements-completed: ["GPP-01", "GPP-04", "GPP-07"]
duration: 10min
completed: 2026-07-02
---

# Phase 17 Plan 01: Contract And Authorization Foundation Summary

**Dedicated GPP role, default-off session gating, and strict central-first GPP contracts now anchor Phase 17 web/API work.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-02T20:53:00Z
- **Completed:** 2026-07-02T21:02:30Z
- **Tasks:** 4
- **Files modified:** 12 before this summary

## Accomplishments

- Added `gpp` as a first-class authorization role with operational queue, divergence, review, baixa, purchase attendance, and history capabilities.
- Kept collaborator, lead, admin, and GPP authority separate: collaborator can create/correct own pending entries, lead can correct/review, admin remains governance-only for GPP baixa, and GPP does not inherit shift close or user/policy management.
- Added `featureFlags.controle_gpp_enabled` and GPP action booleans to session contracts with safe defaults for old session payloads.
- Updated API session context so GPP actions are derived from server-owned capabilities and forced false while the feature flag is disabled.
- Created strict GPP Zod contracts for avaria entries, linked movements, purchase requests, queue snapshots, detail/history rows, central mutation feedback, and realtime refresh-hint envelopes.
- Added Worker runtime parsing for `VALIDADE_ZERO_CONTROLE_GPP_ENABLED` or `CONTROLE_GPP_ENABLED`, defaulting false for missing or invalid values.

## Task Commits

1. **Task 1: Add GPP role and capability matrix** - `60c1aacf` (feat)
2. **Task 2: Add session actions and feature flag contract** - `1bdaa2f9` (feat)
3. **Task 3: Create strict GPP contracts** - `1c5846e7` (feat)
4. **Task 4: Wire runtime feature flag default-off** - `0cd2dff4` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `packages/domain/src/authorization.ts` - Adds GPP role/capability matrix and scoped role capability lists.
- `packages/domain/src/authorization.test.ts` - Proves GPP baixa is distinct from lead/admin and store-scope denial still holds.
- `packages/contracts/src/authorization.ts` - Adds default-off session feature flags and GPP action booleans.
- `packages/contracts/src/authorization.test.ts` - Covers GPP session backfill and feature-gated action derivation.
- `packages/contracts/src/authentication.test.ts` - Updates session fixture with explicit GPP false defaults.
- `packages/contracts/src/gpp.ts` - Defines strict GPP avaria, movement, purchase, queue, mutation, and realtime schemas.
- `packages/contracts/src/gpp.test.ts` - Tests strictness, divergence/baixa invariants, purchase attendance requirements, mutation outcomes, and realtime hint shape.
- `packages/contracts/src/index.ts` - Exports the GPP contract module.
- `apps/api/src/auth.ts` - Adds feature-gated GPP actions to server-created session context.
- `apps/api/src/authorization.test.ts` - Tests collaborator, lead, GPP, and admin GPP session action derivation.
- `apps/api/src/index.ts` - Threads runtime feature flag through API session context and Worker config parsing.
- `apps/api/src/worker-runtime.test.ts` - Tests default-off parsing and checked-in Worker config safety.

## Decisions Made

- GPP has baixa/purchase operational power without becoming leadership or administration.
- `lead` can review/correct GPP records but does not get GPP baixa by default.
- `admin` remains capable of governance actions but cannot baixar GPP avarias without a dedicated operational role/capability.
- Realtime payloads stay small and non-authoritative by contract, so clients must refresh central state after events.

## Deviations from Plan

- `apps/api/wrangler.toml` was intentionally left unchanged because it already does not enable Controle GPP in local or staging config. A Worker runtime test now guards against checked-in truthy GPP flags.

**Total deviations:** 1 documented no-op (default-off config already satisfied).
**Impact on plan:** No scope change; the default-off requirement is now protected by tests.

## Issues Encountered

- PowerShell rejected direct `&&` chaining for the verification command; the command was rerun through `cmd /c` successfully.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - passed, 14 files / 155 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 12 files / 112 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/api test` - passed, 12 files / 103 tests.
- `cmd /c "pnpm.cmd --filter @validade-zero/domain test && pnpm.cmd --filter @validade-zero/contracts test && pnpm.cmd --filter @validade-zero/api test"` - passed as final plan verification.

## User Setup Required

None - no external service configuration required. Controle GPP remains hidden until a safe runtime env explicitly enables the feature flag.

## Next Phase Readiness

Plan 17-02 can build persistence on top of stable GPP role/capability names, strict shared schemas, central mutation response states, and non-authoritative realtime envelope contracts.

---
*Phase: 17-controle-gpp-web-api-com-tempo-real*
*Completed: 2026-07-02*
