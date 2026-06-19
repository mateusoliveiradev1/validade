---
phase: 01-engineering-foundation
plan: "05"
subsystem: ci-security-docs
tags: [github-actions, codeql, dependabot, readme, threat-model, public-repo-safety]
requires:
  - phase: 01-engineering-foundation
    provides: Workspace, apps, quality gates, security scripts, test pyramid, and fixtures from 01-01 through 01-04
provides:
  - GitHub Actions baseline CI for install, typecheck, lint, format, tests, smoke, build, and security
  - Dependency review policy blocking high and critical vulnerable dependency changes
  - CodeQL JavaScript/TypeScript workflow
  - Dependabot configuration for npm and GitHub Actions
  - Phase 1 threat model with ASVS/MASVS references
  - Public-repo safety policy and free-pilot limits documentation
  - Operational README and command reference
  - User setup checklist for GitHub repository security settings
affects: [phase-01, phase-02, ci, security, docs, onboarding]
tech-stack:
  added: [github-actions, codeql, dependabot]
  patterns:
    - `pnpm check` is the local and CI baseline readiness command.
    - High and critical security findings block readiness.
    - Provider setup remains fake/local until later phases explicitly introduce live integration.
key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/codeql.yml
    - .github/dependabot.yml
    - README.md
    - docs/security/threat-model-phase-01.md
    - docs/security/public-repo-safety.md
    - docs/operations/free-pilot-limits.md
    - docs/operations/commands.md
    - .planning/phases/01-engineering-foundation/01-05-USER-SETUP.md
  modified:
    - package.json
key-decisions:
  - "Run explicit CI steps plus `pnpm check` parity through the same command sequence developers use locally."
  - "Expand secret scanning to docs and GitHub workflow files so security policy text is covered by automated checks."
  - "Document GitHub repository security toggles as user setup because they require owner/admin access."
patterns-established:
  - "README points to deeper docs instead of duplicating every testing and security detail."
  - "Manual provider/repository dashboard work is captured in USER-SETUP artifacts."
requirements-completed: [FND-01, FND-03, FND-04, AUD-04]
duration: 12min
completed: 2026-06-19
status: complete
---

# Phase 01 Plan 05: CI, Security Docs, Threat Model, and README Summary

**GitHub CI, CodeQL, dependency review, public-repo safety docs, and onboarding docs finish the Phase 1 foundation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-19T00:45:00-03:00
- **Completed:** 2026-06-19T00:57:00-03:00
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Added baseline GitHub Actions CI for frozen install, typecheck, lint, format check, tests, smoke tests, build, and security.
- Added dependency review on pull requests with high and critical findings blocking.
- Added CodeQL JavaScript/TypeScript workflow and Dependabot configuration for npm and GitHub Actions.
- Expanded local secret scanning to include docs and GitHub workflow files.
- Wrote Phase 1 threat model covering public repo, local env, client/API boundaries, provider adapters, evidence assets, offline sync, and CI.
- Wrote public-repo safety and free-pilot limits docs.
- Wrote README and command reference covering install, dev, validation, env, fake adapters, testing, and safety.
- Captured GitHub repository security toggles in `01-05-USER-SETUP.md`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CI and dependency security workflows** - `471b145` (feat)
2. **Task 2: Write public-repo safety docs and Phase 1 threat model** - `781c16d` (docs)
3. **Task 3: Write the operational README and command reference** - `2bda964` (docs)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `.github/workflows/ci.yml` - Baseline quality, build, smoke, security, and dependency-review workflow.
- `.github/workflows/codeql.yml` - CodeQL JavaScript/TypeScript analysis workflow.
- `.github/dependabot.yml` - Weekly npm and GitHub Actions update configuration.
- `README.md` - Project overview, setup, development, validation, env, fake adapter, CI, and safety guide.
- `docs/security/threat-model-phase-01.md` - Phase 1 STRIDE threat model with ASVS/MASVS references.
- `docs/security/public-repo-safety.md` - Zero-tolerance policy for secrets, real data, and evidence assets.
- `docs/operations/free-pilot-limits.md` - Zero-cost provider stance and limits to verify before live usage.
- `docs/operations/commands.md` - Canonical root and app command reference.
- `package.json` - Expanded `security:secrets` scan coverage to docs and workflows.
- `.planning/phases/01-engineering-foundation/01-05-USER-SETUP.md` - Manual GitHub security-settings checklist.

## Decisions Made

- Kept CI explicit so each failing stage is readable in GitHub Actions while still matching the local `pnpm check` baseline.
- Treated high and critical dependency/security findings as release blockers and documented medium findings as accepted-risk/backlog candidates.
- Captured GitHub dashboard configuration as manual user setup because it requires repository permissions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Markdown docs needed Prettier formatting**
- **Found during:** Task 3 verification
- **Issue:** Newly created Markdown docs failed `pnpm.cmd format:check`.
- **Fix:** Ran Prettier over README, operations docs, and security docs.
- **Files modified:** `README.md`, `docs/operations/commands.md`, `docs/operations/free-pilot-limits.md`, `docs/security/public-repo-safety.md`, `docs/security/threat-model-phase-01.md`
- **Verification:** `pnpm.cmd format:check` passed.
- **Committed in:** `2bda964`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Formatting-only fix; no scope change.

## Issues Encountered

- GitHub dependency graph, Dependabot alerts, secret scanning, and branch protection require repository admin access, so they are documented in `01-05-USER-SETUP.md`.

## Verification

- `pnpm.cmd check` - passed.
- `pnpm.cmd security` - passed.
- `Select-String -Path README.md -Pattern 'pnpm check','Nenhum dado real','\\.env.example','Node 24','pnpm 11'` - passed.
- `Select-String -Path docs/security/threat-model-phase-01.md -Pattern 'ASVS','MASVS','STRIDE','high','critical'` - passed.

## Self-Check: PASSED

- Key CI, docs, and README files exist on disk.
- Commits for `01-05` are present in git history.
- Full `pnpm check` validates the workspace after all Phase 1 implementation plans.
- Manual setup requirements are isolated in `01-05-USER-SETUP.md`.

## User Setup Required

External GitHub repository settings require manual configuration. See `01-05-USER-SETUP.md` for dependency graph, Dependabot alerts, secret scanning, and branch protection.

## Next Phase Readiness

Phase 1 implementation is complete and ready for phase-level verification. Phase 2 can build domain and risk rules on top of the established monorepo, gates, fixtures, docs, and CI baseline.

---
*Phase: 01-engineering-foundation*
*Completed: 2026-06-19*
