# Push Alerts Operations

Phase 5 adds push and escalation pressure to the existing "Hoje" task flow. Push helps charge the right person, but "Hoje" remains the source of truth. A notification, ticket, receipt, tap, or leadership acknowledgement never resolves a task and never marks the sales area safe.

## Operating Rules

- Ask for notification permission only after the collaborator sees the "Hoje" context and chooses `Ativar alertas do turno`.
- Keep every critical task visible in "Hoje" until the required physical resolution is completed in the app.
- Use push copy as a reminder channel, not as proof that work happened.
- Leadership acknowledgement means "received the charge"; it does not silence or close the task.
- If push is denied, unavailable, pending, or failed, the task list stays usable and the team must charge manually when needed.

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
- A development build or supported native runtime. Android remote push is not available in Expo Go on current SDKs.
- Device or emulator support for notifications.
- Valid Expo project id and platform credentials for real remote delivery.
- A backend store for real task and device-token fan-out.

Phase 5 does not claim production multi-device remote fan-out. The current API/provider seam is fakeable and contract-tested, but durable remote dispatch is blocked until future auth, task sync, roles, and server-side storage work exists.

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
