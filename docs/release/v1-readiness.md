# V1 Release Readiness

**Current decision: repository, API, web, and mobile component gates are ready for Phase 12; pilot rollout remains blocked until installed Android, provider push, camera/device, and physical Loja 18 UAT proof exist.**

UAT 14 is the current release-truth source. The app is no longer shipped as `0.0.0`: mobile reports `0.12.0`, Android `versionCode` `132`, environment `staging`, and approved artifact label `uat14-staging-apk-132`. Command Center compatibility must compare devices against that approved staging artifact, not against every later repo commit.

The Command Center now exposes five pilot-readiness surfaces together: device readiness, safe push-test timeline, build compatibility, guided `UAT Loja 18`, and `Bloqueios do piloto`. A safe sales-area verdict does not erase pilot rollout blockers; rollout stays blocked while any required external proof is missing.

No build URL, provider token, Firebase file, raw device identifier, real product/lot value, raw screenshot, photo, or dashboard link is public release evidence.

## Current Release Truth Matrix

| Gate                                   | Current status     | Evidence                                                                                                                                                                                                                                                                                                 | Release meaning                                                                                |
| -------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Phase 12 contract/API/web/mobile tests | Passed             | `pnpm.cmd --filter @validade-zero/contracts test -- command-center alerts capture` passed 11 files / 98 tests; API command-center/alerts/authorization passed 12 files / 82 tests; web command-center passed 9 files / 32 tests; mobile build-info/prepare-turn/push-alerts passed 35 files / 183 tests. | Repo behavior covers the Phase 12 readiness contracts and UI surfaces.                         |
| Command Center pilot blockers          | Passed in repo     | `Bloqueios do piloto` synthesizes no approved device, stale/missing central read, invalid token, denied camera, wrong membership, provider push failure/local-only, UAT block, product review, sync conflict/discard, and unsafe shift close with cause, next action, severity, and ownership.           | Leadership can see why rollout is blocked without treating external/provider gaps as app bugs. |
| UAT 14 build identity metadata         | Configured in repo | `apps/mobile/app.json`, package metadata, and build-info tests expose `0.12.0`, Android `versionCode` `132`, staging env, and `uat14-staging-apk-132`.                                                                                                                                                   | Enables compatibility checks, but does not prove a device installed the APK.                   |
| Command Center build compatibility     | Configured in repo | Device readiness carries `atual`, `desatualizado`, `desconhecido`, or `incompativel` against `uat14-staging-apk-132`.                                                                                                                                                                                    | Old APKs can sync while still remaining attention/blocking for rollout proof.                  |
| Evidence hygiene                       | Passed             | `pnpm.cmd security:evidence` passed for 547 tracked text files; `pnpm.cmd security:secrets` passed; `pnpm.cmd security:data` passed for 529 files.                                                                                                                                                       | Public repo evidence remains sanitized.                                                        |
| Current installed Android target       | Blocked externally | `adb devices` returned only `List of devices attached` with no device rows.                                                                                                                                                                                                                              | No current emulator/device proof exists.                                                       |
| Current Maestro installed flow         | Blocked externally | `pnpm.cmd test:e2e:mobile` returned `You have 0 devices connected, which is not enough to run 1 shards. Missing 1 device(s).` and `Not enough devices connected (0) to run the requested number of shards (1).`                                                                                          | Component tests do not substitute for installed Android proof.                                 |
| Remote push provider proof             | Blocked externally | No approved current APK/device/provider delivery proof is recorded in the public repo.                                                                                                                                                                                                                   | Push remains reminder-only and cannot prove task execution.                                    |
| Camera/device proof                    | Blocked externally | Component/no-photo fallback copy is covered; no approved physical Android camera run is recorded.                                                                                                                                                                                                        | Real camera proof requires approved Android hardware or approved fallback proof.               |
| Physical Loja 18 UAT                   | Blocked externally | No controlled physical-device record is available here for the full Loja 18 loop.                                                                                                                                                                                                                        | V1 cannot be marked ready for pilot install from repo evidence alone.                          |

## Historical Evidence

| Evidence                                   | Historical status   | Date/source                                             | Current interpretation                                                                                                |
| ------------------------------------------ | ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Phase 11 mobile polish/component flow      | Passed historically | Phase 11 release readiness record                       | Critical copy/status semantics were covered with fictional fixtures, but this is not current installed Android proof. |
| `pnpm test:e2e:mobile` emulator smoke      | Passed historically | Pre-Phase 10/11 release readiness record                | Predates the current central-truth and Phase 12 readiness contract. Keep as history only.                             |
| EAS internal APK generation                | Passed historically | 2026-06-26 local release note                           | Shows a build path existed, not current installed-device, provider, camera, or physical UAT proof.                    |
| Cloudflare staging Worker deploy           | Passed historically | 2026-06-26 local release note                           | Supports staging API availability at that time; not Android/provider proof.                                           |
| Phase 10 repository and Neon staging gates | Passed historically | `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` | Repository/staging truth passed while installed Android remained blocked.                                             |

## Go/No-Go Rule

Release remains blocked when any current gate below is missing:

- current installed Android run on an approved emulator or device;
- current `pnpm.cmd test:e2e:mobile` pass against that target;
- approved native APK/package/provider proof for remote push when push is in pilot scope;
- Command Center device compatibility showing the installed APK as `atual` against `uat14-staging-apk-132`;
- `Bloqueios do piloto` without critical or external rollout blockers;
- approved Android hardware camera/no-photo walkthrough when camera proof is in pilot scope;
- controlled physical-device UAT for install, login, prepare-turn, product/lot, terminal action, sync, push, camera, and shift close.

## Public-Safe Next Actions

```powershell
adb devices
pnpm.cmd test:e2e:mobile
pnpm.cmd security:evidence
```

For provider/camera proof, use the controlled release record. Do not commit build URLs, provider tokens, device identifiers, Firebase files, raw screenshots, real photos, real product/lot values, or private links.

See `.planning/phases/12-pilot-operations-and-device-readiness/12-UAT.md` for the current Phase 12 blocker matrix and `docs/release/android-pilot-install.md` for approved installation prerequisites.
