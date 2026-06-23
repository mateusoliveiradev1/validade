# V1 Release Readiness

**Current decision: Blocked for provider login, cloud APK, and physical-device verification.**

The implemented web, mobile composition, security, and performance gates are green. The Android emulator path has now loaded Metro, exercised staging auth, and passed the Maestro smoke. V1 is not marked ready because the approved Expo and Cloudflare accounts are not authenticated on this machine for a controlled cloud APK/public staging deploy, and no physical Android device has verified notification, camera, install, and offline behavior.

## Automated Evidence

| Command                    | Result  | Recorded outcome                                                                                             |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm check`               | PASS    | Typecheck, lint, formatting, 391 tests, 207 smoke-suite tests, build, security, and budgets passed.          |
| `pnpm test:e2e:web`        | PASS    | 5 authenticated Command Center/admin/privacy Playwright journeys passed.                                     |
| `pnpm security`            | PASS    | Env, secret, fictional-data, evidence, UI-release, and package checks passed.                                |
| `pnpm performance:budgets` | PASS    | JavaScript 107,743 B gzip; CSS 5,990 B gzip.                                                                 |
| `pnpm test:e2e:mobile`     | PASS    | Maestro passed on the connected Android emulator after Metro and `adb reverse` were configured.              |
| Expo/EAS account check     | BLOCKED | `pnpm.cmd dlx eas-cli@latest whoami` returned `Not logged in`.                                               |
| Cloudflare account check   | BLOCKED | `pnpm.cmd --filter @validade-zero/api exec wrangler whoami` reported the local machine is not authenticated. |

## Go/No-Go Rule

Release remains blocked when any of these is true:

- an auth, privacy, security, critical-flow, or main-screen blocker exists;
- the UI gate finds provisional copy, missing privacy content, an auth bypass, missing launch assets, or unsupported Command Center data;
- the area-safe claim can be produced without central task evidence and required rechecks;
- controlled cloud APK, public staging API deployment, internal APK installation, or physical-device verification is unrun;
- the organization has not provided a valid LGPD channel/encarregado for real data requests.

## Manual Completion Checklist

1. Sign in to the approved Cloudflare account locally and deploy the staging Worker with secrets stored outside Git.
2. Sign in to the approved Expo account locally without committing its credentials.
3. Configure `EXPO_PUBLIC_API_URL` in EAS/Expo for the public staging API URL.
4. Build the Android profile with `pnpm.cmd --filter @validade-zero/mobile build:android:staging`.
5. Install the resulting controlled APK on a pilot-safe physical Android device.
6. Run `pnpm test:e2e:mobile` where applicable and complete the UAT scenarios in `09-UAT.md`.
7. Record pass/fail and any device/provider details in the controlled release record, never in the public repository.

See `09-VALIDATION.md` for the full validation matrix and `docs/release/android-pilot-install.md` for controlled installation steps.
