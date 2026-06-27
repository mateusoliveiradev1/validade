---
status: complete
date: 2026-06-27
---

# Quick Task 260627-hkt Summary

Prepared staging for a real Loja 18 UAT across a 23-store staging set without creating fake products, lots, tasks, or sales data.

## Changes

- Added `stores` as an explicit store catalog and migration `0010_phase_10_store_catalog.sql`.
- Added `scripts/seed-staging-network.mjs` plus `pnpm.cmd staging:seed-network`.
- Seeded staging with 23 active stores and 15 active hortifruti categories per store.
- Moved staging auth credentials/sessions from `loja-piloto` to `loja-18` after copying active pilot memberships to Loja 18.
- Updated web/API scope fallbacks so session-owned store scope is used when a component does not pass a store explicitly.
- Added `docs/operations/staging-loja-18-uat.md` for the real UAT path without a new APK.

## Staging Evidence

- Backup branch created before migration: `backup-staging-260627-hkt` / `br-weathered-resonance-acpvcodd`.
- Migration applied to Neon staging: `0010_phase_10_store_catalog.sql`.
- API staging deployed: Worker version `d6ce8c0a-f2f1-4e30-b8be-437f16e0304c`.
- Web deployed and aliased: `https://validade-five.vercel.app`.
- Neon staging after seed:
  - active stores: 23
  - total stores including inactive legacy: 24
  - Loja 18 categories: 15
  - Loja 18 products: 0
  - Loja 18 lots: 0
  - Loja 18 active memberships: 4
  - Loja 18 active credentials: 3
  - legacy active credentials in `loja-piloto`: 0
  - seed audit events: 23
  - `central_categories_store_fkey`: present
  - `auth_credentials_store_fkey`: present

## Verification

- `node --check scripts/seed-staging-network.mjs`
- `pnpm.cmd --filter @validade-zero/database test`
- `pnpm.cmd --filter @validade-zero/web test -- current-scope memberships`
- `pnpm.cmd --filter @validade-zero/api test -- authorization authentication`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `pnpm.cmd check`
- Public API `/health`: 200
- Public API `/health/deep`: 503 degraded only because `evidence.mode=disabled`; database/auth OK
- Public web `/`: 200
- Public web `/health`: 200 via Vercel rewrite

## Notes

- The first dry-run attempt wrote idempotent store/category/membership seed data because Neon serverless did not preserve the rollback across calls. The script was corrected so dry-run is read-only before the final apply.
- No new APK was generated. The old APK can test only if it already points to the staging API; otherwise the web/API staging flow is the current real test path.
- Evidence binaries remain intentionally degraded until R2 or another storage path is enabled.
