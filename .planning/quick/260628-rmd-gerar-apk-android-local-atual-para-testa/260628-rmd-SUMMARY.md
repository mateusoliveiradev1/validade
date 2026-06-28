---
status: complete
quick_id: 260628-rmd
date: 2026-06-28
---

# Quick Task 260628-rmd Summary

**Task:** Gerar APK Android local atual para testar login e sync da Loja 18 sem validar push remoto
**Completed:** 2026-06-28
**Status:** Complete with device install not run

## Result

Generated a current local Android release APK for staging login/sync testing:

- APK: `dist/android/validade-zero-local-staging-0.12.0-120-40bdd3de.apk`
- Package: `com.validadezero.app`
- Version: `0.12.0`
- Android versionCode: `120`
- Source commit: `40bdd3de`
- SHA256: `9DE1A3BA08C3C689A82C0F91EAA0B96971CA97C67EDFC8F3569D3D0F9EFF8E48`

## Build Notes

- Direct Gradle release/debug builds in the main checkout failed on Windows path-length/CMake/Ninja issues.
- EAS cloud build was unavailable because the Expo Free Android quota is exhausted until July 1, 2026.
- A short worktree at `C:\z` plus `pnpm --config.node-linker=hoisted` allowed the local release build to pass.
- Push provider readiness was not claimed. The APK is for login, local app flow, staging API sync, camera/fallback, and Command Center compatibility checks.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn push-alerts` passed: 35 files / 183 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` passed.
- `expo prebuild --platform android --clean --no-install` regenerated Android with `versionName "0.12.0"` and `versionCode 120`.
- `gradlew.bat assembleRelease` passed in `C:\z\apps\mobile\android` with hoisted dependencies.
- `aapt dump badging` confirmed `versionCode='120'`, `versionName='0.12.0'`, and package `com.validadezero.app`.
- `apksigner verify --print-certs` passed.
- Extracted `assets/index.android.bundle` contains:
  - `https://validade-zero-api-staging.validadezero.workers.dev`
  - `0.12.0`
  - `phase-12-staging-apk-120`
- `adb devices` found no connected Android device, so installation/login was not run in this session.

## Next Step

Install the APK on an Android device and test login against Loja 18 staging. If a device is connected with USB debugging enabled, use:

```powershell
adb install -r "C:\Users\Liiiraa\Documents\estudos\validade\dist\android\validade-zero-local-staging-0.12.0-120-40bdd3de.apk"
```
