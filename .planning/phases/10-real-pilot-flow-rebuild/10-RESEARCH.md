# Phase 10 Research: Real Pilot Flow Rebuild

**Researched:** 2026-06-26
**Mode:** MVP vertical slices

## Summary

Phase 10 is the central-truth rebuild for the real pilot. Phases 04-09 already
delivered the local operational loop, offline truth vocabulary, audit/RBAC,
shift close, invite-first auth, Android shell, and web Command Center shell. The
gap is that product, lot, active task, terminal resolution, and Command Center
state are still not all backed by one central model.

The current mobile app can create products/lots in SQLite, derive Hoje tasks
locally, queue offline task/markdown commands, and send those commands to
`/sync/commands`. The API acknowledges command batches and writes sanitized audit
events. The web Command Center reads those audit events and fails closed when no
central task projection exists. That is truthful, but not enough for a pilot
where a fresh Android install, another phone, and the web panel must see the
same facts.

The planning shape should therefore be six sequential vertical slices:
prepare-turn central hydration, central catalog and draft review, central lots
and task projection, terminal resolution with sync truth, Command Center/RBAC
fan-out, and full UAT/release evidence.

## Codebase Findings

- `apps/mobile/src/auth/AuthGate.tsx` resolves actor, role, store, and
  capability before rendering operational screens. `CaptureApp` still passes
  fallback `actorLabel` and `storeId` defaults unless the parent session maps
  them through.
- `apps/mobile/src/capture/repository.ts` is the local-first port. It has
  product, lot, task, markdown, evidence, shift-close, audit, and sync methods,
  but no central catalog/lot hydration contract.
- `apps/mobile/src/capture/sqlite-repository.ts` stores products, lots,
  observations, Hoje tasks, markdown workflows, evidence upload queue, unsafe
  close outbox, sync commands, sync conflicts, and local audit events. It
  already maps rows through strict contract parsers.
- `apps/mobile/src/capture/sync-engine.ts` sends pending command summaries to a
  transport and only marks results after `SyncTransportResultSchema` parses
  ack/retry/conflict.
- `apps/mobile/src/capture/http-sync-transport.ts` posts unauthenticated command
  batches to `/sync/commands?storeId=...`. Phase 10 must bind sync to the active
  session and store scope.
- `apps/api/src/index.ts` composes services by injected ports. Existing seams for
  auth, membership, audit, evidence, shift close, command center, and sync should
  be extended rather than replaced.
- `apps/api/src/command-center.ts` currently builds Command Center output from
  sync audit events. It can show ack/conflict/retry truth, but it cannot be the
  source of active products, lots, tasks, resolved history, or product review.
- `packages/database/src/schema.ts` has central auth, memberships, audit,
  evidence, and shift close tables. It does not yet have central product, lot,
  observation, task, sync command, conflict, device snapshot, or product draft
  tables.
- `packages/contracts/src/capture.ts`, `tasks.ts`, `sync.ts`,
  `command-center.ts`, and `authorization.ts` contain strict schemas and are the
  right shared boundary for the central read/write contracts.
- `packages/domain/src/tasks.ts` already knows which actions are compatible with
  required resolutions. `packages/domain/src/sync.ts` already defines local,
  pending, syncing, synced, conflict, and discarded command states.

## Product Findings

- "Preparar turno" must be a real central read: session, store, membership,
  device identity, catalog snippets, active tasks, lot snippets, conflicts, and
  pending local commands. It cannot be a splash or a local-only refresh.
- Product creation must be a single flow: search, similar-match warning, reuse,
  create draft, central acknowledgement, and review state. Lot registration
  should not be forced merely because the operator created a product.
- Lot creation and observation must become centrally visible to another device
  in the same store after acknowledgement. Local SQLite remains the offline
  cache, not the authority of record once central data exists.
- Terminal resolution means central state has accepted the action. Local save
  may remain pending, conflict, or discarded; it must not remove risk from the
  central active queue before acknowledgement.
- `withdraw`, `record_loss`, completed `repack`, `mark_not_found`,
  `mark_probably_sold_out`, `move_lot`, and completed markdown shelf
  confirmation must update active task projection and history consistently.
- Shift close must use central revalidation, sync/conflict/evidence/product
  review blockers, and an immutable close record. Offline unsafe handoff remains
  explicit and pending until acknowledged.
- Web Command Center must show active and resolved facts from the same central
  model as mobile, not a separate audit-only inference.

## Planning Implications

- Add central capture contracts first: prepare-turn package, catalog/product
  draft, lot snapshot, central task projection, terminal resolution result,
  central sync taxonomy, and Command Center pilot projection.
- Add central persistence beside existing audit/auth/shift tables. Keep migrations
  idempotent where possible, indexed by `store_id`, and validated in the database
  project tests.
- Keep SQLite as cache/outbox. Add central IDs, central version/updated times,
  device snapshot metadata, and hydration upsert paths so second-device reads do
  not require local seed data.
- Convert `/sync/commands` from audit-only acknowledgement into command
  application against the central capture repository while still recording audit
  events for every outcome.
- Preserve all public-repo safety: no real store data, no secrets, no private
  evidence assets, no raw device URIs in central sync payloads.
- Use `pnpm.cmd check` as the broad final gate, with focused contract, database,
  API, mobile, web, Playwright, and Maestro/UAT gates per plan.

## Open Execution Risks

- Central schemas will be wide. Plans should add the thinnest durable records
  needed for the pilot journeys and avoid analytics or ERP/sales integration.
- The API currently accepts sync store via query string. The executor must
  re-authorize store scope with the active session before accepting operational
  writes.
- The existing Command Center can report `safe` from sync audit events. Phase 10
  must ensure `safe` only comes from current central projection with no active
  blockers.
- Mobile native UAT still depends on an Android emulator/device and Expo
  provider setup. Automated repository gates can pass while release evidence
  remains blocked; the validation plan must say so directly.
