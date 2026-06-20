# Phase 05: Push and Escalation - Research

**Researched:** 2026-06-20
**Status:** Ready for planning
**Mode:** MVP / local-first alert channel with push seams

## RESEARCH COMPLETE

Phase 5 should add a typed alert and escalation layer on top of the existing "Hoje" task workflow. The safest MVP shape is not a broad notification center, analytics dashboard, complete RBAC model, or full remote task-sync platform. It is a narrow reminder engine that keeps each persistent task as the source of truth, records alert cadence and escalation state, integrates Expo notification permissions behind an adapter, shows channel failures in "Hoje", and routes notification taps back to the current task or to a stale-task fallback.

Because the current repo is still local-first and has no task sync, auth, store/user database, or durable remote task table, the plan must be honest about what Phase 5 can prove. It can implement local scheduling/state, Expo Push token registration seams, server/cron/provider adapters with contract tests, and UI behavior. It must not claim that remote multi-device delivery is a guarantee until later sync/auth/audit phases provide durable server-side task state and roles.

## Source Inputs

- `.planning/ROADMAP.md` assigns RSK-05, PSH-01, PSH-02, and PSH-05 to Phase 5.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` locks D-01 through D-16 for cadence, escalation, channel failure, privacy-safe copy, and "Abrir tarefa" only.
- `.planning/phases/05-push-and-escalation/05-UI-SPEC.md` locks the mobile UI contract for permission education, channel notices, alert status rows, leadership receipt, push-tap fallback, and Portuguese-BR copy.
- Phase 4 code already provides `TodayTaskRecord`, `CaptureRepository`, `refreshTodayTasks`, `resolveTodayTask`, `loadTodayTask`, `TodayScreen`, `CaptureApp`, and `today-copy.ts`.
- Expo docs currently list `expo-notifications` bundled at `~56.0.18`; remote push on Android is unavailable in Expo Go from SDK 53 and requires a development build, while local notifications remain available in Expo Go. Source: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo push setup currently requires user permission and an Expo push token; setup docs recommend `expo-notifications` plus `expo-constants` and config plugin wiring. Source: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo push sending docs require server-side send logic, retry/backoff for transient failures, tickets, receipts, `DeviceNotRegistered` handling, and explicitly say delivery is not guaranteed by a successful receipt. Source: https://docs.expo.dev/push-notifications/sending-notifications/
- Cloudflare Cron docs use a Worker `scheduled()` handler, UTC cron expressions, Wrangler configuration, local scheduled testing routes, and warn trigger changes can take up to 15 minutes to propagate. Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/

## Existing Implementation Findings

### Reusable boundaries

- `packages/domain/src/tasks.ts` defines task severity, due buckets, required resolutions, priority, and compatibility without importing UI, SQLite, or provider SDKs.
- `packages/contracts/src/tasks.ts` validates `TodayTaskRecord`, `TaskResolutionCommand`, `TaskRefreshMetadata`, and evidence placeholder/no-photo metadata.
- `apps/mobile/src/capture/repository.ts` already centralizes repository ports and parsing helpers. Phase 5 should extend this port with alert state operations instead of letting UI own alert logic.
- `apps/mobile/src/capture/memory-repository.ts` mirrors repository behavior with deterministic `clock` and `createId`, making it the best first test target for cadence, retry, and escalation state.
- `apps/mobile/src/capture/sqlite-repository.ts` has idempotent local migrations, task tables, useful indexes, transaction patterns, and existing JSON columns for structured metadata.
- `apps/mobile/src/capture/TodayScreen.tsx` already preserves the task list during refresh failures and renders row anatomy with action/product/lot/location/due/owner.
- `apps/mobile/src/capture/CaptureApp.tsx` uses simple local navigation state, so push-tap routing can be a narrow `openTaskById` path without introducing a router.
- `apps/api/src/index.ts` is a minimal Hono Worker app with `/health` and `/probe`; API/cron work must remain small and testable.

### Current gaps

- There is no alert cadence policy for `now` vs `shift` task reminders.
- There is no persistent alert state per task: last reminder, next reminder, retry count, failure state, escalated audience, leadership receipt, or stale push payload.
- There is no Expo notification dependency, config plugin, permission/token service, notification response listener, or scheduling adapter.
- There is no mobile UI for push permission education, denied/unavailable/failure notices, per-task alert status, escalation acknowledgement, or stale push fallback.
- There is no API contract or provider seam for Expo Push tickets/receipts, retry/backoff, or Cloudflare scheduled dispatch.
- There is no durable remote task/token database yet, so remote dispatch must stay behind interfaces and tests, not pretend to be production multi-device orchestration.

## Recommended Architecture

### 1. Add pure alert and escalation policy

Create a small pure module, likely `packages/domain/src/alerts.ts`, that consumes existing task facts and produces cadence decisions. It should define:

- `AlertCadenceProfile`: `now` tasks notify on creation, repeat after 15 minutes, escalate after 30 minutes; `shift` tasks notify on creation, repeat every 60 minutes, escalate after 2 hours.
- `OffShiftNotificationEligibility`: overdue, critical, and sales-area recheck tasks continue; non-critical non-overdue tasks pause with "Cobranca retoma no proximo turno".
- `AlertAudience`: responsible individual, shift team, lead, and responsible-plus-lead after escalation.
- `AlertAttemptState`: pending, sent, failed, retry_pending, exhausted, and suppressed_out_of_shift.
- `EscalationState`: not_escalated, escalated, and leadership_acknowledged.
- `createNotificationContent`: privacy-safe lock-screen content with action, product, and location only; full lot/context remains in app.

Keep this pure and tested. The domain package must not import Expo, Cloudflare, Hono, SQLite, React Native, or Zod.

### 2. Add runtime contracts for alert state, commands, and provider payloads

Create `packages/contracts/src/alerts.ts` with Zod schemas for:

- `TaskAlertStateRecord`: task id, channel state, cadence timestamps, target audience, attempt/retry fields, escalation fields, and optional leadership receipt.
- `DevicePushRegistrationCommand`: local device label, shift/team/lead role label, permission state, token state, and token value when available.
- `AlertDispatchCommand`: task id, audience, privacy-safe notification content, payload task id/current active key, and attempt id.
- `AlertDeliveryResult`: ticket ok/error, retryable flag, receipt status, and `DeviceNotRegistered` handling.
- `PushOpenIntent`: current task id/active key from notification payload and stale/resolved fallback reason.

Contracts should parse every provider/API boundary. Do not store real device tokens in fixtures; use obviously fake token strings.

### 3. Extend the local repository and scheduler around persistent tasks

Extend `CaptureRepository` with alert-specific operations or create a narrow `TaskAlertRepository` in `apps/mobile/src/capture/`:

- register/update this device's alert channel state;
- derive due alerts from active `TodayTaskRecord` plus cadence policy;
- persist per-task alert state in SQLite/memory;
- schedule local notification reminders through an adapter;
- record delivery pending/failed/retry/exhausted states without resolving tasks;
- escalate to locally configured leadership and record acknowledgement time;
- load task by notification payload and return current/stale/resolved routing result.

The mobile adapter can use `expo-notifications` for permission/token and local scheduling. Remote Expo Push dispatch remains behind an API/provider seam until durable backend task/token state exists.

### 4. Add the Hoje UI surfaces from the approved UI-SPEC

The UI should extend Phase 4, not replace it:

- `PushPermissionCard` under the safety verdict, with `Ativar alertas do turno`, `Agora nao`, and explicit copy that "Hoje" remains source of truth.
- `AlertChannelNotice` for denied, unavailable, retry pending, failed, and active states.
- `TaskAlertStatus` line on each active task after due/severity/owner metadata.
- `EscalationStatusRow` with "Lideranca avisada as {horario}" and "Cobrando responsavel e lideranca".
- `EscalationAcknowledgementPanel` with `Confirmar recebimento da cobranca`; acknowledgement never resolves the task.
- `PushOpenFallbackNotice` when a push payload is stale, replaced by a recheck, or already physically resolved.

Do not add a notification inbox, dashboard shell, admin config screen, direct lock-screen resolution, or generic `OK`/`Salvar` actions.

### 5. Add a minimal API/Worker dispatch seam, not fake production certainty

The API can add provider-facing tests and a scheduled handler shape:

- a pure `alerts` service that selects due alert commands from a repository port;
- an Expo provider adapter that validates payload size/privacy and maps tickets/receipts to contract results;
- a Cloudflare `scheduled()` handler wired in `wrangler.toml` for testable dispatch invocation;
- Hono test routes only if needed for local testing, with no secrets and no real tokens.

If no durable store exists yet, use an explicit in-memory/local provider for tests and document that production remote fan-out is blocked on later Neon/auth/sync work. The phase can still prove cadence, state, retries, and provider error handling without claiming a guarantee.

## Validation Architecture

Phase 5 needs fast tests for policy and contracts, then integration tests for mobile state/UI and API provider behavior.

| Layer | Focus | Command / evidence |
|---|---|---|
| Domain alert policy | cadence, off-shift eligibility, audience escalation, privacy-safe content | `pnpm.cmd --filter @validade-zero/domain test -- alerts` |
| Contract validation | alert state, device registration, dispatch payload, delivery result, push open intent | `pnpm.cmd --filter @validade-zero/contracts test -- alerts` |
| Mobile alert repository | SQLite/memory alert state, idempotent scheduling, retry state, escalation receipt, task not resolved by alert | `pnpm.cmd --filter @validade-zero/mobile test -- alert` |
| Mobile UI flow | permission card, channel notices, task alert status, stale push fallback, leadership acknowledgement | `pnpm.cmd --filter @validade-zero/mobile test -- push` |
| API/cron/provider seam | scheduled dispatch, Expo provider mapping, retryable errors, token invalidation | `pnpm.cmd --filter @validade-zero/api test -- alerts` |
| Native smoke | Hoje still first screen; alert CTA/notice visible when fixture supports it | `pnpm.cmd test:e2e:mobile` when Maestro/runtime is available |
| Full regression | monorepo quality/security suite | `pnpm.cmd check` |

If native push cannot be tested because the environment lacks a development build, device/emulator, credentials, or Maestro, execution summaries must record the exact blocker and rely on component/provider tests without claiming native delivery.

## Security, Privacy, and Safety Notes

- Notification payloads must not include lot details on the lock screen; only action, product, and location are visible before app open.
- Device tokens are sensitive operational identifiers. Use fake tokens in tests/docs and never commit real tokens.
- Push delivery, tickets, receipts, and local scheduling never resolve or hide tasks.
- `DeviceNotRegistered`, denied permissions, missing token, transient network errors, and provider 4xx/5xx must be visible as channel state, not task completion.
- The API must avoid secrets in fixtures and responses and should not log raw tokens in tests.
- The domain package remains pure; provider SDKs live only in adapters.
- Cloudflare cron uses UTC. Any local shift logic must convert explicitly instead of assuming store-local wall-clock behavior.

## Common Pitfalls

- Treating a push ticket, receipt, notification tap, or leadership acknowledgement as proof of physical resolution.
- Asking notification permission on app launch instead of after the user sees the "Hoje" context.
- Putting full lot identity on lock-screen notification content.
- Building a notification center or dashboard instead of a narrow alert channel under "Hoje".
- Creating repeated notifications without persistent state, causing duplicate reminders after refresh.
- Claiming remote multi-device push without server-side durable task/token state.
- Hiding the task list when permission is denied or a provider send fails.
- Letting escalated tasks become broadcast noise instead of responsible plus leadership.

## Planning Recommendation

Plan the phase as four sequential waves:

1. Alert cadence domain policy, contracts, and privacy-safe payload vocabulary.
2. Mobile alert state repository, Expo notification adapter, local scheduling, and push-open routing result.
3. Hoje UI surfaces for permission/channel state, task alert status, escalation acknowledgement, and stale push fallback.
4. API/Cloudflare/Expo provider seam, retry/receipt handling, smoke update, full regression, and honest limitations documentation.

This order creates the rules and contracts first, then durable local behavior, then visible operations, then provider/cron hardening.
