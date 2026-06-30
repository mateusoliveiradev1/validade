# Android Pilot Install

The pilot uses `apps/mobile/eas.json` profiles `pilot` and `staging`, configured with internal distribution and `android.buildType: "apk"`. These profiles are for controlled direct installation, not a Play Store release and not an Expo Go substitute.

Use `staging` for real-device tests outside the development computer. A staging APK must point to a public staging API URL; `127.0.0.1` and emulator `adb reverse` only work for local development.

Approved Phase 12 public build identity:

- App version: `0.12.0`
- Android `versionCode`: `132`
- Environment: `staging`
- Approved artifact label: `uat14-staging-apk-132`
- Approved API target: `https://validade-zero-api-staging.validadezero.workers.dev`

This label is the public-safe compatibility anchor used by the mobile app and Command Center. It is not an install URL, dashboard URL, provider ticket, account identifier, token, or credential.

## Current Go/No-Go

Current install rollout is partially proven. On 2026-06-29, local APK `0.12.0` / `versionCode 132` was generated from the staging code, installed on a connected Android device, and opened without a crash in `logcat`. The public record still needs a current Maestro pass, provider push delivery/open proof, camera or approved fallback proof, and the complete physical Loja 18 UAT walkthrough.

The public release record may say only that the approved artifact label is `uat14-staging-apk-132`. It must not include the APK URL, dashboard URL, Expo account details, provider ticket, device serial, push token, Firebase file, or private links.

Official Expo references checked on 2026-06-23:

- EAS internal distribution provides a controlled install URL for approved testers: https://docs.expo.dev/build/internal-distribution/
- APK output requires an APK-producing Android build profile such as `android.buildType: "apk"`: https://docs.expo.dev/build-reference/apk/
- EAS build profiles can set environment variables with the `env` field, and EAS environment variables are available during builds: https://docs.expo.dev/build/eas-json/ and https://docs.expo.dev/eas/environment-variables/

## Staging API Deploy

1. Sign in to the approved Cloudflare account locally:
   ```powershell
   pnpm.cmd --filter @validade-zero/api exec wrangler login
   ```
2. Configure staging secrets outside Git:
   ```powershell
   pnpm.cmd --filter @validade-zero/api exec wrangler secret put NEON_DATABASE_URL --env staging
   pnpm.cmd --filter @validade-zero/api exec wrangler secret put AUTH_TOKEN_PEPPER --env staging
   pnpm.cmd --filter @validade-zero/api exec wrangler secret put AUTH_PASSWORD_PEPPER --env staging
   ```
3. Deploy the staging Worker:
   ```powershell
   pnpm.cmd --filter @validade-zero/api deploy:staging
   ```
4. Record the resulting public API URL only in the local/operator release note. Do not commit account IDs, dashboard URLs, tokens, or secrets.

## Build

1. Use an approved Expo session on the local machine. Do not place a token, account identifier, project URL, or build URL in this repository.
2. Build only from the approved Expo project for `@liiiraak1ng/validade-zero` and the Android package declared by this app. An APK from another project, package, or credential set is not provider proof.
3. Configure the public staging API URL for EAS outside Git, for example through Expo/EAS environment variables with name `EXPO_PUBLIC_API_URL`. Phase 12 also exposes public-safe build metadata through Expo `extra`: `VALIDADE_ZERO_APP_ENV`, `VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL`, `VALIDADE_ZERO_APPROVED_APP_VERSION`, `VALIDADE_ZERO_APPROVED_BUILD`, and `VALIDADE_ZERO_BUILD_REF`.
4. For remote push validation, configure the ignored Firebase Android file as an EAS `file` variable named `GOOGLE_SERVICES_JSON` in the same build environment. Do not commit the JSON file or paste its contents in logs.
   - Expo Go is not proof of Android remote push readiness.
   - Local mocks, local ignored `google-services.json`, or a sync-only APK without approved Firebase/FCM credentials are not provider proof.
   - A provider pass requires an approved native APK/device/provider run and a public-safe controlled release record.
5. Configure the privacy officer contact for the pilot build with `EXPO_PUBLIC_PRIVACY_CONTACT` in the same EAS environment (not committed to Git). When unset, the app shows a generic leadership/administration fallback.
6. Run the staging APK build from `apps/mobile`:
   ```powershell
   pnpm.cmd build:android:staging
   ```
7. Restrict distribution of the resulting build link to the approved pilot group. Treat the link as sensitive operational access information, and record only the public-safe artifact label above in repo docs.

## Local Windows APK Build

For direct device testing on Windows, use the repo script instead of running Gradle from the long workspace path. It copies the current workspace to a short build root and installs pnpm with `virtual-store-dir=.v`, avoiding Android/CMake path-length failures.

```powershell
pnpm.cmd build:android:local
```

The script writes a local-only APK to `artifacts/validade-zero-staging-0.12.0-132.apk`. `artifacts/` is ignored by Git and must not be used as a public distribution channel.

For a local-only emulator build during development, run Metro with:

```powershell
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:8787"
pnpm.cmd exec expo start --host lan --port 8081 --clear
```

## Install

1. Download the controlled APK only on a pilot-safe Android device or emulator.
2. Confirm Android permits installation from the approved source for that device.
3. Install with the Android package installer, or use `adb install path-to-pilot.apk` for an emulator/local device workflow.
4. Open the app and confirm the VZ splash, login, invitation path, Privacy Center (cards open detail screens), and session loading appear before operational work.
5. Open Command Center and confirm the device reports build compatibility as `atual` against `uat14-staging-apk-132`. `desatualizado`, `desconhecido`, or `incompativel` blocks pilot rollout even if sync still works.
6. Run the Maestro script with `pnpm.cmd test:e2e:mobile` when the device is connected.
7. Record current pass/block status in the controlled release note and in the public-safe Phase 12 UAT matrix. Do not reuse older APK/emulator PASS evidence as current proof.

## Update And Removal

- Build a new internal APK for a tested update; do not overwrite the public-repo configuration with a build URL.
- Remove the APK from a device when the pilot ends or its access is revoked.
- Revoke memberships/invitations in the product; uninstalling an APK does not revoke an account or invalidate a session by itself.

## Current Limitation

The historical local emulator path was verified with Metro and the Neon staging database. On 2026-06-26, the staging Worker was deployed from the release code at that time and an internal Android APK was generated through EAS with the Firebase `GOOGLE_SERVICES_JSON` file variable available to the builder.

UAT 14 keeps the pilot on mobile `0.12.0`, Android `versionCode` `132`, and the approved staging artifact label `uat14-staging-apk-132`. The installed Android gate still requires an approved emulator or Android device plus `pnpm.cmd test:e2e:mobile` for full proof. Physical-device notification delivery, camera permissions, installation, offline behavior, and the complete Loja 18 UAT loop require approved Android hardware/provider evidence.
