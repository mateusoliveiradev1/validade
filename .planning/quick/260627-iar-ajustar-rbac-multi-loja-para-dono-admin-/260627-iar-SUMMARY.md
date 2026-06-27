# Quick Task 260627-iar Summary

**Task:** Ajustar RBAC multi-loja para dono/admin, convites por loja e nome Mateus Oliveira
**Completed:** 2026-06-27
**Status:** Verified and deployed

## Changes

- Added `SessionStoresResponseSchema` and `/session/stores` for server-owned multi-store scope listing.
- Aggregated store actions across multiple roles in the same store.
- Extended closed invites with optional `additionalRoles`, so a Loja 10 leader can receive `lead` plus `admin` and create invites for that store.
- Updated the web access screen with a manageable-store selector.
- Fixed `/auth/session` refresh to read the real account display name from `auth_credentials`.
- Added `scripts/seed-staging-owner.mjs` for repeatable staging owner setup.
- Applied staging owner seed for `Mateus Oliveira`:
  - 23 active stores.
  - 23 active `admin` store scopes for the owner.
  - 1 active `lead` scope for Loja 18.
  - 0 active memberships left in inactive stores.

## Verification

- `pnpm.cmd --filter @validade-zero/contracts test -- --run packages/contracts/src/authorization.test.ts packages/contracts/src/authentication.test.ts`
- `pnpm.cmd --filter @validade-zero/api test -- --run apps/api/src/authorization.test.ts apps/api/src/authentication.test.ts`
- `pnpm.cmd --filter @validade-zero/web test -- --run apps/web/src/memberships/memberships.test.tsx`
- `pnpm.cmd check`
- Neon staging verification SQL confirmed:
  - `owner_display_name = Mateus Oliveira`
  - `active_stores = 23`
  - `owner_admin_active_stores = 23`
  - `owner_loja18_lead = 1`
  - `active_memberships_in_inactive_stores = 0`
- Staging Worker deployed:
  - `https://validade-zero-api-staging.validadezero.workers.dev`
  - version `c9c8f825-b19c-4822-b5bf-0ebdfdd338ed`
- Web deployed and aliased:
  - `https://validade-five.vercel.app`
  - deployment `dpl_9kkGB1EggVb7JiHFJLZbS6NpKSWN`
- Live web asset check confirmed the new store selector and additional-role copy are present in the production bundle.

## Remaining Truth

The app still has three store roles: `collaborator`, `lead`, and `admin`. "Admin geral" is represented by having `admin` in all active stores. A separate global owner role/table was intentionally not added in this quick fix because the current store-scoped membership model already enforces least privilege and avoids a wider migration.
