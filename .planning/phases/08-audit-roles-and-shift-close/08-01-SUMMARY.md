---
phase: 08-audit-roles-and-shift-close
plan: "01"
subsystem: auth
tags: [authorization, rbac, store-scope, neon, drizzle, audit]

requires:
  - phase: 07-offline-sync
    provides: offline command idempotency, explicit sync acknowledgements, and conflict visibility
provides:
  - Pure role/capability/store-scope authorization matrix
  - Strict server-owned authorization/session contracts
  - Hono AuthProvider, membership repository, authorization service, and denial audit seams
  - Drizzle/Neon schema and idempotent migration for memberships and append-only audit events
  - Role-aware web scope surface that preserves the existing health smoke
affects: [audit, evidence, shift-close, memberships, web-admin, api-security]

tech-stack:
  added: [drizzle-orm, drizzle-kit, "@neondatabase/serverless"]
  patterns:
    - Server-owned actor context resolved from identity plus active membership
    - Store-scoped authorization checked in the API before protected operations
    - Append-only audit table with idempotency and mutation trigger
    - Optional Neon repository composition behind API ports

key-files:
  created:
    - packages/domain/src/authorization.ts
    - packages/contracts/src/authorization.ts
    - apps/api/src/auth.ts
    - apps/web/src/auth/CurrentScope.tsx
    - packages/database/src/schema.ts
    - packages/database/src/membership-repository.ts
    - packages/database/src/audit-repository.ts
    - packages/database/drizzle/0001_phase_08_identity_audit.sql
    - .planning/phases/08-audit-roles-and-shift-close/08-01-NEON-VERIFICATION.md
  modified:
    - apps/api/src/index.ts
    - apps/api/package.json
    - apps/web/src/App.tsx
    - packages/domain/src/index.ts
    - packages/contracts/src/index.ts
    - vitest.config.ts
    - eslint.config.mjs
    - pnpm-lock.yaml

key-decisions:
  - "JWT/session identity proves the subject only; role and store authority come from server-side memberships."
  - "Admin governance capabilities do not imply operational lead capabilities in a store."
  - "Audit events are append-only and corrections must be compensating events."
  - "Neon branch verification artifacts record only sanitized results, never connection strings."

patterns-established:
  - "Authorization stays pure in packages/domain and imports no provider, database, UI, Hono, or Zod code."
  - "API routes receive AuthorizedActorContext only after AuthProvider and MembershipRepository resolution."
  - "Database repositories expose insert/select intent only; audit repository has append but no update/delete API."
  - "Web role surfaces hide unauthorized actions while preserving neutral operational explanations."

requirements-completed: [AUD-02]

duration: 70min
completed: 2026-06-22
status: complete
---

# Phase 08 Plan 01: Identity, Membership, and Store Authorization Summary

**Server-owned role/store authorization with durable Neon membership and append-only audit foundations**

## Performance

- **Duration:** 70 min
- **Started:** 2026-06-22T10:04:55Z
- **Completed:** 2026-06-22T11:14:00Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments

- Added the pure Phase 8 authorization matrix with collaborator, lead, and admin capabilities kept explicit and distinct.
- Added strict Zod contracts for authenticated identity, store memberships, authorized actor context, client-safe denials, session context, and protected capability probes.
- Added Hono auth/authorization seams with fake and JWT-boundary AuthProviders, membership resolution, store-scoped protected probes, and sanitized denied-access auditing.
- Added a role-aware web scope component showing server-resolved role/store context while preserving the existing `/health` smoke path.
- Added `@validade-zero/database` with Drizzle schema, Neon serverless repositories, idempotent SQL migration, and a disposable Neon branch verification artifact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Deliver the thinnest role-aware protected web path** — `15ab5d9` (feat)
2. **Task 2: Persist the working membership path in Neon** — `3c3d01f` (feat)
3. **Task 3: Enforce server-owned identity and audit sanitized access denials** — `6831af8` (fix)

**Plan metadata:** this SUMMARY commit.

## Files Created/Modified

- `packages/domain/src/authorization.ts` — pure capability matrix and store-scope authorization rule.
- `packages/contracts/src/authorization.ts` — strict runtime contracts for identity, membership, denials, and session context.
- `apps/api/src/auth.ts` — AuthProvider, JWT-boundary provider, membership repository port, authorization service, and denial helpers.
- `apps/api/src/index.ts` — protected session context and capability probe routes with optional Neon repository composition.
- `apps/web/src/auth/CurrentScope.tsx` — role/store scope UI with lead-only close action handling.
- `packages/database/src/schema.ts` — Drizzle schema for `store_memberships` and `audit_events`.
- `packages/database/drizzle/0001_phase_08_identity_audit.sql` — idempotent Postgres migration with indexes and append-only trigger.
- `packages/database/src/membership-repository.ts` — Neon-backed active membership repository.
- `packages/database/src/audit-repository.ts` — insert-only append audit repository.
- `.planning/phases/08-audit-roles-and-shift-close/08-01-NEON-VERIFICATION.md` — sanitized disposable-branch verification result.

## Decisions Made

- Identity and authorization are intentionally separated: tokens identify a subject; memberships supply role/store authority.
- Admin users receive governance/global-read capabilities but cannot close a shift unless they also have explicit lead membership in that store.
- Cross-store denials return client-safe payloads without target details while the audit event records sanitized operational context.
- The initial database migration is hand-written and idempotent so it can be applied safely in a disposable Neon branch and checked independently of production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Declared the API dependency on the domain package**
- **Found during:** Task 1 focused test gate
- **Issue:** `apps/api/src/auth.ts` imported `@validade-zero/domain`, but `apps/api/package.json` did not declare the workspace dependency.
- **Fix:** Added `@validade-zero/domain` to API dependencies and regenerated the lockfile.
- **Files modified:** `apps/api/package.json`, `pnpm-lock.yaml`
- **Verification:** Focused domain/contracts/API/web authorization tests passed.
- **Committed in:** `15ab5d9`

**2. [Rule 3 - Blocking] Used published Drizzle tool versions**
- **Found during:** Task 2 install
- **Issue:** `drizzle-kit@^0.32.2` was not available from the registry in this environment.
- **Fix:** Pinned to the published stable `drizzle-kit@^0.31.10` and current available Neon/Drizzle packages.
- **Files modified:** `packages/database/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm.cmd install --lockfile-only=false`, database typecheck, database tests, and `db:check` passed.
- **Committed in:** `3c3d01f`

**3. [Rule 3 - Blocking] Isolated third-party Drizzle declaration noise**
- **Found during:** Task 2 database typecheck
- **Issue:** Drizzle optional dialect declaration files referenced optional peer types outside this Postgres package.
- **Fix:** Scoped `types: ["node"]` and `skipLibCheck: true` to `packages/database/tsconfig.json`; app code remains strict.
- **Files modified:** `packages/database/tsconfig.json`
- **Verification:** Database typecheck passed.
- **Committed in:** `3c3d01f`

**4. [Rule 2 - Missing Critical] Removed stale pause artifacts after Neon verification**
- **Found during:** Task 2 resume
- **Issue:** The handoff files still described the missing `NEON_DATABASE_URL` blocker after the disposable branch verification succeeded.
- **Fix:** Removed `.planning/HANDOFF.json` and the phase `.continue-here.md` in the completion commit.
- **Files modified:** `.planning/HANDOFF.json`, `.planning/phases/08-audit-roles-and-shift-close/.continue-here.md`
- **Verification:** `git status` showed no stale handoff files after commit.
- **Committed in:** `6831af8`

---

**Total deviations:** 4 auto-fixed (1 missing critical, 3 blocking)
**Impact on plan:** All fixes were required to satisfy dependency, verification, and resume-safety gates. No scope expansion beyond the identity/membership/audit foundation.

## Issues Encountered

- Neon CLI required browser OAuth during execution. Login completed, a disposable branch was created, migration assertions passed, and the branch was deleted afterward.
- The Neon CLI creation command printed the temporary connection URI in command output before subsequent commands suppressed secrets. The branch was deleted immediately after verification, and no secret was written to tracked files.

## User Setup Required

None committed. For future blocking migration checks, provide a temporary branch connection through `NEON_DATABASE_URL` only in the shell environment and never commit it.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- authorization` — passed
- `pnpm.cmd --filter @validade-zero/contracts test -- authorization` — passed
- `pnpm.cmd vitest run --config vitest.config.ts --project database` — passed
- `pnpm.cmd --filter @validade-zero/database db:check` — passed
- Disposable Neon branch migration assertions — passed; see `08-01-NEON-VERIFICATION.md`
- `pnpm.cmd --filter @validade-zero/api test -- authorization` — passed
- `pnpm.cmd --filter @validade-zero/api typecheck` — passed
- `pnpm.cmd lint` — passed
- Secret pattern scan for Neon URI/password in tracked workspace — no matches

## Next Phase Readiness

The server-owned identity, role/store authorization, active membership persistence seam, and append-only audit persistence foundation are ready for Plan 08-02 audit timelines and store-scoped audit workbench.

## Self-Check: PASSED

- Key files exist.
- All task commits exist.
- Required verification commands passed.
- `AUD-02` is covered by capability matrix, persisted memberships, route enforcement, denial tests, and disposable Neon branch migration assertions.

---
*Phase: 08-audit-roles-and-shift-close*
*Completed: 2026-06-22*
