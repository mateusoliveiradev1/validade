---
quick_id: 260630-cur
status: complete
completed: 2026-06-30
---

# Quick Task 260630-cur Summary

## Outcome

Fixed the mobile manual sync path that could show command queue `0` while a locally registered lot still had not been sent to the central API.

## Root Cause

The app has two pending paths:

- Offline command queue, handled by `syncPendingCommands`.
- Pending central lots, handled by `repository.syncPendingCentralLots`.

Manual sync in Hoje and Ajustes only called the command queue path. If the automatic sync effect had already run before the lot was registered, the next manual sync could correctly report command queue `0` while leaving the pending central lot unsent.

## Changes

- Hoje manual sync now sends pending central lots and refreshes Today when one is replayed.
- Ajustes manual sync now sends pending central lots even when the command queue is empty.
- Added regression coverage for both Hoje and Ajustes.
- Rebuilt the local staging APK with the fix.

## Verification

- `pnpm --filter @validade-zero/mobile test -- --run apps/mobile/src/capture/today-screen.test.tsx apps/mobile/src/capture/ajustes-screen.test.tsx`
  - 36 files passed
  - 236 tests passed
- `pnpm --filter @validade-zero/mobile typecheck`
  - passed
- APK metadata checked with `aapt`:
  - package: `com.validadezero.app`
  - versionName: `0.12.0`
  - versionCode: `132`
  - label: `Validade Zero`
- APK signature checked with `apksigner verify --print-certs`.

## APK

- Path: `artifacts/validade-zero-staging-0.12.0-132.apk`
- Size: `103149196`
- SHA256: `6059E4350A67E39D268FAAD66AA16092ABFF2728C68323E72838D67FE236E959`
- Built at: `2026-06-30 09:16:39 America/Sao_Paulo`

## Boundaries

- No USB install was performed because the device is not connected.
- No physical store UAT was performed in this quick task.
- API and web staging deploys were already current; this fix was mobile-only, so no API/web redeploy was needed.
