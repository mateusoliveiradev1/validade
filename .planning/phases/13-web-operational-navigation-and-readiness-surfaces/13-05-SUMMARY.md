---
phase: 13-web-operational-navigation-and-readiness-surfaces
plan: "05"
subsystem: web-ui
tags: [react, command-center, validacao, go-no-go, playwright, evidence-safety]

requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-01 route foundation and shared projection host
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-02 Operacao daily safety route
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-03 Aparelhos device readiness route
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-04 Atualizacoes approved build route
provides:
  - Dedicated Validacao route for Loja 18 UAT and rollout proof
  - Explicit Go, No-Go, and Aguardando prova externa verdict synthesis
  - Public-safe checklist, blocker, timestamp, and masked-device evidence rows
  - Cross-route references to Aparelhos, Atualizacoes, and Operacao
  - Playwright proof that route-specific truths stay separated
affects: [phase-13, validacao-route, go-no-go, web-e2e, release-readiness]

tech-stack:
  added: []
  patterns: [route-owned-actions, public-safe-validation-proof, route-split-e2e]

key-files:
  created:
    - apps/web/src/command-center/ValidacaoRoute.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/App.test.tsx
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center-view-model.ts
    - apps/web/src/command-center/command-center.test.tsx
    - apps/web/src/command-center/AparelhosRoute.tsx
    - apps/web/src/command-center/AtualizacoesRoute.tsx
    - apps/web/src/command-center/OperacaoRoute.tsx
    - apps/web/e2e/v1-readiness.spec.ts

key-decisions:
  - "Validacao owns Go/No-Go synthesis and Loja 18 rollout proof."
  - "Validacao references Aparelhos, Atualizacoes, and Operacao instead of duplicating their actions."
  - "Approved APK artifact labels remain in Atualizacoes; Validacao shows sanitized device/build status only."

patterns-established:
  - "Validation verdict derives from UAT states, pilot blockers, device readiness, and build compatibility."
  - "Cross-route action references navigate to the owning route while gated actions remain there."
  - "Playwright route journey asserts absence as well as presence for daily, device, update, and validation content."

requirements-completed: ["WEB-01", "WEB-02", "WEB-03", "WEB-04", "WEB-05"]

duration: 13 min
completed: 2026-06-29
---

# Phase 13 Plan 05: Validacao Route Summary

**Loja 18 validation room with explicit Go/No-Go synthesis, public-safe evidence rows, and route-separated Playwright coverage**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-29T02:17:00Z
- **Completed:** 2026-06-29T02:30:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `ValidacaoRoute.tsx` with explicit `Go`, `No-Go`, and `Aguardando prova externa` verdict labels.
- Derived the validation verdict from UAT step state, pilot blockers, device readiness, and build compatibility.
- Rendered Loja 18 checklist rows with public-safe state, cause, `Agora:`, timestamps, evidence reference labels, and masked device references.
- Added cross-route references: `Resolver push em Aparelhos`, `Resolver atualizacao em Atualizacoes`, and `Revisar operacao diaria em Operacao`.
- Updated Playwright to prove Operacao, Aparelhos, Atualizacoes, and Validacao each own the right truth and hide the wrong one.
- Ran final repository gates through `cmd /c pnpm.cmd check`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Validacao route with explicit Go/No-Go** - `f1074a5` (feat)
2. **Task 2: Update Playwright route journey and fixture coverage** - `13d6c75` (test)
3. **Task 3: Run final web and repository gates** - `e049570` (chore)

## Files Created/Modified

- `apps/web/src/command-center/ValidacaoRoute.tsx` - Dedicated Loja 18 validation and Go/No-Go route.
- `apps/web/src/command-center/command-center-view-model.ts` - Adds validation verdict and route-reference helpers.
- `apps/web/src/command-center/CommandCenter.tsx` - Dispatches `activeRoute="validacao"` to the dedicated route.
- `apps/web/src/App.tsx` - Passes route navigation callbacks for validation cross-route references.
- `apps/web/src/command-center/command-center.test.tsx` - Covers Validacao content, public-safe denylist, and cross-route references.
- `apps/web/e2e/v1-readiness.spec.ts` - Covers the full route split journey and admin fail-closed navigation.
- `apps/web/src/command-center/AparelhosRoute.tsx` - Lint-safe push test action and formatting.
- `apps/web/src/command-center/AtualizacoesRoute.tsx` - Formatting.
- `apps/web/src/command-center/OperacaoRoute.tsx` - Formatting.
- `apps/web/src/App.test.tsx` - Formatting.

## Decisions Made

- `No-Go` is used whenever any UAT step is blocked or a critical pilot blocker exists.
- `Aguardando prova externa` is used for external blockers, pending UAT steps, non-apto devices, or non-current builds when there is no critical blocker.
- Validacao does not render `phase-12-staging-apk-120`; that approved artifact truth remains owned by Atualizacoes.
- The validation route can navigate to owning routes, but it does not trigger safe push tests or update-link actions directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Route boundary] Removed approved artifact duplication from Validacao**
- **Found during:** Task 2 (Playwright route journey)
- **Issue:** Validacao initially showed the approved artifact label, which weakened the requirement that Atualizacoes owns APK/build truth.
- **Fix:** Validacao now shows compatibility and installed version only, while `phase-12-staging-apk-120` appears after navigating to Atualizacoes.
- **Files modified:** `apps/web/src/command-center/ValidacaoRoute.tsx`, `apps/web/src/command-center/command-center.test.tsx`, `apps/web/e2e/v1-readiness.spec.ts`
- **Verification:** `cmd /c pnpm.cmd test:e2e:web`
- **Committed in:** `13d6c75`

**2. [Rule 3 - Blocking] Fixed final lint failures**
- **Found during:** Task 3 (`cmd /c pnpm.cmd check`)
- **Issue:** Full lint caught an unused icon import, an async button handler, and a redundant optional type.
- **Fix:** Removed the unused import, converted the push test click handler to void a promise chain, and simplified the optional parameter type.
- **Files modified:** `apps/web/src/command-center/AparelhosRoute.tsx`, `apps/web/src/command-center/command-center-view-model.ts`
- **Verification:** `cmd /c pnpm.cmd check`
- **Committed in:** `e049570`

**3. [Rule 3 - Blocking] Applied Prettier formatting**
- **Found during:** Task 3 (`cmd /c pnpm.cmd check`)
- **Issue:** `format:check` found Phase 13 web files outside repository style.
- **Fix:** Ran `cmd /c pnpm.cmd format` and committed the resulting formatting.
- **Files modified:** Phase 13 web route/test files listed above.
- **Verification:** `cmd /c pnpm.cmd check`
- **Committed in:** `e049570`

---

**Total deviations:** 3 auto-fixed (1 route boundary, 2 blocking gate fixes).
**Impact on plan:** The fixes tightened Phase 13 boundaries and were required for the final repository gate. No product scope was added.

## Issues Encountered

- Playwright selectors that were valid for the old all-in-one screen were too broad after route splitting. They were scoped to the main navigation and exact route headings.
- Vite logged proxy errors for `/session/stores` during Playwright runs, but the mocked route tests still passed and the command exited 0.
- Vite build emitted the existing chunk-size warning; performance budgets passed.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files and 38 tests
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed
- `cmd /c pnpm.cmd test:e2e:web` - passed, 6 tests
- `cmd /c pnpm.cmd check` - passed
  - Typecheck: 9 packages
  - Lint/boundaries/format: passed
  - Unit tests: 85 files, 573 tests
  - Smoke tests: 56 files, 304 tests
  - Build/security/UI readiness: passed
  - Performance budgets: web JS 134569 B gzip, CSS 7845 B gzip

## Next Phase Readiness

Phase 13 now has durable web routes for Operacao, Aparelhos, Atualizacoes, and Validacao. Phase 14 can build mobile Ajustes using the same readiness vocabulary without forcing push, sync, build, or validation diagnostics back into the daily sales-area flow.

---
*Phase: 13-web-operational-navigation-and-readiness-surfaces*
*Completed: 2026-06-29*
