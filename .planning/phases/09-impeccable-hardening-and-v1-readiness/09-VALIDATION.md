# Phase 09 Validation Matrix

**Status: BLOCKED FOR MANUAL PROVIDER/DEVICE VERIFICATION**

| Area | Status | Evidence | Remaining action |
|---|---|---|
| Mobile auth and first access | PASS | Auth-gate and release-composition tests | Verify on an Android build with a pilot-safe account. |
| Hoje, task, markdown, and evidence truth | PASS | Mobile component suites and `pnpm check` | Verify physical corridor use on a pilot-safe device. |
| Offline, sync, and shift close | PASS | Existing sync/shift-close suites and release check | Run unsafe handoff and safe close on an emulator/device. |
| Privacy Center and LGPD request path | PASS | Seven-section scanner, mobile/web tests, web E2E | Configure the organization channel before accepting real requests. |
| Web auth shell and Command Center | PASS | Playwright 5/5, API/web contract tests, visual review at 1280 px and 390 px | Supply a central task projection before relying on a safe verdict. |
| Web admin, invites, audit, and evidence access | PASS | API/web tests and Playwright revocation journey | Verify against the configured pilot issuer and store policy. |
| Accessibility and copy | PASS | Named controls, keyboard E2E focus, mobile accessibility suites, UI scanner | Complete device screen-reader and large-font walkthrough. |
| Security and public repo safety | PASS | `pnpm security` passed | Configure production provider policies outside the repository. |
| Performance | PASS | `pnpm performance:budgets`: 107,743 B JS gzip, 5,990 B CSS gzip | Measure physical-device startup after an APK exists. |
| Web build and E2E | PASS | `pnpm check` and `pnpm test:e2e:web` passed | None. |
| Android Maestro and APK | BLOCKED | `pnpm test:e2e:mobile` found 0 connected devices | Connect an emulator/device and run Maestro; build/install the internal APK. |

## Release Blockers

No auth, privacy, security, critical-flow, or main-screen blocker is accepted as residual risk. The remaining blockers are external validation work:

1. A connected Android emulator or pilot-safe device is required for the Maestro v1 script.
2. An approved Expo account/session is required to create and inspect the `pilot` internal APK.
3. The organization must configure the real LGPD channel/encarregado before collecting a real rights request.
4. The Command Center must receive a server-owned task projection before anyone interprets a `safe` verdict. Until then it fails closed with `needs_review`.
