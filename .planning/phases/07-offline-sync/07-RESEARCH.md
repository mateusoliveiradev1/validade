---
phase: 07
slug: offline-sync
status: complete
created: 2026-06-22
sources:
  - https://docs.expo.dev/versions/latest/sdk/sqlite/
  - https://docs.expo.dev/guides/local-first/
  - https://docs.expo.dev/versions/latest/sdk/netinfo/
---

# Phase 07 - Offline Sync Research

## RESEARCH COMPLETE

Phase 7 should implement a custom local-first outbox on top of the app's existing SQLite repository and Today workflow. Do not introduce a full local-first database product, a CRDT layer, a sync dashboard, or photo storage. The smallest safe design is:

1. Strict sync contracts and pure policy helpers.
2. A durable SQLite outbox plus offline cache metadata.
3. A sync runner with injected network and transport ports.
4. Hoje and task-panel UI that keeps pending/conflict states visible until acknowledged by sync.

## Source Research

### Expo SQLite

The current app already depends on `expo-sqlite` `~56.0.5`, which matches the Expo docs bundled version for SDK 56. The docs state that the database persists across app restarts and supports async APIs such as `runAsync`, `getFirstAsync`, `getAllAsync`, prepared statements, `SQLiteProvider`, `openDatabaseAsync`, and database change listeners. This supports the chosen local outbox/cache approach without adding storage dependencies.

Relevant planning implications:

- Keep using SQLite as the durable source for active tasks, required lot snippets, command queue, conflict records, and cache metadata.
- Use `db.withTransactionAsync` around "write command + local visible projection" and around "mark syncing + apply ack/conflict" transitions.
- Continue parameterized queries and JSON validation at the mapper boundary; Expo explicitly calls prepared statements an SQL-injection defense.
- Avoid `expo-sqlite/kv-store` for task/sync state because this phase needs queryable queue ordering, conflict priority, retry counts, and relational links to task/lot rows.

### Expo local-first guidance

Expo's local-first guide frames local-first as direct device reads/writes with later sync. It also notes that teams often need custom sync layers because the tool ecosystem is still early. That maps to Validade Zero: the workflow is operational, command-shaped, and must never auto-merge safety-critical changes. A bespoke outbox is a better fit than adding a generic local-first database layer in this phase.

Relevant planning implications:

- Local writes should never wait on network before preserving physical work.
- Sync remains a separate concern from task execution. The task panel records a physical action; the sync runner later confirms central acknowledgement.
- Conflicts are not automatically resolved when they affect safety. They are visible operational work items.

### Expo NetInfo

Expo documents `@react-native-community/netinfo` as the supported network information package, bundled at `12.0.1`, installed via `npx expo install @react-native-community/netinfo`. It exposes one-time `fetch()` and subscription via `addEventListener`, including connection type and `isConnected`.

Relevant planning implications:

- Add NetInfo behind a local `NetworkStateProvider` adapter rather than reading it directly from UI or repository internals.
- Treat `unknown` or null reachability as degraded. Manual "Sincronizar pendencias" remains available, but automatic sync should not silently claim success based on uncertain connectivity.
- Tests should use a fake provider, not native network state.

## Existing Code Findings

### Persistence and transactions

- `apps/mobile/src/capture/sqlite-repository.ts` already initializes WAL mode and stores products, lots, observations, today tasks, future attention, markdown workflows, alert devices, alert state, alert attempts, and escalation receipts.
- Existing task and markdown transitions use `db.withTransactionAsync`, especially task resolution, markdown request, approval, application, and final shelf confirmation.
- `today_tasks` already contains the required lot snippets for offline work: lot id, product display name, identity, location, risk, severity, due bucket, required resolution, owner, source risk, timestamps, markdown workflow id/stage, and resolution history.
- `refreshTodayTasks` is already called from `today_open`, `manual_refresh`, `lot_change`, and `observation_change`. Those are exactly the cache preparation events locked by D-05.

### UI and copy

- `TodayScreen.tsx` renders the sales-area safety verdict first, then refresh feedback, push/alert surfaces, active task rows, and future attention.
- `TaskResolutionPanel.tsx` keeps the primary action tied to the physical outcome, with reinforced confirmation for destructive actions and evidence/no-photo metadata for recheck and markdown stages.
- `today-copy.ts` centralizes operational PT-BR copy. Phase 7 copy should be added there using ASCII-normalized text, matching the UI-SPEC.
- `capture-theme.ts` already contains the exact semantic colors approved by `07-UI-SPEC.md`.

### Contracts

- `packages/contracts/src/tasks.ts` defines strict Zod schemas for `TodayTaskRecord`, task refresh metadata, evidence metadata, and `TaskResolutionCommand`.
- `packages/contracts/src/markdown.ts` defines strict commands for markdown request, approval, application, and shelf confirmation.
- Phase 7 should add `packages/contracts/src/sync.ts`, reusing existing command schemas instead of duplicating payload shapes.

## Recommended Architecture

## Validation Architecture

### Data Model

Add a sync contract layer and SQLite tables:

- `sync_commands`
  - `id`, `idempotency_key`, `kind`, `state`, `urgency`, `task_id`, `task_active_key`, `lot_id`, `product_display_name`, `lot_identity_json`, `location_json`, `risk_state`, `required_resolution`, `payload_json`, `created_at`, `updated_at`, `first_attempted_at`, `last_attempted_at`, `attempt_count`, `next_retry_at`, `last_error`, `acked_at`, `conflict_id`, `discarded_reason`.
- `sync_conflicts`
  - `id`, `command_id`, `severity`, `reason`, `local_summary_json`, `remote_summary_json`, `allowed_actions_json`, `created_at`, `resolved_at`, `resolution_action`, `resolution_reason`.
- `offline_cache_status`
  - `id` fixed as `today`, `state`, `last_refreshed_at`, `active_task_count`, `required_lot_snippet_count`, `stale_after`, `source`, `updated_at`.

Keep active task and lot snippets in existing `today_tasks` and `capture_lots`. Do not duplicate broad lot history just to prove offline readiness.

### State Vocabulary

Use explicit state names aligned with the UI-SPEC:

- Cache/readiness: `offline_ready`, `offline_stale`, `offline_unavailable`, `offline_mode`.
- Command states: `command_saved_local`, `pending_sync`, `syncing`, `synced`, `sync_failed`, `sync_conflict`, `discarded`.
- Conflict resolutions: `keep_local_and_retry`, `use_current_task`, `discard_offline_action`.

### Command Envelope

Create one strict union for offline commands:

- `resolve_task` with `TaskResolutionCommandSchema`.
- `request_markdown` with `MarkdownRequestCommandSchema`.
- `decide_markdown` with `MarkdownApprovalCommandSchema`.
- `record_markdown_application` with `MarkdownApplicationCommandSchema`.
- `confirm_markdown_on_shelf` with `MarkdownShelfConfirmationCommandSchema`.

Each command must include a generated `idempotencyKey`. Retrying sends the same key and payload. Command IDs are data identifiers, not primary UI copy.

### Local Projection

When offline or degraded:

- Save the command first, in the same transaction as any local visible projection.
- Attach sync metadata to the task row or a repository DTO so Today can show `Pendente de sincronizacao`.
- For critical/expired sales-area actions, never remove all blocking visibility before sync acknowledgement. The safety header may say local progress exists, but it must keep a pending qualifier.
- For markdown stages, preserve stage history locally as a pending projection only when needed for continued shelf work; every projected next-stage row must carry pending sync metadata until ack.

### Sync Runner

Add a `SyncTransport` port and a `NetworkStateProvider` port:

- `NetworkStateProvider` uses NetInfo in production and fake state in tests.
- `SyncTransport` posts batches to an API endpoint or fake transport in tests.
- `syncPendingCommands` selects due pending/retry commands, marks them `syncing`, sends idempotent envelopes, then applies `ack`, `retry`, or `conflict` results.
- Retry is limited and visible. Do not silently drop failed commands.
- Conflicts sort before pending commands, with critical conflicts first.

### API Seam

Add a Hono sync endpoint that parses strict contracts and returns deterministic ack/conflict results through an in-memory pilot repository. This is not yet the durable production source of truth. Document that durable multi-device central state waits for later auth/store infrastructure, but the contracts, mobile transport, idempotency, and conflict UI are in place.

## Plan Shape

Four waves are recommended:

1. Sync contracts and pure policy.
2. Mobile repository outbox, cache metadata, and local projection.
3. Connectivity, sync runner, and API/transport seam.
4. Hoje/task-panel UI, conflict review, docs, and regression.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Offline action hides a critical task before central ack | Keep pending sync metadata visible in task rows, panel feedback, and queue summary; qualify safety header. |
| Duplicate retries create duplicate physical actions | Use idempotency key, state transitions, and same command payload for retries. |
| Outbox compaction erases operational chain | Store one command per physical action; no destructive grouping across stage transitions. |
| Connectivity state is wrong or unknown | Treat unknown reachability as degraded; manual retry remains visible; tests use injected fake network. |
| Conflict is resolved silently | Critical command conflicts require explicit review and discard reason when destructive. |
| Phase drifts into audit/photo storage | Store only existing evidence metadata; no R2, URI, base64, object keys, or audit timeline UI. |

## Verification Strategy

- Contracts: strict Zod tests for command union, queue summaries, conflicts, cache status, and rejection of raw photo/storage fields.
- Domain/policy: pure unit tests for cache staleness, urgency sorting, retry eligibility, conflict priority, and destructive discard reason requirement.
- Repository: memory and SQLite tests for command save before sync, transaction behavior, no duplicate command on retry, cache metadata refresh, and pending marker persistence.
- Sync runner/API: fake network and fake transport tests for offline skip, online ack, retryable failure, idempotent duplicate ack, and conflict creation.
- UI: React renderer tests for offline-ready/offline-mode/stale/unavailable states, pending labels in row/panel/summary, conflict panel content, destructive discard confirmation and reason, and startup with cached content.
- Regression: `pnpm.cmd --filter @validade-zero/domain test -- sync`, `pnpm.cmd --filter @validade-zero/contracts test -- sync`, `pnpm.cmd --filter @validade-zero/mobile test -- offline-sync`, `pnpm.cmd --filter @validade-zero/mobile test -- today-screen`, `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution`, `pnpm.cmd --filter @validade-zero/api test -- sync`, `pnpm.cmd --filter @validade-zero/mobile typecheck`, `pnpm.cmd lint`, and `pnpm.cmd test`.

## Open Questions

None blocking. The API seam should be explicit about its pilot/in-memory limitation so SYN-03 is implemented as a contract-tested sync path without pretending there is durable central multi-device storage before auth/store infrastructure.

