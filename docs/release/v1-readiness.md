# V1 Release Readiness

**Current decision: Blocked for current installed Android, provider, camera, and physical-device proof.**

The repository/mobile polish gates are green for Phase 11, but the current installed Android gate is blocked: `adb devices` listed no connected target and `pnpm.cmd test:e2e:mobile` returned `Not enough devices connected (0)`. Older Android/Maestro and EAS evidence is preserved below as historical context; it must not be read as current proof for the Phase 10/11 central-truth flow.

Phase 12 adds public-safe installed-build truth for the next pilot proof cycle: mobile `0.12.0`, Android `versionCode` `120`, environment `staging`, and approved artifact label `phase-12-staging-apk-120`. Command Center compatibility must compare devices against that approved staging artifact, not against every later repo commit. No build URL, provider token, Firebase file, raw device identifier, or dashboard link is public release evidence.

## Current Release Truth Matrix

| Gate                                  | Current status                              | Evidence                                                                                                                                 | Release meaning                                                                         |
| ------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Phase 11 mobile polish/component flow | Passed                                      | `pnpm.cmd --filter @validade-zero/mobile test mobile-release-journeys today-screen offline-sync shift-close` passed, 5 files / 39 tests. | Critical copy/status semantics are covered with fictional fixtures.                     |
| Phase 12 build identity metadata      | Configured in repo                          | `apps/mobile/app.json` and package metadata use `0.12.0`; Android `versionCode` is `120`; approved artifact label is public-safe.        | Enables compatibility checks but does not prove a device installed the APK.             |
| Command Center build compatibility    | Configured in repo                          | Device readiness carries `atual`, `desatualizado`, `desconhecido`, or `incompativel` against `phase-12-staging-apk-120`.                 | Old APKs can sync while still remaining attention/blocking for rollout proof.           |
| Evidence hygiene                      | Passed                                      | `pnpm.cmd security:evidence` passed after Phase 11 UAT/docs updates.                                                                     | Public repo evidence remains sanitized.                                                 |
| Current installed Android target      | Blocked                                     | `adb devices` showed no connected target.                                                                                                | No current emulator/device proof exists.                                                |
| Current Maestro installed flow        | Blocked                                     | `pnpm.cmd test:e2e:mobile` -> `Not enough devices connected (0) to run the requested number of shards (1).`                              | Component tests do not substitute for installed Android proof.                          |
| Screenshot/UAT record                 | Blocked for raw screenshots; names recorded | `.maestro/v1-readiness.yaml` records `phase11-*` checkpoint names; `11-UAT.md` records blocked installed status.                         | Raw screenshots stay local until an approved target exists and evidence is allowlisted. |
| Remote push provider proof            | Externally blocked                          | No approved current APK/device/provider delivery proof is recorded in the public repo.                                                   | Push remains reminder-only and cannot prove task execution.                             |
| Camera/device proof                   | Externally blocked                          | Component/no-photo fallback copy is covered; no approved physical Android camera run is recorded.                                        | Real camera proof requires approved Android hardware.                                   |
| Physical-device pilot UAT             | Externally blocked                          | No current controlled physical-device record is available here.                                                                          | V1 cannot be marked ready for pilot install from repo evidence alone.                   |

## Historical Evidence

| Evidence                                   | Historical status   | Date/source                                             | Current interpretation                                                                                 |
| ------------------------------------------ | ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm test:e2e:mobile` emulator smoke      | Passed historically | Pre-Phase 10/11 release readiness record                | Predates the current central-truth and Phase 11 critical-flow evidence contract. Keep as history only. |
| EAS internal APK generation                | Passed historically | 2026-06-26 local release note                           | Shows a build path existed, not current installed-device, provider, camera, or physical UAT proof.     |
| Cloudflare staging Worker deploy           | Passed historically | 2026-06-26 local release note                           | Supports staging API availability at that time; not Android/provider proof.                            |
| Phase 10 repository and Neon staging gates | Passed              | `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` | Repository/staging truth passed while installed Android remained blocked.                              |

## Go/No-Go Rule

Release remains blocked when any current gate below is missing:

- current installed Android run on an approved emulator or device;
- current `pnpm.cmd test:e2e:mobile` pass against that target;
- approved native APK/package/provider proof for remote push when push is in pilot scope;
- Command Center device compatibility showing the installed APK as `atual` against `phase-12-staging-apk-120`;
- approved Android hardware camera/no-photo walkthrough when camera proof is in pilot scope;
- controlled physical-device UAT for install, login, prepare-turn, product/lot, terminal action, sync, push, camera, and shift close.

## Public-Safe Next Actions

```powershell
adb devices
pnpm.cmd test:e2e:mobile
pnpm.cmd security:evidence
```

For provider/camera proof, use the controlled release record. Do not commit build URLs, provider tokens, device identifiers, Firebase files, raw screenshots, or real photos.

See `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-UAT.md` for the current Phase 11 blocker matrix and `docs/release/android-pilot-install.md` for approved installation prerequisites.
