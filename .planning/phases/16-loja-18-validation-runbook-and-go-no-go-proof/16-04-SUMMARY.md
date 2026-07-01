---
phase: 16-loja-18-validation-runbook-and-go-no-go-proof
plan: "04"
subsystem: web
tags: [command-center, validacao, go-no-go, runbook, public-safe-evidence]
requires:
  - phase: 16-loja-18-validation-runbook-and-go-no-go-proof
    provides: 16-03 external validation gates
provides:
  - Web Validacao verdict with reason and next action
  - Ordered nine-step Loja 18 runbook sequence
  - Route-owner shortcuts for Aparelhos, Atualizacoes, and Operacao
  - Public-safe validation evidence rendering and E2E coverage
affects: [phase-16, validacao, web-command-center]
tech-stack:
  added: []
  patterns: [projection-derived-verdict, route-owner-shortcuts, public-safe-validation-ui]
key-files:
  created:
    - .planning/phases/16-loja-18-validation-runbook-and-go-no-go-proof/16-04-SUMMARY.md
  modified:
    - apps/web/src/command-center/ValidacaoRoute.tsx
    - apps/web/src/command-center/command-center-view-model.ts
    - apps/web/src/command-center/command-center.test.tsx
    - apps/web/e2e/v1-readiness.spec.ts
    - apps/web/e2e/fixtures/v1-readiness.ts
    - apps/web/src/command-center/AtualizacoesRoute.tsx
key-decisions:
  - "Validacao renders UI-SPEC runbook labels while state, cause, action, evidence, and timestamps stay projection-derived."
  - "Go/No-Go copy names the blocking or missing proof and keeps the concrete next action visible in the verdict band."
  - "Validacao masks device proof into generic Loja 18 device/role labels and keeps artifact/update actions outside the route."
patterns-established:
  - "deriveValidationVerdict returns label, tone, detail, and nextAction for Go, No-Go, and external-proof states."
  - "Route owner buttons use short labels: Abrir Aparelhos, Abrir Atualizacoes, Abrir Operacao."
requirements-completed: ["VAL-01", "VAL-02", "VAL-03", "VAL-04"]
duration: 16min
completed: 2026-07-01
---

# Phase 16 Plan 04: Web Validacao Proof Surface Summary

**The web `Validacao` route now behaves as the Loja 18 proof sequencer instead of a manual checklist.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-01T12:07:00Z
- **Completed:** 2026-07-01T12:23:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended `deriveValidationVerdict` so each state returns a direct reason and concrete next action.
- Rendered the nine required Loja 18 runbook steps in the UI-SPEC order with stable, public-safe labels.
- Changed the refresh action to `Atualizar prova da validacao`.
- Added short route-owner shortcuts for `Aparelhos`, `Atualizacoes`, and `Operacao`.
- Kept push-test/update/manual pass actions out of `Validacao`.
- Masked validation device evidence to `Aparelho Loja 18 #N` plus generic Loja 18 role labels.
- Updated component and Playwright coverage for ordered sequence, public-safe copy, route ownership, and all verdict states.
- Aligned web readiness fixtures and update fallback copy with approved build/artifact `147`.

## Task Commits

1. **Tasks 1-3: Guide validation proof surface** - `70ac6f9` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/web/src/command-center/ValidacaoRoute.tsx` - Renders verdict next action, ordered runbook labels, masked device proof, and route-owner buttons.
- `apps/web/src/command-center/command-center-view-model.ts` - Derives Go/No-Go/external verdict details and route actions from projection facts.
- `apps/web/src/command-center/command-center.test.tsx` - Covers ordered validation UI, public-safe denylist, route ownership, and all verdict states.
- `apps/web/e2e/v1-readiness.spec.ts` - Proves route navigation, Validacao boundaries, ordered sequence, and privacy denylist in Playwright.
- `apps/web/e2e/fixtures/v1-readiness.ts` - Keeps the E2E fixture aligned to the approved `147` artifact.
- `apps/web/src/command-center/AtualizacoesRoute.tsx` - Keeps the update fallback build aligned to `147`.

## Decisions Made

- `Validacao` displays UI-SPEC labels for the runbook, but does not create local truth or manual pass state.
- Build/update truth remains visible in `Atualizacoes`; `Validacao` only references the owner route.
- Device proof inside `Validacao` is deliberately more generic than `Aparelhos` because it is public-safe validation evidence, not diagnostics.

## Deviations from Plan

- The E2E assertion for `Aparelhos` was updated from legacy `APK aprovado` to the current `Build aprovado` copy observed in the rendered route.

## Issues Encountered

- One web test run showed a transient `App.test.tsx` authorization-header race; immediate rerun passed without code changes.
- The local post-commit push hook still cannot push `main` because `origin/main` is ahead; commits remain local.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed on rerun, 9 files / 40 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed.
- `cmd /c pnpm.cmd test:e2e:web` - passed, 6 Playwright tests.
- `cmd /c pnpm.cmd security:evidence` - passed, 456 tracked text files scanned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `16-05`: close the Phase 16 validation artifacts, release notes, and final Go/No-Go blocker language without claiming real installed-device/provider/camera proof.

---
*Phase: 16-loja-18-validation-runbook-and-go-no-go-proof*
*Completed: 2026-07-01*
