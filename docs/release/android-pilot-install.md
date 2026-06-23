# Android Pilot Install

The pilot uses `apps/mobile/eas.json` profile `pilot`, configured with internal distribution and `android.buildType: "apk"`. It is for controlled direct installation, not a Play Store release and not an Expo Go substitute.

## Build

1. Use an approved Expo session on the local machine. Do not place a token, account identifier, project URL, or build URL in this repository.
2. Run `eas build --profile pilot --platform android` from the repository root or mobile package context accepted by the local EAS CLI.
3. Restrict distribution of the resulting build link to the approved pilot group. Treat the link as sensitive operational access information.

## Install

1. Download the controlled APK only on a pilot-safe Android device or emulator.
2. Confirm Android permits installation from the approved source for that device.
3. Install with the Android package installer, or use `adb install path-to-pilot.apk` for an emulator/local device workflow.
4. Open the app and confirm the VZ splash, login, invitation path, Privacy Center, and session loading appear before operational work.
5. Run the Maestro script with `pnpm test:e2e:mobile` when the device is connected.

## Update And Removal

- Build a new internal APK for a tested update; do not overwrite the public-repo configuration with a build URL.
- Remove the APK from a device when the pilot ends or its access is revoked.
- Revoke memberships/invitations in the product; uninstalling an APK does not revoke an account or invalidate a session by itself.

## Current Limitation

No emulator or Android device was connected during Phase 09 execution. APK creation, installation, Maestro execution, notification behavior, camera permissions, and physical-device offline behavior are blocked pending approved hardware/provider access.
