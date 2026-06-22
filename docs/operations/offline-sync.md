# Offline Sync Operations

Phase 7 makes the mobile task flow usable when store connectivity is poor. Offline sync protects the operational promise by saving physical work locally first, then making sync state visible until the backend returns `ack`, `retry`, or `conflict`.

## Offline-Ready Criteria

The app can present offline-ready state only after "Hoje" has refreshed the active task cache and the required lot snippets for those tasks. A stale or missing cache must be treated as degraded safety context, especially for expired or critical items in the sales area.

The local cache is not a proof that work happened. It is only enough context for the collaborator to continue the task flow while the network is unavailable.

## Queue Behavior

- Every supported task or markdown action is saved as one idempotent command.
- The command is written before the local Today task projection is updated.
- Pending critical work stays visible with sync metadata until a transport acknowledgement is applied.
- Failed transport attempts remain visible as `sync_failed` and can be retried.
- Commands already marked `syncing` are not sent again by the sync engine.

## Idempotency

The mobile repository derives a stable idempotency key from the command kind, target task/workflow/lot, action, and occurrence time. Retries must reuse the same command id, payload, and idempotency key.

The pilot API seam deduplicates by idempotency key. A duplicate retry returns the existing result instead of creating a second central effect.

## Conflict Handling

A conflict must include enough detail for a human review before any safety-affecting resolution:

- Local action kind and label.
- Actor label and local occurrence time.
- Product display name.
- Lot identity.
- Current local location.
- Remote change kind, summary, and time when known.

Critical conflicts stay visible in "Hoje" until the collaborator chooses an explicit conflict resolution action.

## Network Adapter

Mobile connectivity is observed through `@react-native-community/netinfo` behind `network-state.ts`.

- `isConnected === false` becomes `offline`.
- `isConnected === true && isInternetReachable !== false` becomes `online`.
- Null or unknown reachability becomes `degraded`.

Network state is only a trigger for trying sync. It never marks a command as synced. Only a transport `ack` can do that.

## Pilot API Seam Limitation

`POST /sync/commands` is a contract-tested pilot seam. It parses strict sync batches, returns strict transport results, and supports in-memory ack, retry, conflict, and idempotency behavior for tests and local development.

It is not durable central multi-device storage yet. This phase does not add Neon task persistence, auth, store isolation, R2 evidence storage, sales, stock, ERP integration, or real cross-device merge policy.

## Native Verification

Manual native verification is still required because NetInfo behavior depends on the device/runtime:

1. Install native dependencies with `pnpm.cmd install` if needed after checkout.
2. Start the mobile app in a supported Expo development runtime.
3. Open "Hoje" online and refresh tasks.
4. Disable network connectivity and save a task action.
5. Confirm the task remains visible with pending sync state.
6. Restore connectivity and trigger sync.
7. Confirm the task changes only after ack, or remains visible as retry/conflict when the seam returns that result.

Do not treat a successful local save, network reachability, or API retry response as proof that the sales area is safe.
