# V1 Release Readiness

**Current decision: Blocked for physical-device verification.**

The implemented web, mobile composition, security, and performance gates are green. The Android emulator path has loaded Metro, exercised staging auth, and passed the Maestro smoke. On 2026-06-26, the staging Worker was deployed from the current release code and an internal Android APK was generated through EAS with the Firebase file variable configured for remote push. V1 is not marked ready until an approved physical Android device verifies install, login, sync, notification delivery, camera permission, and offline behavior.

## Automated Evidence

| Command                    | Result | Recorded outcome                                                                                      |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `pnpm check`               | PASS   | Typecheck, lint, formatting, 427 tests, 234 smoke-suite tests, build, security, and budgets passed.   |
| `pnpm test:e2e:web`        | PASS   | 5 authenticated Command Center/admin/privacy Playwright journeys passed.                              |
| `pnpm security`            | PASS   | Env, secret, fictional-data, evidence, UI-release, and package checks passed.                         |
| `pnpm performance:budgets` | PASS   | JavaScript 116,608 B gzip; CSS 7,665 B gzip.                                                          |
| `pnpm test:e2e:mobile`     | PASS   | Maestro passed on the connected Android emulator after Metro and `adb reverse` were configured.       |
| Expo/EAS account check     | PASS   | `pnpm.cmd dlx eas-cli@latest whoami` authenticated as the approved Expo account and generated an APK. |
| Cloudflare account check   | PASS   | `pnpm.cmd --filter @validade-zero/api deploy:staging` deployed the staging Worker successfully.       |

## Go/No-Go Rule

Release remains blocked when any of these is true:

- an auth, privacy, security, critical-flow, or main-screen blocker exists;
- the UI gate finds provisional copy, missing privacy content, an auth bypass, missing launch assets, or unsupported Command Center data;
- the area-safe claim can be produced without central task evidence and required rechecks;
- internal APK installation or physical-device verification is unrun;
- the organization has not provided a valid LGPD channel/encarregado for real data requests.

## Manual Completion Checklist

1. Install the current controlled APK on a pilot-safe physical Android device.
2. Confirm the app logs in against the staging Worker and sends mobile sync to the web Command Center.
3. Confirm notification permission, remote push token registration, and at least one delivered reminder on the device.
4. Confirm camera permission and the no-photo fallback for evidence-sensitive work.
5. Run `pnpm test:e2e:mobile` where applicable and complete the UAT scenarios in `09-UAT.md`.
6. Record pass/fail and any device/provider details in the controlled release record, never in the public repository.

See `09-VALIDATION.md` for the full validation matrix and `docs/release/android-pilot-install.md` for controlled installation steps.
