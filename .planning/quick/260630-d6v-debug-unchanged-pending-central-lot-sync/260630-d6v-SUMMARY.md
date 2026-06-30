---
quick_id: 260630-d6v
status: complete
completed: 2026-06-30
---

# Quick Task 260630-d6v Summary

## Outcome

Fixed the unchanged-device symptom by making pending central lots visible in sync state and producing a genuinely new Android build `0.12.0 (133)`.

## Root Causes

- The visible sync queue counted only offline `sync_commands`; lots saved in `capture_lots` with `central_sync_state` `pending_central` or `local` could still show as queue `0`.
- The previous rebuilt artifact was named from `app.json` as `133`, but native Gradle still had `versionCode 132`, so the APK internals remained `132`.
- Cloudflare Worker staging still had approved-build environment variables pointing to `uat14-staging-apk-132`.

## Changes

- `listSyncQueue` in memory and SQLite repositories now includes pending central/local lots when central lot replay is available.
- Hoje and Ajustes no longer say everything is synced if command replay is empty but pending central lots still exist.
- Approved staging build metadata moved to `uat15-syncfix-apk-133`.
- Local APK build script now syncs the temporary native Gradle version from `app.json` and checks produced APK badging before copying the artifact.
- API Worker and web staging were redeployed with the approved build set to `133`.

## Verification

- Mobile focused tests: 36 files, 236 tests passed.
- API Command Center tests: 12 files, 84 tests passed.
- Web Command Center/App tests: 9 files, 38 tests passed.
- Database focused tests: 2 files, 43 tests passed.
- Typecheck passed for mobile, API, web, and database.
- Web production build passed locally and in Vercel.
- `git diff --check` passed.
- `pnpm security:evidence` passed.
- `pnpm security:ui-release` passed.
- `gsd-sdk query state.validate` passed.
- API `/health` returned 200.
- Web alias `https://validade-five.vercel.app` returned 200.
- Web `/health` returned 200 through the API rewrite.
- API `/health/deep` remains degraded because staging evidence storage is intentionally `disabled`.

## Deployments

- API Worker staging version: `7fdd21f0-121e-42c9-813e-aa14bf8e19f9`
- API URL: `https://validade-zero-api-staging.validadezero.workers.dev`
- Vercel deployment: `dpl_3VMbVST4zcUnnEUSeudhnyntHunE`
- Vercel URL: `https://validade-mp9gxl2m9-mateusoliveiradev1s-projects.vercel.app`
- Public web alias: `https://validade-five.vercel.app`

## APK

- Path: `artifacts/validade-zero-staging-0.12.0-133.apk`
- Android package: `com.validadezero.app`
- Version: `0.12.0`
- Version code: `133`
- Size: `103150032`
- SHA256: `AF2EB5153D4D7CB9F446A48EBAAFC8CB7917E559685E25CE1575EFE5D874A83C`
- Built at: `2026-06-30 09:48:28 America/Sao_Paulo`

## Boundaries

- No USB install was performed because the device is not connected.
- No physical Loja 18 UAT was performed in this quick task.
- Existing real operational data was not exported or committed.
