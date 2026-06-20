---
phase: 06-markdown-rebaixa-workflow
plan: "01"
subsystem: domain-contracts
tags: [markdown, rebaixa, tasks, zod, evidence]

requires:
  - phase: 05-push-and-escalation
    provides: persistent task alerts and escalation vocabulary
provides:
  - Pure markdown lifecycle eligibility and stage-task policy
  - Extended Today task resolution/action vocabulary for markdown stages
  - Strict markdown workflow, command, and evidence contracts
affects: [mobile, today-tasks, alerts, sqlite, phase-06]

tech-stack:
  added: []
  patterns: [pure-domain-policy, strict-zod-contracts, metadata-only-evidence]

key-files:
  created:
    - packages/domain/src/markdown.ts
    - packages/domain/src/markdown.test.ts
    - packages/contracts/src/markdown.ts
    - packages/contracts/src/markdown.test.ts
  modified:
    - packages/domain/src/tasks.ts
    - packages/domain/src/tasks.test.ts
    - packages/domain/src/alerts.ts
    - packages/domain/src/alerts.test.ts
    - packages/domain/src/index.ts
    - packages/contracts/src/tasks.ts
    - packages/contracts/src/tasks.test.ts
    - packages/contracts/src/index.ts

key-decisions:
  - "Markdown starts as a pure domain policy before mobile persistence or UI."
  - "Application and shelf confirmation evidence remain metadata-only: photo placeholder or explicit no-photo reason."
  - "Active markdown tasks carry workflow id and active stage metadata on Today task records."

patterns-established:
  - "Markdown stage policy derives Today task required resolutions, owners, due buckets, and severity from workflow status."
  - "Contract command schemas enforce early justification, rejection reason, and completed evidence at runtime boundaries."

requirements-completed: [MRK-01, MRK-02, MRK-03, MRK-04]

duration: 7 min
completed: 2026-06-20
---

# Phase 06 Plan 01: Domain Markdown Lifecycle And Runtime Contracts Summary

**Typed markdown lifecycle policy with strict request, approval, application, shelf-confirmation, and metadata-only evidence contracts**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-20T22:47:00Z
- **Completed:** 2026-06-20T22:53:48Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added pure domain markdown eligibility, presence gating, request reasons, workflow statuses, and stage-task derivation.
- Extended Today task required resolutions/actions for approval, rejection, application, and shelf confirmation.
- Added strict Zod contracts for markdown workflow records and commands, including rejection reason and evidence rules.
- Preserved privacy-safe alert copy for markdown stages without leaking lot identity.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pure markdown lifecycle policy and task vocabulary** - `8786b32` (feat)
2. **Task 1 typecheck fix: Omit absent markdown confirmation** - `3df8115` (fix)
3. **Task 2: Add strict markdown runtime contracts** - `feb7410` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `packages/domain/src/markdown.ts` - Pure markdown start eligibility and stage task candidate policy.
- `packages/domain/src/markdown.test.ts` - Presence, early exception, and stage policy coverage.
- `packages/domain/src/tasks.ts` - Markdown stage required resolutions and compatible actions.
- `packages/domain/src/alerts.ts` - Privacy-safe notification labels for markdown stages.
- `packages/contracts/src/markdown.ts` - Strict markdown workflow and command schemas.
- `packages/contracts/src/markdown.test.ts` - Runtime validation and unsafe evidence rejection coverage.
- `packages/contracts/src/tasks.ts` - Optional markdown workflow metadata on Today tasks.

## Decisions Made

- Kept all workflow policy in `packages/domain` free of Zod, React Native, SQLite, Expo, Hono, fetch, or provider imports.
- Treated early markdown as an approval-gated exception, never direct application.
- Reused the existing evidence metadata model and rejected URI/base64/object-key style fields at contract boundaries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type correctness] Optional confirmation passed as explicit undefined**
- **Found during:** Task 2 (contracts typecheck)
- **Issue:** `exactOptionalPropertyTypes` rejects passing `confirmation: undefined` to the physical freshness helper.
- **Fix:** Omit the optional property when no confirmation exists.
- **Files modified:** `packages/domain/src/markdown.ts`
- **Verification:** `pnpm.cmd --filter @validade-zero/contracts typecheck`
- **Committed in:** `3df8115`

---

**Total deviations:** 1 auto-fixed (type correctness).
**Impact on plan:** No scope change; the helper remains pure and stricter for downstream consumers.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- markdown` - passed
- `pnpm.cmd --filter @validade-zero/domain test -- tasks` - passed
- `pnpm.cmd --filter @validade-zero/domain test -- alerts` - passed
- `pnpm.cmd --filter @validade-zero/contracts test -- markdown` - passed
- `pnpm.cmd --filter @validade-zero/contracts test -- tasks` - passed
- `pnpm.cmd --filter @validade-zero/contracts typecheck` - passed

## Next Phase Readiness

Ready for Plan 06-02: mobile repositories can now coordinate local markdown workflows through typed domain policy and runtime contracts.

---
*Phase: 06-markdown-rebaixa-workflow*
*Completed: 2026-06-20*
