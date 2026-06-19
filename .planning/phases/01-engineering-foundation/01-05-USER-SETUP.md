# Phase 01 Plan 05: User Setup Required

**Generated:** 2026-06-19
**Phase:** 01-engineering-foundation
**Status:** Incomplete

The repository foundation is automated in code, CI files, and docs. These items require repository owner/admin access in GitHub settings.

## Dashboard Configuration

- [ ] **Enable dependency graph**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Notes: Required for Dependabot alerts and dependency review visibility.

- [ ] **Enable Dependabot alerts**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Notes: High and critical findings block readiness until resolved or removed.

- [ ] **Enable secret scanning**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled when available for the repository.
  - Notes: Local secret scanning already runs with `pnpm security:secrets`.

- [ ] **Enable branch protection for the main branch**
  - Location: GitHub repository -> Settings -> Branches -> Branch protection rules
  - Set to: Require pull request checks before merge.
  - Required checks: `Quality gates`, `Dependency review`, and `CodeQL` when available.

## Verification

After completing setup, verify with:

```powershell
pnpm check
```

Expected results:

- Local `pnpm check` passes.
- Pull requests show baseline CI checks before merge.
- Dependency review blocks high and critical vulnerable dependency changes.
- CodeQL results appear in GitHub Security when the workflow has run.

---

**Once all items complete:** Mark status as "Complete" at top of file.

