# Quick Task 260627-hkt: Loja 18 Real Staging UAT

**Date:** 2026-06-27
**Status:** In progress

## Goal

Prepare staging for a real web-first UAT of the 23-store operation with Loja 18 as the pilot store, without seeding fake products or lots.

## Decisions

- Seed store-scoped category catalog rows for `loja-01` through `loja-23`.
- Use `loja-18` / `Loja 18 - Staging` as the pilot scope.
- Do not create fake products, fake lots, fake tasks, or fake sales data.
- Copy existing staging pilot memberships into Loja 18 only when the subject already exists in staging, so current testers can enter the Loja 18 scope without inventing new people.
- Keep the old APK test honest: it can be used only if it already talks to the staging API; otherwise the web/API staging flow is the real test path until a new APK build is available.

## Tasks

1. Add an idempotent staging seed script for 23 store scopes and a full hortifruti category catalog.
2. Remove hardcoded web operational scope usage where it blocks a session from using its active store.
3. Add focused tests/docs for Loja 18 staging UAT.
4. Run relevant checks and apply the seed to Neon staging.
5. Commit code and planning artifacts.

## Verification

- Script dry run reports 23 stores and category count without product/lot writes.
- Neon staging contains category rows for `loja-18`.
- Current staging memberships can authorize Loja 18 where copied.
- Web tests/typecheck pass for touched surfaces.
- Staging health remains database/auth OK; evidence can remain degraded while R2 is intentionally disabled.
