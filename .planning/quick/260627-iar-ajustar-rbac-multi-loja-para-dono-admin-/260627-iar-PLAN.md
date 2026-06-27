# Quick Task 260627-iar: Ajustar RBAC multi-loja para dono/admin, convites por loja e nome Mateus Oliveira

**Date:** 2026-06-27
**Status:** Executed inline

## Goal

Make staging access management behave like a real multi-store pilot:

- Mateus Oliveira acts as general admin across the 23 active staging stores.
- Mateus keeps operational lead authority for Loja 18.
- Store admins can manage invites and memberships only for stores where they have `admin`.
- A store leader who must create invites can receive `lead` plus `admin` in the same store.
- Session refresh preserves the real account display name instead of falling back to subject/id text.

## Implementation Plan

1. Add a typed `/session/stores` response contract so the client can list store scopes resolved by the server.
2. Add an API route that groups active memberships by store and aggregates action booleans across all roles in each store.
3. Extend closed invite creation with optional additional roles and grant those roles to the same invited subject.
4. Update web membership administration to select among manageable stores returned by the server.
5. Fix auth session refresh to read account display name from `auth_credentials`.
6. Add an idempotent staging owner seed for Mateus Oliveira across the 23 active stores.
7. Verify with focused tests, full `pnpm.cmd check`, Neon staging SQL, API deploy, and Vercel deploy.

## Safety Notes

- No fake products, lots, tasks, or operational data are created.
- Store access is still server-owned: frontend selection cannot grant scope.
- The current production-compatible model represents "admin geral" as active `admin` memberships in every active store, not as a new global DB role.
