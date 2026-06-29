---
phase: 14
slug: mobile-ajustes-and-device-controls
status: complete
created: 2026-06-29
---

# Phase 14 - Pattern Map

## Purpose

Map current mobile implementation patterns before planning Ajustes. This artifact tells executors which files to read and which conventions to preserve.

## Existing Source Patterns

### Authenticated Session Bar

Source: `apps/mobile/src/auth/AuthGate.tsx`

- `AuthGate` gates active sessions, no-permission states, account blockers, privacy center, and logout.
- The authenticated shell currently renders a `sessionBar` with store name, role label, `Privacidade`, and `Sair`.
- `roleLabel()` maps `admin`, `lead`, and collaborator roles to user-facing labels.

Pattern to preserve:

- Keep server-owned session context as the authority.
- Replace scattered `Privacidade`/`Sair` quick actions with a single `Ajustes` entry, not extra buttons.
- Keep no-permission and blocked-account gates before the operational app opens.

### Mobile Route Stack

Source: `apps/mobile/src/capture/CaptureApp.tsx`

- `CaptureRoute` is a local discriminated union.
- `routeStack` preserves nested operational flows.
- `navigate(route)` pushes, `replace(route)` swaps current, `goBack()` pops, and Android back uses `goBack()`.
- Push-open routing can set `routeStack` to task resolution without replacing the authenticated app.

Pattern to preserve:

- Add Ajustes to the existing route union.
- Return from Ajustes by popping the route stack.
- Do not reset task/detail/shift-close/product state when Ajustes opens.

### Shared UI Primitives

Sources:

- `apps/mobile/src/capture/capture-ui.tsx`
- `apps/mobile/src/capture/capture-theme.ts`
- `apps/mobile/src/capture/mobile-status.ts`

Patterns:

- Use `ScreenHeader`, `StatusNotice`, `PrimaryAction`, `SecondaryAction`, `DestructiveAction`, `Field`, and `SelectionRow`.
- Use `captureColors`, `captureRadii`, and `captureSpacing`.
- Status semantics are represented by labels and copy, not color alone.
- `StatusNotice` warning/critical states already set alert-like accessibility behavior.

Pattern to preserve:

- Keep visual language calm and operational.
- Use status labels `Apto`, `Atencao`, and `Bloqueado` in Ajustes helper logic.
- Do not add icon-only controls or a new UI package.

### Push Controls

Sources:

- `apps/mobile/src/capture/TodayScreen.tsx`
- `apps/mobile/src/capture/alert-channel.ts`
- `apps/mobile/src/capture/push-alerts.test.tsx`

Patterns:

- `activateAlerts()` calls `requestPermission`, then `getExpoPushToken`, then `repository.registerAlertDevice`.
- `local_only` is used when permission works but remote token/provider path is unavailable.
- `operatorSafePushFeedback()` strips technical provider/Firebase details from operator copy.
- Fake push channel supports requested permission count, scheduled notifications, and emitted notification responses.

Pattern to preserve:

- Extract push logic rather than duplicating weaker behavior.
- Register only this device.
- Do not expose token/provider error details.
- This-device test is diagnostic only.

### Sync Controls

Sources:

- `apps/mobile/src/capture/TodayScreen.tsx`
- `apps/mobile/src/capture/offline-sync-ui.tsx`
- `apps/mobile/src/capture/offline-sync-ui.test.tsx`

Patterns:

- `refreshSyncState()` loads offline cache and sync queue.
- `manualSync()` calls `syncEngine.syncPendingCommands({ manual: true })`.
- `SyncQueueSummary` renders conflict rows before pending rows.
- `SyncConflictPanel` requires a discard reason before `discard_offline_action`.

Pattern to preserve:

- Reuse `SyncQueueSummary` and `SyncConflictPanel`.
- Add higher-level readiness copy around central read versus send/sync state.
- Critical conflict or critical pending command must block safe-close language.

### Build Truth

Sources:

- `apps/mobile/src/build-info.ts`
- `apps/mobile/src/build-info.test.ts`
- `apps/mobile/src/capture/TodayScreen.tsx`

Patterns:

- `readMobileBuildInfo()` returns public-safe version/build/environment/API/package fields.
- `resolvePilotBuildCompatibility()` classifies `atual`, `desatualizado`, `desconhecido`, and `incompativel`.
- Long/private labels are masked or rejected.
- Today currently has `PilotBuildInfoCard` with installed and approved fields.

Pattern to preserve:

- Move or share the build card with Ajustes.
- Keep artifact label public-safe.
- Do not render APK URLs, EAS URLs, tokens, or raw private refs.

### Test Style

Sources:

- `apps/mobile/src/auth/auth-flow.test.tsx`
- `apps/mobile/src/capture/today-screen.test.tsx`
- `apps/mobile/src/capture/push-alerts.test.tsx`
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx`

Patterns:

- Tests mock `react-native` host components.
- Actions are found by `accessibilityLabel`.
- Text is often asserted through `JSON.stringify(tree.toJSON())`.
- Repository fakes implement only the methods needed by the screen under test.

Pattern to preserve:

- Add focused component tests next to the new Ajustes screen.
- Reuse existing fake repository and push channel patterns.
- Assert absence of unsafe/sensitive text.

## Suggested New Files

| File | Role | Closest Existing Pattern |
|------|------|--------------------------|
| `apps/mobile/src/capture/AjustesScreen.tsx` | Mobile settings/readiness screen | `TodayScreen.tsx`, `offline-sync-ui.tsx`, `capture-ui.tsx` |
| `apps/mobile/src/capture/ajustes-readiness.ts` | Pure status/build/sync/push helper labels | `mobile-status.ts`, helpers inside `TodayScreen.tsx` |
| `apps/mobile/src/capture/ajustes-screen.test.tsx` | Tests for Ajustes content and actions | `today-screen.test.tsx`, `offline-sync-ui.test.tsx`, `push-alerts.test.tsx` |

## Anti-Patterns To Avoid

- Do not create a manual store switcher.
- Do not hide active tasks when push is disabled.
- Do not make local sync transport sound like central business resolution.
- Do not make push/opened notification sound like physical execution.
- Do not promise automatic APK update for sideloaded local APKs.
- Do not add a new backend route or migration unless the executor finds an existing contract gap that cannot be solved locally.
- Do not store or render tokens, private URLs, build URLs, raw device ids, photos, or real product evidence in committed fixtures.

## Pattern Mapping Complete

