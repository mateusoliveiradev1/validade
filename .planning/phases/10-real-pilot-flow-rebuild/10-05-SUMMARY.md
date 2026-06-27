---
phase: 10-real-pilot-flow-rebuild
plan: "05"
subsystem: command-center
tags: [web, api, mobile, contracts, authorization, alerts, central-truth]

requires:
  - phase: 10-real-pilot-flow-rebuild
    provides: Central prepare-turn, product drafts, central lots, active tasks, terminal sync, conflicts, discards, and resolved history.
provides:
  - Capture-backed Command Center projection for active, pending, conflict, discarded, resolved, and review states.
  - Role/store scoped Command Center, catalog review, audit, membership, and web navigation behavior.
  - Central active-task alert dispatch filtered by registered store audience without resolving persistent tasks.
affects: [phase-10, command-center, central-capture, authorization, push-escalation]

tech-stack:
  added: []
  patterns:
    - "Command Center reads central capture prepare-turn facts by default and fails closed when central truth is unavailable."
    - "Catalog review and Command Center read use explicit capabilities instead of borrowing shift close or audit read authority."
    - "Scheduled alert dispatch can derive attempts from central active tasks and store-scoped audience registrations."

key-files:
  created:
    - .planning/phases/10-real-pilot-flow-rebuild/10-05-SUMMARY.md
  modified:
    - packages/contracts/src/command-center.ts
    - packages/contracts/src/authorization.ts
    - packages/contracts/src/alerts.ts
    - packages/domain/src/authorization.ts
    - packages/database/src/capture-repository.ts
    - apps/api/src/command-center.ts
    - apps/api/src/index.ts
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/shell/AppShell.tsx
    - apps/web/src/App.tsx

key-decisions:
  - "Command Center operational read is separate from audit read; collaborators can read allowed operational state without opening audit."
  - "Admin catalog/user governance does not imply shift close, task action, or Command Center operational authority."
  - "Push delivery records receipt only; active central tasks remain active until terminal resolution is accepted centrally."

patterns-established:
  - "Web navigation consumes server-owned session actions and disables unavailable areas with visible role reasons."
  - "Central alert dispatch filters registered devices by store and audience role before sending."
  - "Discarded actions and resolved history are first-class Command Center projection sections."

requirements-completed:
  - CAT-01
  - CAT-02
  - LOC-02
  - LOC-03
  - RSK-03
  - RSK-04
  - MRK-01
  - MRK-02
  - SYN-01
  - SYN-02
  - SYN-03
  - AUD-01
  - AUD-02
  - UI-01
  - UI-02
  - UI-03
  - UI-04

duration: inline
completed: 2026-06-27
---

# Phase 10 Plan 05 Summary

**Web, mobile push, and API authorization now consume central capture truth instead of audit-only or role-borrowed interpretations.**

## Performance

- **Duration:** Inline continuation
- **Started:** Carried over after 10-04 completion
- **Completed:** 2026-06-27T00:35:20-03:00
- **Tasks:** 3
- **Files modified:** 40 implementation/test files plus this summary

## Accomplishments

- Rebuilt the Command Center projection from `CaptureRepository.prepareTurn`, including active critical lots, active tasks, pending product drafts, markdowns, conflicts, discarded actions, and resolved history.
- Split role capabilities for `command_center.read_store` and `catalog.review`, then updated API/session/web navigation so collaborator, lead, and admin scopes remain explicit.
- Added central active-task alert dispatch from store-scoped audience registrations while preserving push as a reminder for persistent central tasks, not a resolution path.

## Task Commits

1. **Task 1: Expand Command Center projection around central capture truth** - `705fc7b` (feat)
2. **Task 2: Enforce role/store scope in web and central operations** - `f03b3a0` (feat)
3. **Task 3: Tie push and escalation to central active tasks** - `fa2125c` (feat)

## Files Created/Modified

- `packages/contracts/src/command-center.ts` - Added discarded-action and resolved-history projection sections.
- `packages/contracts/src/authorization.ts` - Added Command Center read and catalog review session action flags.
- `packages/contracts/src/alerts.ts` - Added central alert audience registration contract.
- `packages/domain/src/authorization.ts` - Added explicit `command_center.read_store` and `catalog.review` capabilities.
- `packages/database/src/capture-repository.ts` - Exposes central `discarded` conflicts alongside active conflicts for prepare-turn consumers.
- `apps/api/src/command-center.ts` - Capture-backed Command Center service with fail-closed central-read behavior.
- `apps/api/src/index.ts` - Default Command Center wiring, scoped catalog review, session actions, and central active-task alert repository.
- `apps/web/src/command-center/CommandCenter.tsx` - Web projection sections for discarded actions and resolved history plus audit-capability gating.
- `apps/web/src/shell/AppShell.tsx` - Navigation disables unavailable routes with role-specific reasons.
- `apps/mobile/src/capture/TodayScreen.tsx` - Existing push copy and acknowledgement behavior verified as persistent-task supportive.

## Decisions Made

- Command Center read is operational state, not audit access. Collaborators can read their store's allowed operational projection, while audit remains lead-only.
- Product draft review uses `catalog.review`; lead and admin can review where scoped, but admin still does not gain `task.act` or `shift.close`.
- Central alert dispatch fans out from active central tasks to registered audience roles and records delivery only; it does not mutate task resolution.

## Deviations from Plan

### Auto-fixed Issues

**1. Role capability split was more precise than the plan wording**
- **Found during:** Task 2 (role/store scope)
- **Issue:** Command Center read was tied to `audit.read_store`, so collaborators would see a web shell that could not load its first operational panel. Product draft review was tied to `shift.close`, mixing catalog governance with shift closure.
- **Fix:** Added `command_center.read_store` and `catalog.review`, updated session actions, API guards, web navigation, and tests.
- **Files modified:** `packages/domain/src/authorization.ts`, `packages/contracts/src/authorization.ts`, `apps/api/src/index.ts`, `apps/web/src/App.tsx`, `apps/web/src/shell/AppShell.tsx`
- **Verification:** Domain/contracts/API/web authorization tests and typechecks passed.
- **Committed in:** `f03b3a0`

---

**Total deviations:** 1 auto-fixed authorization precision correction
**Impact on plan:** No scope reduction; it better matches D-40 through D-45 and prevents fake UI affordances.

## Issues Encountered

- The Expo fake push provider intentionally returns a token fingerprint instead of the raw token. The new API alert test was adjusted to assert routing by command while keeping token secrecy.
- `exactOptionalPropertyTypes` required conditional prop spreading for optional Command Center audit callbacks.
- Local git hook attempted to push after `f03b3a0`, but GitHub was unreachable from the environment. The commit remains local.
- No new database migration was required for 10-05. `packages/database/drizzle/0006_phase_10_central_capture.sql` already covers central capture, projected tasks, conflicts, discarded/resolved states, and `db:check` passed. Remote migration application could not be performed because no `NEON_DATABASE_URL` or `DATABASE_URL` is present in the environment.

## User Setup Required

Migration apply is blocked until a target database URL is available in the shell environment.

PowerShell command when the target is available:

```powershell
$env:NEON_DATABASE_URL="postgres://..."
pnpm.cmd --filter @validade-zero/database db:push
```

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center capture`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center capture authorization sync`
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `pnpm.cmd --filter @validade-zero/contracts typecheck`
- `pnpm.cmd --filter @validade-zero/database typecheck`
- `pnpm.cmd --filter @validade-zero/api typecheck`
- `pnpm.cmd --filter @validade-zero/web typecheck`
- `pnpm.cmd --filter @validade-zero/domain test -- authorization`
- `pnpm.cmd --filter @validade-zero/contracts test -- authorization authentication`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- authorization authentication capture command-center`
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center memberships auth App`
- `pnpm.cmd --filter @validade-zero/domain typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test -- push-alerts today-screen`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd --filter @validade-zero/contracts test -- alerts`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- alerts capture authorization`
- `pnpm.cmd lint`
- `pnpm.cmd exec prettier --check ...`

## Next Phase Readiness

10-06 can revalidate shift close against central active tasks, run full pilot UAT, and collect release evidence. The main external blocker remains remote migration/application validation until the target Neon/staging URL is available in the environment.

---
*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-27*
