---
status: complete
quick_id: 260630-bw1
date: 2026-06-30
---

# Quick Task 260630-bw1 Summary

**Task:** Gerar APK local Phase 15 sem USB
**Completed:** 2026-06-30
**Status:** Complete with device install not run

## Result

Generated a local Android staging APK from the Phase 15-complete repository state:

- APK: `C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-132.apk`
- Package: `com.validadezero.app`
- Version: `0.12.0`
- Android versionCode: `132`
- Approved artifact label in app config: `uat14-staging-apk-132`
- Source commit: `0845f70c`
- Size: `103148100` bytes
- SHA256: `6D5DBED81B64AC9347860F0ADCF9F3A5E02B368023862930D09D7992E94CA509`

## Commands

| Command | Result |
|---------|--------|
| `cmd /c gsd-sdk.cmd query init.quick "Gerar APK local Phase 15 sem USB"` | Pass: quick task `260630-bw1` initialized |
| `cmd /c pnpm.cmd build:android:local` | Pass: local release APK produced |
| `Get-FileHash -Algorithm SHA256 artifacts\validade-zero-staging-0.12.0-132.apk` | Pass: checksum recorded |
| `aapt dump badging artifacts\validade-zero-staging-0.12.0-132.apk` | Pass: package/version metadata confirmed |
| `apksigner verify --print-certs artifacts\validade-zero-staging-0.12.0-132.apk` | Pass: APK signature verified |
| `cmd /c pnpm.cmd security:evidence` | Pass: 427 tracked text files checked |

## Build Notes

- The local build script copied the repo to short path `C:\vzb`, installed dependencies into an isolated virtual store, and ran `gradlew.bat :app:assembleRelease`.
- Android SDK emitted a non-blocking SDK XML version warning and Java deprecation warnings from dependencies.
- `apksigner` reports the APK is signed with the Android debug certificate. This is acceptable for local install/testing, not for public distribution or Play Store release.
- The prior local `0.12.0-132` APK in `artifacts` was overwritten with a new APK built after Phase 15 completion.

## Boundaries

Not run in this session:

- USB install or app launch on an Android device.
- Maestro/mobile E2E on a connected device.
- Real remote push delivery/open proof.
- Real camera/evidence capture proof.
- Second-device convergence proof.
- Physical Loja 18 UAT.
- Web or API deploy.

## Next Step

When an Android device is available, install the APK and validate login/Loja 18 flows:

```powershell
adb install -r "C:\Users\Liiiraa\Documents\estudos\validade\artifacts\validade-zero-staging-0.12.0-132.apk"
```

Before Phase 16 physical validation, deploy the web Command Center if the Loja 18 run will use the hosted web surface. API deploy is not required by Phase 15 unless the target environment has other pending backend changes outside this quick task.
