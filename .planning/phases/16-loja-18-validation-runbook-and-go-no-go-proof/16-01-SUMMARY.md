---
phase: 16-loja-18-validation-runbook-and-go-no-go-proof
plan: "01"
subsystem: contracts
tags: [zod, command-center, uat, public-safe-evidence]
requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: Dedicated Validacao route and Go/No-Go boundary
provides:
  - Validation text denylist for private URLs, tokens, raw device markers, provider receipts, photo references, object keys, and binary payload markers
  - Mandatory nine-step Loja 18 UAT order enforcement
  - Contract tests for manual-pass rejection and external blocker ownership
affects: [phase-16, command-center, validacao, security-evidence]
tech-stack:
  added: []
  patterns: [zod-super-refine-runbook-order, public-safe-negative-fixtures]
key-files:
  created:
    - .planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-01-SUMMARY.md
  modified:
    - packages/contracts/src/command-center.ts
    - packages/contracts/src/command-center.test.ts
    - scripts/check-no-sensitive-evidence.mjs
key-decisions:
  - "Public validation text rejects private URL schemes, provider/build/device/photo/object/binary markers before API or web can render them."
  - "The Loja 18 UAT runbook order is enforced by the runtime contract, not only by UI tests."
  - "Named negative fixtures are allowed in the evidence scanner only when they live in test/spec rejection cases."
patterns-established:
  - "Public-safe evidence tests can include forbidden markers only as named rejection fixtures."
  - "Runbook steps are schema-ordered using PILOT_UAT_STEP_IDS as the single source of truth."
requirements-completed: ["VAL-01", "VAL-02", "VAL-03"]
duration: 6min
completed: 2026-07-01
---

# Phase 16 Plan 01: Validation Contract Summary

**Runtime contracts now enforce the exact Loja 18 validation sequence and reject sensitive proof text before API or web projection.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-01T12:00:00Z
- **Completed:** 2026-07-01T12:06:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended `PublicSafeTextSchema` denial to validation-specific private markers including raw device ids, provider tickets/receipts, photo/object references, private URI schemes, and base64 markers.
- Enforced the exact nine-step Loja 18 UAT sequence in `PilotUatChecklistSchema`.
- Added contract tests for duplicate, missing, extra, reordered, and manual-pass UAT step shapes.
- Added blocker tests proving external severity requires external ownership, and actionable critical blockers remain operator-owned and causal.

## Task Commits

1. **Tasks 1-3: Harden validation contract safety** - `ac87f32` (test)

**Plan metadata:** pending

## Files Created/Modified

- `packages/contracts/src/command-center.ts` - Adds the expanded public evidence denylist and mandatory runbook-order validation.
- `packages/contracts/src/command-center.test.ts` - Adds negative and positive fixtures for sensitive markers, UAT ordering, manual pass rejection, and blocker ownership.
- `scripts/check-no-sensitive-evidence.mjs` - Allows the exact private URI strings used as named rejection fixtures in tests.

## Decisions Made

- Public-safe validation text must reject private evidence markers at the contract layer before API or web rendering.
- UAT ordering belongs in the schema because every downstream surface depends on the same mandatory sequence.
- The evidence scanner may allow exact test rejection fixtures, but only through its existing test/spec fixture allowlist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Allowed named private URI rejection fixtures**
- **Found during:** Task 1 verification (`cmd /c pnpm.cmd security:evidence`)
- **Issue:** The security evidence scanner correctly flagged new negative fixtures containing `file://`, `content://`, and `ph://` as possible device-local evidence.
- **Fix:** Added those exact strings to the scanner's named rejection-fixture allowlist, preserving the real evidence scan while allowing contract denial tests.
- **Files modified:** `scripts/check-no-sensitive-evidence.mjs`
- **Verification:** `cmd /c pnpm.cmd security:evidence` passed.
- **Committed in:** `ac87f32`

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** No scope creep. The scanner remains strict for real tracked evidence and only allows exact negative fixtures inside tests.

## Issues Encountered

- The local post-commit push hook could not push `main` because `origin/main` is ahead; the commit remains local and will need synchronization before a final push.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 103 tests.
- `cmd /c pnpm.cmd security:evidence` - passed, 453 tracked text files scanned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `16-02`: API derivation can rely on the stricter validation contract and public-safe evidence boundary.

---
*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Completed: 2026-07-01*
