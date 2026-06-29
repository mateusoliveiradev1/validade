---
phase: 13-web-operational-navigation-and-readiness-surfaces
plan: "04"
subsystem: web-ui
tags: [react, command-center, atualizacoes, build-truth, evidence-safety]

requires:
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-01 route foundation and shared projection host
  - phase: 13-web-operational-navigation-and-readiness-surfaces
    provides: 13-03 Aparelhos device readiness separation
provides:
  - Dedicated Atualizacoes route for approved build and installed-version truth
  - Compatibility-sorted installed device list
  - Manual/pending update path fallback with public-safe helper
  - Denylist tests for unsafe update path text
affects: [phase-13, atualizacoes-route, build-truth, release-readiness]

tech-stack:
  added: []
  patterns: [public-safe-update-path, build-compatibility-route]

key-files:
  created:
    - apps/web/src/command-center/AtualizacoesRoute.tsx
  modified:
    - apps/web/src/command-center/CommandCenter.tsx
    - apps/web/src/command-center/command-center-view-model.ts
    - apps/web/src/command-center/command-center.test.tsx

key-decisions:
  - "Atualizacoes owns approved artifact and installed-build comparison."
  - "No public APK/QR link is rendered by default; the route falls back to manual instructions."
  - "Unsafe update path values are blocked by helper logic before a link can be rendered."

patterns-established:
  - "Build compatibility rows sort incompativel, desatualizado, desconhecido, atual."
  - "Visible update copy avoids private-link/token vocabulary and tests enforce the denylist."

requirements-completed: ["WEB-04"]

duration: 5 min
completed: 2026-06-29
---

# Phase 13 Plan 04: Atualizacoes Route Summary

**Approved build and installed-version route with manual safe-update fallback and evidence-safety checks**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-29T02:11:00Z
- **Completed:** 2026-06-29T02:15:51Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `AtualizacoesRoute.tsx` with approved artifact, approved app version, and approved build truth.
- Rendered installed version/build/environment by device, sorted with non-current states first.
- Added `resolveUpdatePathState()` so the default route is manual/pending and unsafe configured values are blocked before rendering.
- Kept push-test action and UAT controls out of Atualizacoes.
- Added tests for `phase-12-staging-apk-120`, `0.12.0`, `120`, compatibility labels, manual fallback, no unsafe URL-like text, and route boundaries.
- Ran `security:evidence` to confirm no sensitive evidence pattern was introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create approved build and installed-version view** - `ff6d9bdb` (feat)
2. **Task 2: Add public-safe update path fallback** - `00ad2f13` (test)
3. **Task 3: Add Atualizacoes route tests** - `b57c8a86` (test)

## Files Created/Modified

- `apps/web/src/command-center/AtualizacoesRoute.tsx` - Dedicated build/update truth route.
- `apps/web/src/command-center/CommandCenter.tsx` - Routes `activeRoute="atualizacoes"` into AtualizacoesRoute.
- `apps/web/src/command-center/command-center-view-model.ts` - Adds approved artifact constant, build compatibility sorting, and safe update path resolver.
- `apps/web/src/command-center/command-center.test.tsx` - Covers build truth, manual fallback, denylist, and route boundaries.

## Decisions Made

- The visible default is manual update guidance because no public-safe APK/QR route is configured in the repo.
- `phase-12-staging-apk-120` remains a public-safe artifact label, not an install URL.
- Future public update URL support must pass denylist validation before rendering a link.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion.

## Issues Encountered

- Initial copy used sensitive vocabulary while explaining what the artifact label is not. The test denylist caught it; visible copy was rewritten to avoid those terms.

## User Setup Required

None - no external service configuration required.

## Verification

- `cmd /c pnpm.cmd --filter @validade-zero/web test` - passed, 9 files and 37 tests
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck` - passed
- `cmd /c pnpm.cmd security:evidence` - passed, 378 tracked text files

## Next Phase Readiness

Ready for `13-05`: Validacao can now own Loja 18 UAT, external blockers, evidence labels, and Go/No-Go without daily/device/update responsibilities leaking back.

---
*Phase: 13-web-operational-navigation-and-readiness-surfaces*
*Completed: 2026-06-29*
