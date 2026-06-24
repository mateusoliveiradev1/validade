# Android Pilot Install

The pilot uses `apps/mobile/eas.json` profiles `pilot` and `staging`, configured with internal distribution and `android.buildType: "apk"`. These profiles are for controlled direct installation, not a Play Store release and not an Expo Go substitute.

Use `staging` for real-device tests outside the development computer. A staging APK must point to a public staging API URL; `127.0.0.1` and emulator `adb reverse` only work for local development.

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
2. Configure the public staging API URL for EAS outside Git, for example through Expo/EAS environment variables with name `EXPO_PUBLIC_API_URL`.
3. Configure the privacy officer contact for the pilot build with `EXPO_PUBLIC_PRIVACY_CONTACT` in the same EAS environment (not committed to Git). When unset, the app shows a generic leadership/administration fallback.
4. Run the staging APK build from `apps/mobile`:
   ```powershell
   pnpm.cmd build:android:staging
   ```
4. Restrict distribution of the resulting build link to the approved pilot group. Treat the link as sensitive operational access information.

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
5. Run the Maestro script with `pnpm test:e2e:mobile` when the device is connected.

## Update And Removal

- Build a new internal APK for a tested update; do not overwrite the public-repo configuration with a build URL.
- Remove the APK from a device when the pilot ends or its access is revoked.
- Revoke memberships/invitations in the product; uninstalling an APK does not revoke an account or invalidate a session by itself.

## Current Limitation

The local emulator path has been verified with Metro and the Neon staging database. Cloud APK creation and public staging API deployment are still blocked until the machine is authenticated with the approved Expo and Cloudflare accounts. Physical-device notification behavior, camera permissions, and offline behavior still require an approved real Android device.
