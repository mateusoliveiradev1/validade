# V1 Release Readiness

**Current decision: Blocked for manual provider/device verification.**

The implemented web, mobile composition, security, and performance gates are green. V1 is not marked ready because no Android emulator or device was connected for Maestro and no controlled internal APK build was verified.

## Automated Evidence

| Command                    | Result  | Recorded outcome                                                                                    |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `pnpm check`               | PASS    | Typecheck, lint, formatting, 391 tests, 207 smoke-suite tests, build, security, and budgets passed. |
| `pnpm test:e2e:web`        | PASS    | 5 authenticated Command Center/admin/privacy Playwright journeys passed.                            |
| `pnpm security`            | PASS    | Env, secret, fictional-data, evidence, UI-release, and package checks passed.                       |
| `pnpm performance:budgets` | PASS    | JavaScript 107,743 B gzip; CSS 5,990 B gzip.                                                        |
| `pnpm test:e2e:mobile`     | BLOCKED | Maestro reported `Not enough devices connected (0) to run the requested number of shards (1).`      |

## Go/No-Go Rule

Release remains blocked when any of these is true:

- an auth, privacy, security, critical-flow, or main-screen blocker exists;
- the UI gate finds provisional copy, missing privacy content, an auth bypass, missing launch assets, or unsupported Command Center data;
- the area-safe claim can be produced without central task evidence and required rechecks;
- Android Maestro, internal APK installation, or physical-device verification is unrun;
- the organization has not provided a valid LGPD channel/encarregado for real data requests.

## Manual Completion Checklist

1. Sign in to the approved Expo account locally without committing its credentials.
2. Build the Android profile with `eas build --profile pilot --platform android`.
3. Install the resulting controlled APK on a pilot-safe emulator or device.
4. Run `pnpm test:e2e:mobile` and complete the UAT scenarios in `09-UAT.md`.
5. Record pass/fail and any device/provider details in the controlled release record, never in the public repository.

See `09-VALIDATION.md` for the full validation matrix and `docs/release/android-pilot-install.md` for controlled installation steps.
