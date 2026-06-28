# Phase 12 Research: Pilot Operations and Device Readiness

**Researched:** 2026-06-28
**Status:** Ready for planning

## Executive Summary

Phase 12 should extend the existing central-truth spine instead of creating a separate pilot dashboard. The strongest path is:

1. Extend device snapshots and Command Center contracts to expose operational readiness.
2. Add a leadership-only safe push-test command and timeline.
3. Replace `0.0.0` with a phase-based pilot version and expose sanitized build truth in mobile/web.
4. Turn Loja 18 UAT into a guided checklist with public-safe evidence status.
5. Keep blockers explicit, causal, and action-oriented.

## Local Architecture Findings

### Existing anchors

- `central_device_snapshots` already records device/store prepare-turn state, central-read timestamps, pending command count, conflict count, source, and updated time.
- `PrepareTurnRequestSchema` already carries `deviceId`, `requestedAt`, `appVersion`, and local snapshot counts.
- `CommandCenterProjectionSchema` already owns the web projection boundary and can be extended with `devices`, `pushTests`, `pilotUat`, and blocker summaries.
- `TodayScreen.tsx` already handles notification permission, local-only fallback, provider-safe copy sanitization, push-open routing, and alert scheduling.
- `docs/release/v1-readiness.md`, `docs/release/android-pilot-install.md`, `docs/operations/push-alerts.md`, and `11-UAT.md` already separate repo readiness from Android/provider/camera proof.

### Current gaps

- `apps/mobile/app.json`, `apps/mobile/package.json`, and root `package.json` still use `0.0.0`.
- `central_device_snapshots` does not yet store human-readable device labels, active user, app build metadata, push permission/provider state, camera permission state, last foreground time, or readiness verdict.
- Command Center cannot yet answer per-device "Apto / Atencao / Bloqueado".
- Remote push testing exists as alert infrastructure but not as a leadership-scoped, non-task-resolving pilot test timeline.
- Build truth is not visible in mobile diagnostic/about UI or in Command Center per device.
- Loja 18 UAT remains documentation/runbook truth; it is not yet a guided panel with pass/block records.

## External Research

### Expo app/build version truth

Expo distinguishes user-facing app version from developer-facing build version. For Android, `version` maps to the visible version name and `android.versionCode` maps to the developer-facing build code. Expo recommends showing runtime app/build values through `expo-application`: `Application.nativeApplicationVersion` for the visible version and `Application.nativeBuildVersion` for the build code. Source: [Expo app version management](https://docs.expo.dev/build-reference/app-versions/) and [Expo Application](https://docs.expo.dev/versions/latest/sdk/application/).

Implication: Phase 12 should add `expo-application` and a small build-info adapter rather than scraping `app.json` in UI. `Constants.expoConfig` can still provide public config extras such as environment/API target, but native build/version should come from `Application`.

### Android APK internal distribution

Expo docs state that Android App Bundles are not directly installable and APKs are needed for direct emulator/device installs. EAS APK builds can be produced with `android.buildType: "apk"` or internal distribution profiles. Source: [Expo APK builds](https://docs.expo.dev/build-reference/apk/) and [EAS build profiles](https://docs.expo.dev/build/eas-json/).

Implication: existing `apps/mobile/eas.json` with internal APK staging profiles is aligned. The plan should preserve that path and only make artifact identity visible through sanitized metadata, never committed build URLs.

### EAS environment variables and Firebase file variables

EAS environment variables can be scoped by environment and include file values such as `google-services.json`. Expo notes that client-side embedded values should be considered public and that secret variables only protect build-time job inputs, not values embedded in the app. Source: [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).

Implication: Phase 12 should keep Firebase file variables out of Git, continue using `GOOGLE_SERVICES_FILE`/`GOOGLE_SERVICES_JSON`, and expose only operational states such as `provider_configured`, `token_registered`, or `provider_failed` to users.

### Push notification proof

Expo push setup requires user permission, an Expo push token, credentials for Android/iOS, and a device/emulator capable of push. Expo docs also note Android emulator push requires Google Play services. Source: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) and [Expo Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/).

Implication: a push test can prove registration/provider chain only when run on an approved native build/device path. It must not mutate task state or act as physical-resolution proof.

## Recommended Planning Shape

Five sequential waves map directly to the five Phase 12 requirements:

1. Device readiness model and per-device Command Center panel.
2. Safe push-test command, provider outcome timeline, and leadership-only access.
3. Pilot build metadata/versioning and mobile/web release truth.
4. Guided Loja 18 UAT checklist with sanitized evidence records.
5. Operational blocker synthesis, docs, final gates, and external-blocker honesty.

## Validation Architecture

- Contract tests: device readiness, push-test timeline, build truth, UAT state, blocker taxonomy.
- Database tests: schema/migration coverage for device metadata and push/UAT rows without raw token exposure.
- API tests: same-store RBAC for read/test/mutate operations, fail-closed stale states, push-test no task resolution.
- Mobile tests: build diagnostics, device report payload, permission/fallback copy, no secret/device-token rendering.
- Web tests: readiness panel, UAT checklist, push timeline, blocker next actions, sanitized display.
- E2E/UAT: `pnpm.cmd test:e2e:web`, `pnpm.cmd test:e2e:mobile` when Android target exists, and exact blocked output otherwise.
- Security gates: `pnpm.cmd security:evidence`, `pnpm.cmd security:secrets`, `pnpm.cmd check`.

## Planning Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Device readiness becomes raw telemetry | Operators lose the verdict and next action | Use Apto / Atencao / Bloqueado plus details below |
| Push test is mistaken for work completion | False operational safety | Keep it in separate timeline and never mutate tasks |
| Version truth leaks build URL or private identifiers | Public repo/security breach | Mask IDs, omit URLs/tokens, run evidence/security gates |
| Old APK continues to sync but lacks fields | False readiness | Mark Atencao/Bloqueado based on current UAT objective |
| UAT checklist invites fake data | Pilot proof becomes meaningless | Keep Loja 18 no-fake-product/lot rule in plan acceptance |

## Research Complete

Phase 12 can be planned without a new UI-SPEC because the scope uses existing Command Center/mobile diagnostic surfaces and is primarily operational readiness, not a visual redesign. Plans must still respect Phase 11 UI/copy/status vocabulary.
