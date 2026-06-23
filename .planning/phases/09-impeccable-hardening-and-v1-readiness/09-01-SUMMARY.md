---
phase: 09-impeccable-hardening-and-v1-readiness
plan: "01"
subsystem: auth
tags: [zod, hono, neon-postgres, web-crypto, lgpd, sessions]
requires:
  - phase: 08-audit-roles-and-shift-close
    provides: store memberships, server authorization, and audit repository boundaries
provides:
  - Strict invite-first authentication and LGPD privacy contracts
  - Durable hashed invite, credential, session, recovery, and privacy-request storage
  - Revocation-aware Hono authentication routes behind a replaceable auth adapter
affects: [mobile-auth, web-auth, command-center, invite-administration, v1-readiness]
tech-stack:
  added: []
  patterns: [server-owned session capabilities, hashed one-time tokens, invite-first access, sanitized authentication audit]
key-files:
  created:
    - packages/contracts/src/authentication.ts
    - packages/database/src/auth-repository.ts
    - packages/database/drizzle/0005_phase_09_auth.sql
    - apps/api/src/authentication.ts
    - apps/api/src/authentication.test.ts
  modified:
    - apps/api/src/auth.ts
    - apps/api/src/index.ts
    - packages/database/src/schema.ts
    - docs/security/threat-model-phase-09.md
key-decisions:
  - "Authentication remains behind PilotAuthProvider so Neon Auth can replace the implementation without changing operational authorization consumers."
  - "Invite, session, and recovery tokens are accepted only at repository/API boundaries and persisted solely as hashes."
  - "Web Crypto PBKDF2 and HMAC preserve the Cloudflare-compatible runtime boundary while retaining salted password verification and constant-time comparison."
patterns-established:
  - "Session refresh re-checks server-owned account and membership state before returning capabilities."
  - "Authentication-sensitive audit entries redact bearer tokens and privacy-request bodies."
requirements-completed: [UI-04]
duration: 30min
completed: 2026-06-22
---

# Phase 09 Plan 01: Invite-First Auth and Privacy Summary

**Invite-first Hono authentication with hashed durable sessions, revocation-aware capability refresh, and LGPD request contracts for the closed pilot.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-06-22T20:13:44-03:00
- **Completed:** 2026-06-22T20:43:42-03:00
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Added strict shared contracts for invites, first access, login/logout, recovery, session state, account restrictions, and LGPD rights requests.
- Added the Phase 09 migration and repositories for hashed credentials and tokens, idempotent invitation/privacy intake, and membership-aware session revocation.
- Replaced the default visual-only API seam with a `PilotAuthProvider` and invite-first login, recovery, privacy, and admin invite routes backed by server authorization.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define closed-pilot auth and privacy contracts** - `012edb4` (`feat`)
2. **Task 2: Persist pilot invites, credentials, sessions, recovery, and privacy requests** - `38b84e8` (`feat`)
3. **Task 3: Expose auth, recovery, session, and privacy API routes behind AuthProvider** - `30a4a03` (`feat`)

**Plan metadata:** pending this recovery commit

## Files Created/Modified

- `packages/contracts/src/authentication.ts` - Strict invite, session, recovery, and privacy request schemas.
- `packages/database/src/auth-repository.ts` - Hash-only pilot credential, token, session, and privacy request persistence.
- `packages/database/drizzle/0005_phase_09_auth.sql` - Auth and privacy schema tables with lookup indexes.
- `apps/api/src/authentication.ts` - `PilotAuthProvider` and protected invite-first Hono route handlers.
- `apps/api/src/auth.ts` - Adapter seam that composes session verification with existing authorization.
- `docs/security/threat-model-phase-09.md` - Authentication, privacy, replay, revocation, and provider-lock-in mitigations.

## Decisions Made

- Kept roles, stores, and capabilities server-owned; client requests can never grant operational authority.
- Used one-time hashed tokens and salted password hashes, with no raw secret fields in the migration or repository state.
- Made refresh revalidate the active membership so revocation takes effect before capabilities are returned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Replaced Node-only cryptography with Web Crypto primitives.**
- **Found during:** Task 3 (API integration)
- **Issue:** The repository must run inside the Cloudflare-compatible API boundary; Node-only crypto imports would undermine that deployment target.
- **Fix:** Used Web Crypto PBKDF2/HMAC, random salt generation, and a constant-time hexadecimal comparison.
- **Files modified:** `packages/database/src/auth-repository.ts`
- **Verification:** Contract, database, API, typecheck, lint, migration, and environment-security checks passed.
- **Committed in:** `30a4a03` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The runtime-compatible cryptography preserves the planned security properties without broadening product scope.

## Issues Encountered

- The executor reached a provider usage limit after the three implementation commits, before it could write this summary. The orchestration recovery re-ran every plan verification command successfully and reconstructed this record from the committed diffs.

## User Setup Required

None - `.env.example` documents the new TTL and pepper variable names without adding secrets to the repository.

## Next Phase Readiness

- Mobile and web can now consume the shared session states and invite-first endpoints in Plans 09-02 and 09-03.
- Deployment still needs real secret values and pilot invitation provisioning outside the public repository.

## Self-Check: PASSED

- All three task commits exist and their declared files are present.
- Contracts, database, API, typecheck, lint, migration, environment, and post-wave integration gates passed.

---
*Phase: 09-impeccable-hardening-and-v1-readiness*
*Completed: 2026-06-22*
