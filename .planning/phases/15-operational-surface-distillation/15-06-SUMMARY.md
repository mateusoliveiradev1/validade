---
phase: 15-operational-surface-distillation
plan: "06"
subsystem: web-docs-validation
tags: [command-center, validation, testing, public-safe-copy, final-gate]

requires:
  - phase: 15-operational-surface-distillation
    provides: Strict shift-close blockers and public-safe mobile readiness vocabulary
provides:
  - Command Center vocabulary aligned with mobile readiness terms
  - Public-label contract coverage for device readiness blockers
  - Final Phase 15 validation evidence with external proof boundaries
affects: [command-center, validation, testing-docs, mobile-format, api-tests]

tech-stack:
  added: []
  patterns:
    - Web routes use the same public operational labels as mobile readiness surfaces
    - Final validation records command evidence separately from physical/provider/device proof

key-files:
  created:
    - .planning/phases/15-operational-surface-distillation/15-06-SUMMARY.md
  modified:
    - apps/web/src/command-center/command-center-view-model.ts
    - apps/web/src/command-center/OperacaoRoute.tsx
    - apps/web/src/command-center/AparelhosRoute.tsx
    - apps/web/src/command-center/AtualizacoesRoute.tsx
    - apps/web/src/command-center/ValidacaoRoute.tsx
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center.test.tsx
    - packages/contracts/src/command-center.test.ts
    - apps/api/src/shift-close.test.ts
    - eslint.config.mjs
    - docs/testing/strategy.md
    - .planning/phases/15-operational-surface-distillation/15-VALIDATION.md

key-decisions:
  - "Command Center uses `leitura central`, `fila local`, `fila de sincronizacao`, `push`, `camera`, `build`, `autorizacao do aparelho`, `revisao de produto`, and `lote sincronizado`."
  - "Aparelhos owns push/camera/device authorization details, Atualizacoes owns build detail, and Operacao owns product review, local queue/sync, and shift-close detail."
  - "Phase 15 validation is repository-complete only; installed Android/provider/camera/physical UAT proof remains external."

patterns-established:
  - "Route reference copy names the owning surface instead of duplicating diagnostics in Validacao."
  - "Final validation files must record failed gate attempts and auto-fixes before marking nyquist complete."

requirements-completed: ["OPS-01", "OPS-02", "OPS-03", "OPS-04"]

duration: 16 min
completed: 2026-06-30
---

# Phase 15 Plan 06: Final Validation and Web Vocabulary Summary

**Command Center now speaks the same public readiness vocabulary as Hoje, Ajustes, and Fechamento, and Phase 15 closes with full repository gates plus explicit external proof boundaries.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-30T10:53:00Z
- **Completed:** 2026-06-30T11:09:00Z
- **Tasks:** 3
- **Files modified:** 12 primary files plus formatting/gate support files

## Accomplishments

- Updated Command Center route references and daily/readiness labels so leadership sees the same concepts as mobile.
- Added tests protecting public labels for device readiness blockers and web route ownership.
- Ran focused mobile/domain/contracts/web tests, `security:evidence`, and full `pnpm check`.
- Replaced draft validation with `15-VALIDATION.md` final evidence and added Phase 15 testing guidance to `docs/testing/strategy.md`.

## Task Commits

1. **Task 1: Align web readiness vocabulary and route references** - `d2cf6ebf` (feat)
2. **Task 2: Tighten Command Center contracts/tests for public labels** - `9d6d38ff` (test)
3. **Task 3: Run final gates and fix repository gate issues** - `a0a36ba8` (test)

## Files Created/Modified

- `apps/web/src/command-center/*` - Aligns labels and route references across Operacao, Aparelhos, Atualizacoes, Validacao, and legacy CommandCenter helpers.
- `apps/web/src/command-center/command-center.test.tsx` - Asserts Phase 15 public vocabulary and route ownership.
- `packages/contracts/src/command-center.test.ts` - Protects public device readiness labels and denylist behavior.
- `apps/api/src/shift-close.test.ts` - Aligns unsafe close API expectation with strict missing-central `cannot_evaluate` semantics.
- `eslint.config.mjs` - Adds the Phase 15 product policy test to the type-aware allowlist.
- `docs/testing/strategy.md` - Adds Phase 15 testing and external proof boundaries.
- `.planning/phases/15-operational-surface-distillation/15-VALIDATION.md` - Records final command evidence and Nyquist status.

## Decisions Made

- `docs/testing.md` was not present; the Phase 15 testing note was added to the existing [docs/testing/strategy.md](/C:/Users/Liiiraa/Documents/estudos/validade/docs/testing/strategy.md).
- `pnpm check` remains the final repository gate; Android/provider/camera/physical UAT are not inferred from it.
- The web copy says `build` and `autorizacao do aparelho` where readiness is being summarized; installation instructions may still mention app/APK only as a physical installation object.

## Deviations from Plan

### Auto-fixed Issues

**1. Final gate found lint/config drift from earlier Phase 15 files**
- **Found during:** Task 3 (`cmd /c pnpm.cmd check`)
- **Issue:** `prepareTurnNotice` was unused, `product-policy.test.ts` was missing from the ESLint type-aware allowlist, and a destructured `_central` variable triggered lint.
- **Fix:** Removed the unused helper, added the allowlist entry, and rewrote the test without an unused binding.
- **Files modified:** `apps/mobile/src/capture/TodayScreen.tsx`, `eslint.config.mjs`, `packages/domain/src/shift-close.test.ts`
- **Verification:** `cmd /c pnpm.cmd check` passed.
- **Committed in:** `a0a36ba8`

**2. Formatting drift accumulated across touched Phase 15 files**
- **Found during:** Task 3 (`cmd /c pnpm.cmd check`)
- **Issue:** Prettier reported 11 touched files.
- **Fix:** Ran Prettier on only those Phase 15 files.
- **Files modified:** Mobile capture files, web Command Center files, and domain policy/shift-close files.
- **Verification:** `cmd /c pnpm.cmd check` passed format and full gates.
- **Committed in:** `a0a36ba8`

**3. API seam expectation needed the new strict missing-central semantics**
- **Found during:** Task 3 (`cmd /c pnpm.cmd check`)
- **Issue:** The API unsafe-close test expected `must_close_unsafe`, but missing central revalidation now evaluates as `cannot_evaluate`.
- **Fix:** Updated the API test expectation while preserving unsafe handoff persistence.
- **Files modified:** `apps/api/src/shift-close.test.ts`
- **Verification:** Full Vitest and `pnpm check` passed.
- **Committed in:** `a0a36ba8`

**Total deviations:** 3 auto-fixed. **Impact on plan:** No user-facing scope expansion; the final gate became stricter and fully green.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - passed, 36 files / 234 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - passed, 14 files / 145 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - passed, 11 files / 101 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files / 38 tests.
- `cmd /c pnpm.cmd security:evidence` - passed, 423 tracked text files checked.
- `cmd /c pnpm.cmd check` - passed: typecheck, lint/boundaries, format, full tests, smoke tests, build, security, and performance budgets.

## Final Gate Details

- Full Vitest: 88 files / 653 tests passed.
- Smoke Vitest: 57 files / 356 tests passed.
- Build: 9 packages successful.
- Security: env, secret, real-data, sensitive-evidence, UI-release, and package security gates passed.
- Performance budgets: web JavaScript 130808 B gzip and web CSS 7852 B gzip.

## Self-Check: PASSED

- Web rendered text uses `leitura central`, `fila local`, `fila de sincronizacao`, `push`, `camera`, `build`, and `autorizacao do aparelho`.
- Build blockers route to Atualizacoes; push/camera/device blockers route to Aparelhos; product review, sync, and shift close route to Operacao.
- Phase 15 validation does not claim installed Android/provider/camera/physical Loja 18 UAT proof.
- Sensitive evidence checks pass after all generated/updated docs.

## Remaining External Proof Boundaries

- Installed approved Android APK proof.
- Real provider push delivery/open proof.
- Real camera/evidence capture or approved no-photo fallback.
- Second-device physical convergence.
- Physical Loja 18 UAT with real product and lot input.

## User Setup Required

None for repository validation. External proof requires an approved Android device/build and controlled Loja 18 run.

## Next Phase Readiness

Ready for Phase 16, where the cleaned operational surfaces can be used to run and document Loja 18 validation without polluting the daily workflow.

---
*Phase: 15-operational-surface-distillation*
*Completed: 2026-06-30*
