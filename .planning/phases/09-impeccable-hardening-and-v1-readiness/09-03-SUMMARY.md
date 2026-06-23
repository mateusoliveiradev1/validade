---
phase: 09-impeccable-hardening-and-v1-readiness
plan: "03"
subsystem: web
tags: [react, hono, command-center, auth, invitations, privacy, accessibility]
requires:
  - phase: 09-01
    provides: closed-pilot authentication, invitation, session, and privacy contracts
provides:
  - Authenticated web shell with responsive navigation and Privacy Center
  - Runtime-validated, store-scoped Command Center endpoint and operational funnel
  - Closed-pilot invitation administration and reasoned membership revocation
affects: [release-readiness, web-e2e, authorization, audit]
tech-stack:
  added: []
  patterns: [session-owned shell, conservative safety verdict, runtime-validated projection, closed-pilot invite administration]
key-files:
  created:
    - packages/contracts/src/command-center.ts
    - apps/api/src/command-center.ts
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/memberships/InviteAdministration.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/shell/AppShell.tsx
    - apps/web/src/memberships/MembershipAdministration.tsx
    - apps/web/src/auth/CurrentScope.tsx
    - apps/api/src/index.ts
key-decisions:
  - "A Command Center without a central task snapshot returns needs_review, never a false safe verdict."
  - "Command Center reads require audit.read_store and only return a projection validated at the API boundary."
  - "New web access is created by a store-scoped admin invitation; public signup is absent."
  - "Membership revocation requires a non-empty reason and records that reason in the append-only audit event."
requirements-completed: [UI-04]
completed: 2026-06-22
---

# Phase 09 Plan 03: Web Product Shell Summary

**Authenticated leadership web surface with a conservative operational funnel and closed-pilot access administration.**

## Accomplishments

- Replaced the smoke-first web app with a session-resolved shell, desktop/sidebar navigation, narrow-width sheet navigation, login/first-access/recovery/privacy states, and a seven-section Privacy Center.
- Added the Command Center contract, protected endpoint, loading/error/empty states, and the required funnel order: verdict, critical lots, overdue tasks, markdowns, evidence, sync conflicts, pending closes, and close history.
- Added invite issue/reissue/revoke flows, store/role/expiry visibility, membership revocation reasons, and tokenized replacement of the prior inline-styled scope panel.

## Task Commits

1. **Task 1: Authenticated web product shell** - `706c33a` (`feat`)
2. **Task 2: Operational Command Center risk funnel** - `d7c3c2c` (`feat`)
3. **Task 3: Closed-pilot administration and audit polish** - `46a7aee` (`feat`)

## Verification

- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center authentication memberships` - passed, 45 tests.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- App auth privacy command-center memberships invite audit` - passed, 21 tests.
- `pnpm.cmd --filter @validade-zero/web typecheck` - passed.
- `pnpm.cmd lint` - passed with dependency boundary validation for 189 source files.

## Deviations And Safeguards

- The current API has no persistent central task projection. The default Command Center explicitly reports `needs_review` and stale freshness until a server-owned projection is supplied. It does not infer safety from missing records or fabricate sales, stock, forecast, supplier, or BI data.
- The previous membership contract did not capture a revocation reason. The request and audit path were extended so the UI requirement has server-side enforcement and append-only evidence.

## Next Phase Readiness

- Plan 09-04 can exercise the authenticated shell, Command Center states, invitation controls, and focused API contracts in deterministic web E2E fixtures.
- The Command Center safety fallback is ready for release-gate coverage because it fails closed when central data is incomplete.

## Self-Check: PASSED

- All three task commits exist.
- Shell, Command Center, invitation, audit, and authorization tests pass.
- No inline `style={{ ... }}` blocks remain in the web auth, membership, or audit product surfaces.

---
*Phase: 09-impeccable-hardening-and-v1-readiness*
*Completed: 2026-06-22*
