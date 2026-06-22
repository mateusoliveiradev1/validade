---
phase: 08
slug: audit-roles-and-shift-close
status: complete
created: 2026-06-22
---

# Phase 08 - Pattern Map

## PATTERN MAPPING COMPLETE

## Files To Touch

| Target | Role | Closest Analog | Pattern To Preserve |
|--------|------|----------------|---------------------|
| `packages/domain/src/authorization.ts` | Pure capability and store-scope policy | `packages/domain/src/alerts.ts`, `packages/domain/src/sync.ts` | Export const vocabularies and pure helpers; no Zod, Hono, database, or provider imports. |
| `packages/domain/src/shift-close.ts` | Pure close eligibility and immutable revision policy | `packages/domain/src/tasks.ts`, `packages/domain/src/sync.ts` | Discriminated results, explicit blockers, deterministic sorting, focused tests. |
| `packages/contracts/src/authorization.ts` | Authenticated and authorized actor boundaries | `packages/contracts/src/sync.ts` | Strict Zod schemas, inferred types, server-owned role/store context. |
| `packages/contracts/src/audit.ts` | Append-only event and timeline contracts | `packages/contracts/src/tasks.ts`, `packages/contracts/src/sync.ts` | Strict schemas, operational projection separate from raw metadata. |
| `packages/contracts/src/evidence.ts` | Evidence lifecycle and upload contracts | `packages/contracts/src/sync.ts` | Reject URI/base64/signed URL/object key from client command payloads. |
| `packages/contracts/src/shift-close.ts` | Close, handoff, and reopen contracts | `packages/contracts/src/markdown.ts` | Discriminated commands and immutable record schemas with actor/time snapshots. |
| `packages/database/src/schema.ts` | Drizzle schema for memberships, audit, evidence, and close snapshots | New package; package shape follows `packages/adapters` | Provider code stays outside domain/contracts; indexes and constraints are explicit. |
| `packages/database/drizzle/0001_phase_08_foundation.sql` | Versioned Postgres migration | No prior database package | Idempotent migration where possible, append-only protection, store-scoped indexes, audit comments. |
| `apps/api/src/auth.ts` | AuthProvider and authorization middleware | `apps/api/src/index.ts` dependency-injected sync/alert services | Small ports with in-memory fakes; handlers never trust role/store from payloads. |
| `apps/api/src/audit.ts` | Recorder, query service, and routes | `createInMemorySyncCommandService` | Service/repository injection, idempotency, typed parsing, sanitized errors. |
| `apps/api/src/evidence.ts` | Private evidence upload/read/invalidation service | `apps/api/src/index.ts` provider seams | R2 hidden behind `EvidenceStore`; generated keys, streaming, MIME/size limits. |
| `apps/api/src/shift-close.ts` | Central revalidation, snapshot, handoff, reopen | Sync service seam | Transactional service with explicit repository and clock dependencies. |
| `apps/mobile/src/capture/repository.ts` | Local-first ports | Existing sync/markdown/alert methods | Add typed methods without leaking Expo/R2/Neon SDKs. |
| `apps/mobile/src/capture/sqlite-repository.ts` | Evidence queue, local audit, close outbox | Existing `sync_commands`, `sync_conflicts`, and transactions | Separate upload queue, strict row mapping, `withTransactionAsync` for coupled writes. |
| `apps/mobile/src/capture/TodayScreen.tsx` | Entry to shift close | Existing safety verdict and sync band | Safety remains first; role-aware close entry follows cache/sync state. |
| `apps/mobile/src/capture/ShiftCloseScreen.tsx` | Progressive close flow | `TaskResolutionPanel.tsx`, `ConfirmationSheet.tsx` | Full-screen progression, 48dp targets, operational PT-BR copy, no modal wizard. |
| `apps/mobile/src/capture/AuditTimeline.tsx` | Contextual history | Existing task rows/status notices | Reverse chronology, two timestamps, explicit pending/conflict labels. |
| `apps/mobile/src/capture/EvidenceStatus.tsx` | Evidence lifecycle and retry | `offline-sync-ui.tsx` | Text plus structure for every state; central availability only after ack. |
| `apps/web/src/App.tsx` | Leadership/admin shell | Existing smoke app plus approved UI-SPEC | Preserve smoke health path while routing to audit and memberships. |
| `apps/web/src/audit/*` | Store-scoped audit workbench | shadcn `Button`; UI-SPEC approved primitives | Dense table/list, persistent filters, cursor loading, Sheet detail, no metric cards. |
| `apps/web/src/memberships/*` | Admin role/store management | Audit shell and AlertDialog | Identity read-only, explicit store/role, impact confirmation, no implicit lead power. |

## Existing Code Excerpts

### Dependency-injected API seam

`apps/api/src/index.ts` creates services outside route behavior:

```ts
export function createApiApp(input?: { syncCommandService?: SyncCommandService }): Hono {
  const syncCommandService = input?.syncCommandService ?? createInMemorySyncCommandService();
}
```

Phase 8 keeps this construction pattern, but moves authorization, audit, evidence, and close services into focused modules so `index.ts` remains composition-only.

### Strict runtime boundary

Contracts use `.strict()` and `superRefine` for cross-field invariants. New actor, audit, evidence, and close schemas must parse all API/repository boundaries and reject client-supplied authorization context and raw evidence material.

### Local transaction and mapping

`sqlite-repository.ts` wraps coupled state changes in `withTransactionAsync` and maps stored rows through Zod. Evidence upload creation, local event creation, close snapshot/outbox creation, and ack reconciliation should use the same pattern.

### Mobile information hierarchy

`TodayScreen.tsx` already renders safety before cache/sync/conflicts and tasks. Phase 8 inserts `Revisar fechamento do turno` after safety/cache/sync and routes to a progressive screen. It must not replace `Hoje` or turn an unsafe close into a success state.

### Web design system

`apps/web/src/index.css` already maps the approved dominant, accent, warning, critical, border, and typography tokens from `08-UI-SPEC.md`. New web work should consume these variables and official shadcn primitives rather than adding a parallel palette or dashboard block.

## Testing Patterns

- Domain tests exercise pure matrices and discriminated outcomes with deterministic timestamps.
- Contract tests parse valid fictitious payloads and assert strict rejection of extra, privileged, binary, and signed-URL fields.
- API tests call `createApiApp` with fakes and assert both allowed and cross-store denied paths.
- Mobile repository tests use deterministic IDs/clocks and source assertions for SQLite tables, transactions, and forbidden fields.
- Mobile component tests mock React Native primitives and assert visible PT-BR copy plus accessibility labels.
- Web tests use Testing Library; E2E remains Playwright with keyboard/focus checks.
- Database migration assertions run against a temporary Neon branch before production and verify constraints, indexes, idempotency, and append-only behavior.

## Landmines

- Never derive operational role/store from request body or JWT custom claims alone.
- Never use an admin role as implicit lead authority for a store.
- Never query by target ID without applying `store_id` in the same repository operation.
- Never reconstruct audit history later from mutable current rows; record events with the domain change.
- Never mark evidence uploaded from connectivity or local file presence; only central storage ack qualifies.
- Never persist signed URLs, bytes, base64, device URIs, headers, tokens, or raw request payloads.
- Never allow stale/offline state to produce a safe close. Unsafe close remains available with required handoff.
- Never update or delete historical audit/close snapshots; corrections create linked events/revisions.
- Never turn the web surface into analytics, rankings, cross-store comparison, or decorative dashboard cards.
