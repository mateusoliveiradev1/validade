---
phase: 14
slug: mobile-ajustes-and-device-controls
status: complete
created: 2026-06-29
---

# Phase 14 - Research

## Research Question

What do we need to know to plan a mobile Ajustes area that owns account/store context, push and reminders, sync health, update/build truth, diagnostics, privacy, and sign-out without weakening Hoje, safe-close, or rollout-proof boundaries?

## Executive Summary

The safest implementation is a mobile presentation and control reorganization over existing local sources: `AuthGate` already owns authenticated session identity, privacy, and logout; `CaptureApp` already owns route stack and Android back behavior; `TodayScreen` already knows how to read push, sync, prepare-turn, and build state; `offline-sync-ui.tsx` already contains conflict review and destructive discard; `build-info.ts` already carries public-safe installed versus approved APK truth.

Phase 14 should therefore avoid new backend endpoints, new database schema, new store-switching authority, and new provider-global push claims. The useful work is to create an Ajustes route/screen that can be opened from the authenticated mobile shell, preserve the current operational route stack, and reuse/extract existing push/sync/build/account controls with stronger user-facing boundaries.

Recommended sequential plan:

1. Add the Ajustes route foundation and session-bar entry while preserving the `CaptureApp` route stack.
2. Move push/reminder management and this-device safe test into Ajustes with diagnostic-only copy.
3. Move sync health, retry, conflict review, and safe-close blocker explanation into Ajustes.
4. Add build/update truth, account/store, privacy, and sign-out confirmation.
5. Add route-level tests and final mobile/repository gates.

## Relevant Existing Truth

### Authenticated Shell

`apps/mobile/src/auth/AuthGate.tsx` currently:

- Reads and accepts the authenticated session.
- Renders the authenticated shell and session bar.
- Shows store, actor, role, `Privacidade`, and `Sair`.
- Owns the privacy screen and logout call.
- Blocks no-permission and account-disabled states before the operational child opens.

Conclusion: Ajustes should consolidate existing `Privacidade` and `Sair` actions instead of adding more session-bar clutter. If implementation moves route handling into `CaptureApp`, AuthGate must still keep server-owned session checks and no-permission gates.

### Operational Route Stack

`apps/mobile/src/capture/CaptureApp.tsx` currently:

- Uses an internal `routeStack` with routes such as `today`, `discovery`, `product-form`, `detail`, `task-resolution`, `shift-close`, and `barcode`.
- Handles Android back by popping the route stack.
- Handles push-open routing without replacing the whole app shell.
- Passes `TodayScreen` the repository, alert channel, sync engine, prepare-turn cache/source, and build info.

Conclusion: Ajustes should become part of this route discipline or otherwise keep `CaptureApp` mounted while Ajustes is visible. Opening Ajustes must not reset task, lot, shift close, product, or recent-lot state.

### Push And Reminder Controls

`apps/mobile/src/capture/TodayScreen.tsx` currently:

- Reads `repository.loadAlertChannelState()`.
- Activates push with `alertChannel.requestPermission()` and `alertChannel.getExpoPushToken()`.
- Registers the device through `repository.registerAlertDevice()`.
- Falls back to `local_only` when the native build cannot return a remote token.
- Schedules local task notifications through `alertChannel.scheduleTaskNotification()`.
- Sanitizes native/provider failure strings through `operatorSafePushFeedback()`.

`packages/contracts/src/alerts.ts` also has safe push-test schemas, but the mobile app does not yet expose a this-device safe test surface.

Conclusion: Ajustes can reuse the existing activation/register logic. A safe test on mobile must be scoped to this device path only: permission, local scheduling or remote-token availability, and optional opening signal. It must not claim provider-global proof, task execution, safe-close, or physical execution.

### Sync Health And Conflict Recovery

`TodayScreen` and `offline-sync-ui.tsx` currently:

- Load `repository.loadOfflineCacheStatus()` and `repository.listSyncQueue()`.
- Run manual sync through `syncEngine.syncPendingCommands({ manual: true })`.
- Load a specific conflict with `repository.loadSyncConflict(conflictId)`.
- Resolve conflicts through `repository.resolveSyncConflict()`.
- Require an explicit discard reason in `SyncConflictPanel`.
- Render conflicts before pending commands.

`CaptureApp` also carries `prepareTurnCacheStatus` and `prepareTurnSource`, separating central-read truth from local cache.

Conclusion: Ajustes should reuse `SyncQueueSummary` and `SyncConflictPanel`, but add a higher-level readiness statement that separates last central read from last sync/send and says whether safe close is blocked. Critical conflict, critical pending command, missing/stale central read, and local-cache-only operation are safe-close blockers.

### Build And Update Truth

`apps/mobile/src/build-info.ts` already:

- Reads installed app version/build and package id from native Expo metadata when available.
- Falls back to Expo config.
- Exposes approved artifact label, approved app version, approved build, environment, API target, package id, and `buildCompatibility`.
- Masks or rejects private URL/token-like values.

`TodayScreen` currently renders `PilotBuildInfoCard`.

Conclusion: Ajustes should own the detailed build/update card for Phase 14. It should show public-safe installed versus approved truth and a manual update next step. It should not promise automatic updates for sideloaded APKs.

### Account, Privacy, And Sign-Out

`AuthGate` already:

- Has the `SessionContextResponse` with actor, store, active role, account status, session expiry, actions, and privacy center URL.
- Opens `PrivacyCenterScreen`.
- Logs out through `authClient.logout()`.

Conclusion: Phase 14 should add read-only account/store rows and route privacy through existing `PrivacyCenterScreen`. Sign-out must require confirmation and warn that pending local commands/conflicts remain pending and no task is resolved.

## Implementation Strategy

### Recommended New Files

- `apps/mobile/src/capture/AjustesScreen.tsx` - The mobile Ajustes screen and section cards.
- `apps/mobile/src/capture/ajustes-readiness.ts` - Pure helpers for readiness verdict, safe-close blocker explanation, push/build labels, and public-safe copy.
- `apps/mobile/src/capture/ajustes-screen.test.tsx` - Component tests for section copy and controls.

The executor may choose a nearby name such as `SettingsScreen`, but the visible screen title must remain `Ajustes`.

### Routing Strategy

Add a route to the mobile route stack:

- `{ name: "settings" }` or `{ name: "ajustes" }`.

Opening Ajustes should push this route rather than reset to Hoje. Returning from Ajustes or using Android back should pop to the exact previous route. If AuthGate keeps the session bar entry, wire it to the CaptureApp settings opener without unmounting CaptureApp.

### UI Strategy

Use existing mobile primitives:

- `ScreenHeader`
- `StatusNotice`
- `PrimaryAction`
- `SecondaryAction`
- `DestructiveAction`
- `Field`
- `SelectionRow`
- `capture-theme.ts`
- `mobile-status.ts`
- `offline-sync-ui.tsx`

Do not add icon libraries, shadcn, registry blocks, debug-table styling, charts, gradients, or marketing layout.

### Data Strategy

Ajustes should read these inputs:

- `SessionContextResponse` for account/store/role/session.
- `MobileBuildInfo` for installed/approved build truth.
- `CaptureRepository.loadPrepareTurnCacheStatus` or CaptureApp's existing prepare-turn cache state.
- `CaptureRepository.loadOfflineCacheStatus`.
- `CaptureRepository.listSyncQueue`.
- `CaptureRepository.loadAlertChannelState`.
- `PushAlertChannel.getPermissionState`, `requestPermission`, `getExpoPushToken`, and local scheduling capability.
- `SyncEngine.syncPendingCommands({ manual: true })` for retry.
- Existing privacy and logout callbacks from AuthGate/auth client.

Avoid adding schema files or migrations.

## Validation Architecture

Use focused mobile tests first and the full repository gate last:

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test`
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck`
- `cmd /c pnpm.cmd check`

Add tests for both presence and absence:

- Session bar has `Ajustes` with accessibility label `Abrir Ajustes do aparelho`.
- Opening Ajustes from Hoje or task resolution preserves the previous route after back.
- Push actions register only this device and preserve copy that tasks remain active in Hoje.
- Safe push test copy says it proves only this device path.
- Sync card separates `Ultima leitura central` and `Ultima sincronizacao enviada`.
- Conflict discard requires `Motivo para descartar a acao offline`.
- Safe-close blocker text appears for critical conflict, critical pending command, local-cache-only, stale central read, or missing central read.
- Build card shows installed version/build, approved version/build, artifact label, environment, API target, and package id.
- Build/update UI does not contain private URL, token, password, raw device id, or build URL patterns.
- Account/store are read-only and no manual store switcher exists.
- Sign-out confirmation warns pending work remains pending.

## Security And Privacy Notes

- Do not render Expo push tokens, provider tickets, private build links, raw device ids, raw photos, real product names, or private URLs.
- Do not add manual store switching in Phase 14.
- Do not treat push activation, push test, sync transport, or app foreground as physical execution proof.
- Do not allow sign-out to clear outbox state or resolve tasks.
- Keep the public repo evidence sanitized and fictitious.

## Research Complete

