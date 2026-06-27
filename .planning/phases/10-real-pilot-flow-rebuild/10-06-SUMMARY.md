---
phase: 10-real-pilot-flow-rebuild
plan: "06"
subsystem: release-truth
tags: [shift-close, uat, playwright, maestro, security, performance, migration]

requires:
  - phase: 10-real-pilot-flow-rebuild
    provides: Central prepare-turn, central capture truth, Command Center projection, role-scoped access, central alerts, and terminal sync taxonomy.
provides:
  - Central shift-close revalidation using capture prepare-turn truth.
  - Mobile and web pilot UAT coverage for prepare-turn, product reuse, lot registration, Command Center consistency, and role/store denial.
  - Final release truth matrix separating repository readiness and Neon staging migration from Android/provider blockers.
affects: [phase-10, release-readiness, shift-close, command-center, mobile-uat]

tech-stack:
  added: []
  patterns:
    - "Safe shift close revalidates central capture immediately before acceptance."
    - "Installed-build and provider checks are recorded as blocked unless a real device/provider run exists."
    - "Public repo UAT records only fictional fixtures and sanitized command outcomes."

key-files:
  created:
    - .planning/phases/10-real-pilot-flow-rebuild/10-06-SUMMARY.md
    - .planning/phases/10-real-pilot-flow-rebuild/10-UAT.md
    - docs/operations/pilot-flow.md
  modified:
    - packages/domain/src/shift-close.ts
    - apps/api/src/shift-close.ts
    - apps/api/src/index.ts
    - apps/mobile/src/capture/ShiftCloseScreen.tsx
    - apps/mobile/src/capture/ShiftCloseReceipt.tsx
    - apps/mobile/src/capture/mobile-release-journeys.test.tsx
    - apps/web/e2e/v1-readiness.spec.ts
    - apps/web/e2e/fixtures/v1-readiness.ts
    - .planning/phases/10-real-pilot-flow-rebuild/10-VALIDATION.md
    - docs/testing/strategy.md

key-decisions:
  - "Safe shift close must fail closed on stale, empty, unavailable, active, draft, conflict, discarded, evidence, pending sync, or incomplete checklist blockers."
  - "Repository readiness can be green while Android installed-build and provider readiness remain blocked."
  - "Remote migration application is claimed only after a concrete Neon branch apply and remote schema verification."

patterns-established:
  - "Central prepare-turn can be reused as an authoritative read model for final safety gates."
  - "UAT docs record exact pass/block status instead of converting missing external systems into success."
  - "Security scans treat device URI-like evidence examples as unsafe even inside negative tests."

requirements-completed:
  - CAT-01
  - CAT-02
  - CAT-03
  - LOC-01
  - LOC-02
  - LOC-03
  - RSK-03
  - RSK-04
  - MRK-01
  - MRK-02
  - SYN-01
  - SYN-02
  - SYN-03
  - AUD-01
  - AUD-02
  - UI-01
  - UI-02
  - UI-03
  - UI-04

duration: inline
completed: 2026-06-27
---

# Phase 10 Plan 06 Summary

**Central shift close now uses capture truth, and Phase 10 closes with repository gates plus Neon staging migration passed and honest Android/provider blockers.**

## Performance

- **Duration:** Inline continuation
- **Started:** Continued after 10-05 completion
- **Completed:** 2026-06-27T00:56:56-03:00
- **Tasks:** 3
- **Files modified:** 19 implementation, test, docs, and planning files

## Accomplishments

- Rebuilt shift close as a central safety gate: API default revalidator calls capture `prepareTurn`, domain blockers include central active tasks/drafts/discards/stale reads, and mobile blocks pending unsafe outbox state.
- Added deterministic UAT coverage for auth gate, prepare-turn, central product reuse, lot registration, Command Center active/resolved consistency, and admin-only role/store denial.
- Wrote the pilot runbook, UAT record, and final validation matrix with exact pass/block outcomes, including Maestro blocked by zero connected devices and Neon staging migration verified after the target branch became available.

## Task Commits

1. **Task 1: Revalidate shift close against central capture blockers** - `07bc1d0` (feat)
2. **Task 2: Add end-to-end pilot journeys and UAT artifact** - `2d3cd94` (test)
3. **Task 3: Final docs, security, performance, and release truth gate** - `6b83ac5` (docs)

## Files Created/Modified

- `packages/domain/src/shift-close.ts` - Added Phase 10 central blockers and rule version.
- `apps/api/src/shift-close.ts` - Added capture-backed shift-close revalidator.
- `apps/api/src/index.ts` - Wires shift close to central capture by default.
- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - Blocks safe local evaluation when unsafe close outbox is pending.
- `apps/mobile/src/capture/ShiftCloseReceipt.tsx` - Distinguishes central safe receipt from locally pending unsafe receipt.
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx` - Covers prepare-turn, central product reuse, lot registration, and Hoje return.
- `apps/web/e2e/v1-readiness.spec.ts` - Covers active/resolved consistency and admin-only denial.
- `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` - Records UAT pass/block evidence.
- `docs/operations/pilot-flow.md` - Adds the real pilot operational runbook.
- `docs/testing/strategy.md` - Adds the Phase 10 test matrix.
- `packages/contracts/src/capture.test.ts` - Removes device URI-like fixture text so evidence safety scan passes.

## Decisions Made

- Safe close is not just a UI state: it must re-run central capture truth at API acceptance time.
- Local or pending unsafe close in the mobile outbox blocks the safe path until it is synchronized.
- Android and provider checks stay blocked until the environment provides a device/provider run. Remote migration evidence is scoped to Neon `validadeZero` staging (`br-sparkling-water-aczp28ll`).

## Deviations from Plan

### Auto-fixed Issues

**1. Security fixture text looked like a device evidence URI**
- **Found during:** Task 3 final security gate
- **Issue:** `pnpm.cmd security` failed on a negative contract test containing `file:///private/evidence.jpg`.
- **Fix:** Replaced it with `evidence-placeholder-ficticio` while keeping the schema rejection.
- **Files modified:** `packages/contracts/src/capture.test.ts`
- **Verification:** `pnpm.cmd security`, `pnpm.cmd --filter @validade-zero/contracts test -- capture`, and `pnpm.cmd check` passed.
- **Committed in:** `6b83ac5`

---

**Total deviations:** 1 auto-fixed security fixture cleanup
**Impact on plan:** No scope reduction; it made the public-repo safety gate truthful.

## Issues Encountered

- `pnpm.cmd test:e2e:mobile` is blocked because Maestro found zero connected devices: `Not enough devices connected (0) to run the requested number of shards (1).`
- The local git hook attempted automatic push earlier in the phase and GitHub was unreachable; commits remain local.

## Post-Close Migration Application

The Phase 10 database schema was applied to Neon project `validadeZero`, branch `staging` (`br-sparkling-water-aczp28ll`), with `drizzle-kit push --force` using an in-process `NEON_DATABASE_URL`. Remote verification found all 8 `central_*` tables, `central_products.normalized_key` as `NOT NULL`, and the critical unique indexes for normalized products, active projected tasks, and sync command idempotency.

## User Setup Required

For Android installed-build UAT, connect an emulator or pilot-safe device, install the controlled APK, then rerun:

```powershell
pnpm.cmd test:e2e:mobile
```

## Verification

- `pnpm.cmd --filter @validade-zero/domain test -- shift-close`
- `pnpm.cmd --filter @validade-zero/contracts test -- shift-close`
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- shift-close capture`
- `pnpm.cmd --filter @validade-zero/mobile test -- shift-close`
- `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys`
- `pnpm.cmd test:e2e:web`
- `pnpm.cmd security`
- `pnpm.cmd performance:budgets`
- `pnpm.cmd --filter @validade-zero/database db:check`
- `drizzle-kit push --force` against Neon `validadeZero` staging (`br-sparkling-water-aczp28ll`)
- Remote schema verification for Phase 10 `central_*` tables, `central_products.normalized_key`, and critical indexes
- `pnpm.cmd check`
- `pnpm.cmd test:e2e:mobile` blocked with zero connected devices

## Next Phase Readiness

Phase 10 repository work and Neon staging migration are complete. Release readiness still requires external validation: Android installed-build UAT and provider/push proof on approved infrastructure.

---
*Phase: 10-real-pilot-flow-rebuild*
*Completed: 2026-06-27*
