# Push Alerts Operations

Phase 5 adds push and escalation pressure to the existing "Hoje" task flow. Push helps charge the right person, but "Hoje" remains the source of truth. A notification, ticket, receipt, tap, or leadership acknowledgement never resolves a task and never marks the sales area safe.

## Operating Rules

- Ask for notification permission only after the collaborator sees the "Hoje" context and chooses `Ativar alertas do turno`.
- Keep every critical task visible in "Hoje" until the required physical resolution is completed in the app.
- Use push copy as a reminder channel, not as proof that work happened.
- Leadership acknowledgement means "received the charge"; it does not silence or close the task.
- If push is denied, unavailable, pending, or failed, the task list stays usable and the team must charge manually when needed.

## Phase 12 Safe Push Test

The Command Center safe push test is a diagnostic and reminder-channel check. It records who triggered the test, the target device label, the provider/token/permission/open state, the evidence label, and the next action. It does not create, resolve, reopen, silence, or mark any operational task safe.

`Bloqueios do piloto` treats push states as rollout readiness inputs:

- `provider_failed`, `token_invalid`, and `permission_denied` are operator/action blockers until the channel is repaired and retested.
- `local_only` is an external rollout blocker for remote push proof; the device can still show local reminders, but that is not provider delivery.
- `delivered`, `sent`, or `opened` can support readiness only when recorded from an approved native APK/device/provider run.

Provider proof must remain public-safe. Record sanitized status and next action only; never commit raw push tokens, provider tickets, dashboard links, Firebase files, build URLs, device identifiers, or real operator details.

## Privacy

Lock-screen content must stay privacy-safe. It can include action, product, and location, for example:

```text
Retirar agora: Banana prata - area de venda
```

Do not put lot identifiers, task ids, active keys, device tokens, store-sensitive data, evidence URLs, or private photos in visible notification text. Provider payload data may carry only the task id and active key needed to route a push tap back to the current in-app task.

## Test Tokens

Tests and documentation must use fake tokens only, such as:

```text
ExponentPushToken[FICTICIO-TESTE]
```

Never paste a real Expo push token, device token, credential, or provider secret into the public repository. Tests should assert that raw tokens are not returned by API responses or stored in committed fixtures.

## Native Remote Push Setup

Remote Expo push delivery needs environment setup outside the normal repo checks:

- Expo Notifications installed and configured in `apps/mobile/app.json`.
- The approved native APK for `@liiiraak1ng/validade-zero` with the expected Android package. Android remote push is not proven by Expo Go.
- Device or emulator support for notifications.
- Valid Expo project id and platform credentials for real remote delivery.
- A backend store for real task and device-token fan-out.
- Firebase Android credentials included in the native build when remote push is being validated.
  For staging/pilot EAS profiles, `apps/mobile/app.config.js` only includes
  `googleServicesFile` when `GOOGLE_SERVICES_JSON` or `GOOGLE_SERVICES_FILE` explicitly points to
  an existing Firebase `google-services.json`. A sync-only APK may build without that file, but
  remote push remains blocked until Firebase credentials are provided through a non-committed EAS
  file variable. Local native experiments may opt into the ignored
  `apps/mobile/google-services.json` with `VALIDADE_ZERO_USE_LOCAL_FIREBASE=1`.

Local mocks, local ignored Firebase files, sync-only APKs, Expo Go, and component tests do not prove remote provider readiness. A provider pass requires an approved native APK/device/provider run recorded in the controlled release record without committing tokens, account ids, build URLs, raw device identifiers, or credential values.

Phase 5 did not claim production multi-device remote fan-out. Phase 10/11 added central task truth and stronger release gates; Phase 12 adds safe push-test authority, timeline, and blocker synthesis. Real Android provider readiness still remains blocked until approved native APK/device/provider evidence is recorded.

If the native build is missing Firebase at runtime, the operator must not see the raw Firebase
exception. The mobile app degrades to `local_only`: it registers the device as local-only, keeps
"Hoje" as the source of truth, and schedules local reminder notifications for pending critical
tasks on that device. This is a safety net for a bad APK, not a replacement for remote push in the
staging/pilot build.

## Cloudflare Cron

The Worker scheduled seam uses the cron in `apps/api/wrangler.toml`:

```toml
[triggers]
crons = ["*/15 * * * *"]
```

Cloudflare cron expressions run in UTC. Local shift rules must convert from store policy explicitly before deciding whether an alert is due.

For local scheduled testing with Wrangler, use the scheduled testing route or Wrangler support for invoking the scheduled handler. Do not treat a local scheduled invocation as real Expo delivery.

## Delivery Limits

Expo tickets and receipts help classify provider state, but they are not physical-resolution proof. A successful ticket or receipt can still fail to mean the collaborator saw, understood, or completed the task. The app must continue showing the task until the physical resolution workflow completes.

Even after provider proof passes, push remains a reminder channel only. It never resolves a task, never closes a shift, never makes a synced command safe, and never replaces `Hoje`, central sync, physical confirmation, or Command Center truth.

Provider outcomes should map like this:

- `ok`: provider accepted the send attempt.
- `retryable_error`: HTTP 429, HTTP 5xx, or network failure; keep the task visible and retry according to alert state.
- `device_not_registered`: mark the device channel invalid and keep the task visible.
- `permanent_error`: surface degraded state and keep the task visible.

## Current MVP Limitation

The repo is still local-first. It has no durable remote task table, authenticated team/device registry, shift schedule store, role model, or multi-device sync yet. For now:

- Mobile can register local channel state and show alert/escalation status.
- API tests can exercise the provider/cron seam with fake tokens.
- Native smoke can assert the deterministic "Hoje" alert affordance.
- Real remote fan-out remains future work.

This limitation is intentional. It protects the core promise: no expired product should be hidden by a successful push send, receipt, or acknowledgement.
