---
phase: 08-audit-roles-and-shift-close
plan: "02"
subsystem: audit
tags: [audit, offline-sync, mobile, web-admin, rbac, append-only]

requires:
  - phase: 08-audit-roles-and-shift-close
    provides: server-owned role/store authorization, durable memberships, and append-only audit foundations from 08-01
provides:
  - Store-scoped audit contracts, repository/query service, recorder, and API route
  - Web audit workbench with store scope, operational filters, cursor loading, and detail sheet
  - Mobile contextual audit timeline for task/lot surfaces with local and central timestamps
  - Local audit event persistence and idempotent reconciliation for offline sync commands
affects: [audit, offline-sync, mobile-capture, web-admin, evidence, shift-close]

tech-stack:
  added: []
  patterns:
    - Audit events are projected as operational timelines and never expose raw technical payloads.
    - Offline actions create local audit events in the same persistence boundary as sync commands.
    - Central acknowledgement updates local audit status by idempotency key without duplicating history.
    - Web audit investigation uses cursor pagination and dense table/list views instead of metrics or charts.

key-files:
  created:
    - packages/contracts/src/audit.ts
    - apps/api/src/audit.ts
    - apps/web/src/audit/AuditWorkbench.tsx
    - apps/web/src/audit/AuditEventDetail.tsx
    - apps/web/src/audit/audit-client.ts
    - apps/mobile/src/capture/AuditTimeline.tsx
    - apps/mobile/src/capture/audit-timeline.test.tsx
  modified:
    - packages/contracts/src/index.ts
    - packages/database/src/audit-repository.ts
    - packages/database/src/schema.ts
    - apps/api/src/index.ts
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/mobile/src/capture/LotDetailScreen.tsx
    - apps/web/src/App.tsx

key-decisions:
  - "Audit producer vocabulary covers domain/security events only; navigation, filters, and ordinary clicks remain outside the audit trail."
  - "Pending local audit timeline entries omit receivedAt until a central acknowledgement exists."
  - "Corrections, conflicts, and discards create linked events instead of rewriting the original operational fact."
  - "The web workbench stays an investigation table/list with filters and cursor loading, not a dashboard with totals or charts."

patterns-established:
  - "AuditTimelineItem is the UI-safe projection boundary for web and mobile audit surfaces."
  - "CaptureRepository exposes optional listAuditTimeline so local implementations can surface contextual history without forcing all test doubles."
  - "SQLite local_audit_events mirrors sync command idempotency and status reconciliation in the same transaction path."
  - "Web audit filters are restored from component state and include period, person, event type, target type, and target id."

requirements-completed: [AUD-01, AUD-02]

duration: 35min
completed: 2026-06-22
status: complete
---

# Phase 08 Plan 02: Append-only Audit Producers, Mobile Timelines, and Web Workbench Summary

**Store-scoped operational audit trail with offline-aware mobile timelines and a leadership web investigation surface**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-22T11:14:00Z
- **Completed:** 2026-06-22T11:49:00Z
- **Tasks:** 2
- **Files modified:** 33 source/config files plus this summary

## Accomplishments

- Added strict audit contracts for append-only records, timeline projections, store-scoped queries, cursor pages, typed producer commands, safe metadata, linked events, and pending local receipt states.
- Added audit repository/service/API support for protected task actions and store-scoped audit queries, with idempotent append and sanitized denial behavior built on the 08-01 authorization foundation.
- Built the web audit workbench with visible store scope, period/person/type/target filters, semantic table/list results, cursor loading, loading/empty/error states, redacted operational detail, and focus return from the detail sheet.
- Added mobile `AuditTimeline` and wired optional contextual history into task resolution and lot detail surfaces without moving safety/action content below history.
- Added memory and SQLite local audit event persistence so offline actions create pending timeline entries, reconcile central acknowledgement by idempotency key, and preserve linked conflicts/discards append-only.

## Task Commits

Each task was committed atomically:

1. **Task 1: Let a lead view one real append-only store event end to end** - `aadb709` (feat)
2. **Task 2: Expand the working audit path to every producer, offline time, and edge state** - `a25e5a1` (feat)

**Plan metadata:** this SUMMARY commit.

## Files Created/Modified

- `packages/contracts/src/audit.ts` - audit event, timeline item, producer command, query, cursor, and metadata-redaction contracts.
- `packages/contracts/src/audit.test.ts` - metadata redaction, timeline, producer vocabulary, pending receipt, and non-audited navigation checks.
- `packages/database/src/audit-repository.ts` - append/query/list repository operations with store predicates, idempotency, cursor loading, and no update/delete API.
- `packages/database/src/schema.ts` and `packages/database/drizzle/0001_phase_08_identity_audit.sql` - durable audit event schema, indexes, and append-only protection from the identity/audit foundation.
- `apps/api/src/audit.ts` - audit service, protected task action recorder, access-denied recorder, store query parser, and in-memory/database repository adapters.
- `apps/api/src/index.ts` - audit routes for protected task actions and store-scoped event queries.
- `apps/web/src/audit/AuditWorkbench.tsx` - leadership/admin audit table/list with filters, cursor loading, detail sheet, skeleton, empty/error states, and focus return.
- `apps/web/src/audit/AuditEventDetail.tsx` - operational detail projection with actor, role, store, two timestamps, target, reason, and allowlisted metadata only.
- `apps/mobile/src/capture/AuditTimeline.tsx` - contextual mobile timeline with reverse chronology, pending/conflict/invalidated states, linked corrections, and two-time copy.
- `apps/mobile/src/capture/memory-repository.ts` - in-memory local audit events for offline action replay, ack, retry, conflict, and discard paths.
- `apps/mobile/src/capture/sqlite-repository.ts` - SQLite `local_audit_events` table, indexes, transaction-coupled writes, reconciliation, and timeline query mapping.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` and `apps/mobile/src/capture/LotDetailScreen.tsx` - optional timeline rendering below primary operational actions.

## Decisions Made

- Audit visibility is intentionally operational: summaries, actor/role/store, target labels, reasons, and safe metadata are visible; payloads, object storage keys, signed URLs, raw request material, and binary evidence details are excluded.
- Offline audit entries remain visibly pending or conflicted until central acknowledgement; `occurredAt` represents the physical/local action time, while `receivedAt` is absent until the system receives the event.
- Replays and acknowledgements reconcile by idempotency key so a sync retry can prove the same fact without duplicating timeline entries.
- Mobile timelines are contextual support content and never displace the task action controls that make the sales area safe.
- Web audit stays deliberately dense and calm: no totals, rankings, metric cards, or charts while the pilot needs investigation rather than analytics.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion beyond the 08-02 audit producer, timeline, and workbench contract.

## Issues Encountered

- The session paused mid-plan and was resumed from git state. The pending diff was revalidated before commit, and all gates were rerun after the final filter adjustment.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd vitest run --config vitest.config.ts --project contracts --project api --project web -- audit AuditWorkbench` - passed for Task 1 before commit `aadb709`.
- `pnpm.cmd vitest run --config vitest.config.ts --project mobile -- audit` - passed, 22 files / 120 tests.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- AuditWorkbench` - passed, 3 files / 8 tests.
- `pnpm.cmd --filter @validade-zero/mobile typecheck` - passed.
- `pnpm.cmd --filter @validade-zero/web typecheck` - passed.
- `pnpm.cmd --filter @validade-zero/contracts test -- audit` - passed, 6 files / 41 tests.
- `pnpm.cmd --filter @validade-zero/api test -- audit` - passed, 5 files / 27 tests.
- `pnpm.cmd --filter @validade-zero/database typecheck` - passed.
- Source/projection scan found prohibited raw evidence/request terms only in contract rejection lists or negative tests, not as visible audit UI output.

## Next Phase Readiness

Plan 08-03 can build evidence upload/storage on top of the existing audit projection and local timeline seams. The next plan should attach evidence upload/invalidation events to this audit vocabulary while preserving the rule that private object references never appear in operational UI.

## Self-Check: PASSED

- Key files exist on disk.
- Both task commits exist.
- Required verification commands passed after the final changes.
- `AUD-01` is covered by typed producer seams, append-only/idempotent storage, mobile contextual timelines, and web store-scoped query surfaces.
- `AUD-02` remains enforced by the role/store authorization foundation from 08-01 and the store predicate on audit queries.

---
*Phase: 08-audit-roles-and-shift-close*
*Completed: 2026-06-22*
