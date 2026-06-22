---
phase: 08-audit-roles-and-shift-close
plan: "03"
subsystem: evidence
tags: [evidence, offline-sync, mobile, api, web-admin, privacy, retention]

requires:
  - phase: 08-audit-roles-and-shift-close
    provides: role/store authorization from 08-01 and append-only audit/event projection from 08-02
provides:
  - Metadata-only evidence contracts, pure lifecycle rules, and retention helpers
  - Private EvidenceStore port with in-memory/R2-compatible adapters
  - Store-scoped evidence API for upload intent, central ack, metadata read, invalidation, and exceptional access audit
  - Separate mobile SQLite/memory evidence upload queue with retry and ack reconciliation
  - Mobile evidence status/invalidation UI and web exceptional access confirmation
  - 90-day evidence lifecycle operations documentation
affects: [evidence, audit, offline-sync, mobile-capture, web-admin, api-security]

tech-stack:
  added: []
  patterns:
    - Local evidence files stay in the mobile evidence upload queue and never enter command sync.
    - Evidence becomes uploaded only after private-store put/head acknowledgement.
    - Postgres stores metadata and opaque server object references only; public contracts reject raw evidence fields.
    - Exceptional cross-store evidence access requires target-store confirmation and an audit reason.

key-files:
  created:
    - packages/domain/src/evidence.ts
    - packages/contracts/src/evidence.ts
    - packages/adapters/src/evidence.ts
    - packages/database/src/evidence-repository.ts
    - packages/database/drizzle/0002_phase_08_evidence.sql
    - apps/api/src/evidence.ts
    - apps/mobile/src/capture/evidence-upload.ts
    - apps/mobile/src/capture/EvidenceStatus.tsx
    - apps/mobile/src/capture/EvidenceInvalidationPanel.tsx
    - apps/web/src/audit/EvidenceAccessConfirm.tsx
    - apps/web/src/components/ui/alert-dialog.tsx
    - docs/operations/evidence-lifecycle.md
  modified:
    - apps/api/src/index.ts
    - apps/api/wrangler.toml
    - apps/mobile/src/capture/repository.ts
    - apps/mobile/src/capture/memory-repository.ts
    - apps/mobile/src/capture/sqlite-repository.ts
    - apps/mobile/src/capture/TaskResolutionPanel.tsx
    - apps/web/src/audit/AuditEventDetail.tsx
    - packages/database/src/schema.ts
    - packages/contracts/src/tasks.ts
    - vitest.config.ts
    - eslint.config.mjs

key-decisions:
  - "Only central private-store acknowledgement can produce `Evidência enviada`; local capture and connectivity are not proof."
  - "Evidence upload is a separate queue from command sync so device file paths never ride with operational commands."
  - "Evidence invalidation preserves original metadata/history and may link a replacement instead of mutating proof."
  - "Admin cross-store evidence reads are exceptional and audited; ordinary denials reveal no storage detail."

patterns-established:
  - "EvidenceAssetMetadata is the public metadata boundary; object keys and signed links stay server/private."
  - "EvidenceUploadRunner is dependency-injected so mobile retry, local-file reads, and API calls remain testable."
  - "EvidenceAccessConfirm centralizes same-store, exceptional admin, and denied evidence access copy."
  - "R2 lifecycle is documented as 90 days, with metadata expiry reconciliation after object removal."

requirements-completed: [AUD-03]

duration: 90min
completed: 2026-06-22
status: complete
---

# Phase 08 Plan 03: Offline Evidence Queue, Private Storage Lifecycle, and Controlled Access Summary

**Private evidence now has an offline capture queue, central ack authority, store-scoped access, invalidation, and retention documentation.**

## Performance

- **Duration:** 90 min including inline recovery from partial work
- **Completed:** 2026-06-22T16:20:40Z
- **Tasks:** 2
- **Files modified:** 58 source/config/docs files plus this summary

## Accomplishments

- Added pure evidence lifecycle rules for upload request, uploading, uploaded, failed, invalidated, and expired states, including the 90-day retention deadline from central acknowledgement time.
- Added strict contracts for evidence targets, upload intent, metadata, acknowledgement, invalidation, and exceptional access. Contracts reject raw evidence/storage fields at runtime.
- Added `evidence_assets` schema/migration and repository support with store-scoped lookup, idempotency, metadata-only columns, retention indexes, and no public binary/URL fields.
- Added `EvidenceStore` with verified in-memory storage and an R2-compatible adapter seam, plus API service/routes for intent creation, private-store ack, metadata reads, invalidation, and exceptional admin access auditing.
- Added mobile `evidence_uploads` queue APIs in memory and SQLite, a retryable upload runner, and visible status/invalidation components wired into task resolution.
- Added web evidence access confirmation for same-store, denied, and admin exceptional reads.
- Added `docs/operations/evidence-lifecycle.md` documenting fake/local mode, privacy limits, 90-day retention, recovery, and the rule that only central ack means `Evidência enviada`.
- Brought adapter tests into the root Vitest project and tightened lint/security fixtures so public-repo data checks now pass.

## Task Commit

1. **Task 1 + Task 2: Evidence lifecycle, private store, mobile queue, access UI, docs, and gates** - `de23db4` (`feat(08-03): add private evidence lifecycle`)

**Plan metadata:** this SUMMARY commit.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- evidence`
- `pnpm.cmd --filter @validade-zero/contracts test -- evidence`
- `pnpm.cmd --filter @validade-zero/database test -- evidence`
- `pnpm.cmd --filter @validade-zero/adapters test -- evidence`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- evidence`
- `pnpm.cmd vitest run --config vitest.config.ts --project mobile -- evidence-upload`
- `pnpm.cmd vitest run --config vitest.config.ts --project mobile -- evidence-status`
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- evidence-access`
- `pnpm.cmd test`
- `pnpm.cmd lint`
- `pnpm.cmd typecheck`
- `pnpm.cmd format:check`
- `pnpm.cmd security`
- `pnpm.cmd build`

## Deviations / Remaining Manual Validation

- A disposable Neon branch and real R2 test binding were not available in this session, so no external migration application or R2 lifecycle inspection was claimed.
- The migration, schema, repository, and metadata-only guarantees are covered by local tests and security scans; the real Neon/R2 lifecycle check remains a manual validation item for 08-05/release verification.

## Handoff to 08-04

- 08-04 can treat evidence as a real blocker input: local `waiting_upload`/`failed` evidence is not centrally available, while `uploaded` evidence is acknowledged.
- Shift-close logic should preserve the distinction between local capture and central evidence when deciding safe/unsafe close.
- Exceptional evidence access already writes an audit event and can be incorporated into the final Phase 8 E2E/security gate.
