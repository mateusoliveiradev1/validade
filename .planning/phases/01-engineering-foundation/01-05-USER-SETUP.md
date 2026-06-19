# Phase 01 Plan 05: User Setup Required

**Generated:** 2026-06-19
**Phase:** 01-engineering-foundation
**Status:** Complete

The repository foundation is automated in code, CI files, and docs. These items required repository owner/admin access in GitHub settings and were completed with the authenticated GitHub CLI account `mateusoliveiradev1`.

## Dashboard Configuration

- [x] **Enable dependency graph**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Verification: `gh api repos/mateusoliveiradev1/validade/dependency-graph/sbom` returned an SBOM for `com.github.mateusoliveiradev1/validade`.
  - Notes: Required for Dependabot alerts and dependency review visibility.

- [x] **Enable Dependabot alerts**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Verification: `gh api -i repos/mateusoliveiradev1/validade/vulnerability-alerts` returned `HTTP/2.0 204 No Content`.
  - Notes: High and critical findings block readiness until resolved or removed.

- [x] **Enable Dependabot security updates**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Verification: `gh api repos/mateusoliveiradev1/validade` reported `dependabot_security_updates.status` as `enabled`.
  - Notes: Complements Dependabot alerts with automated security-fix pull requests when available.

- [x] **Enable secret scanning**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled when available for the repository.
  - Verification: `gh api repos/mateusoliveiradev1/validade` reported `secret_scanning.status` as `enabled`.
  - Notes: Local secret scanning already runs with `pnpm security:secrets`.

- [x] **Enable secret scanning push protection**
  - Location: GitHub repository -> Settings -> Code security and analysis
  - Set to: Enabled
  - Verification: `gh api repos/mateusoliveiradev1/validade` reported `secret_scanning_push_protection.status` as `enabled`.
  - Notes: Blocks supported secret patterns before they land in git history.

- [x] **Enable branch protection for the main branch**
  - Location: GitHub repository -> Settings -> Branches -> Branch protection rules
  - Set to: Require status checks before merge, require branches to be up to date, require conversation resolution, disallow force pushes, and disallow deletions.
  - Required checks: `Quality gates`, `Dependency review`, and `CodeQL` when available.
  - Verification: `gh api repos/mateusoliveiradev1/validade/branches/main/protection` reported strict required checks for `Quality gates`, `Dependency review`, and `Analyze JavaScript and TypeScript`.

## Verification

After completing setup, verify with:

```powershell
pnpm check
```

Expected results:

- Local `pnpm check` passes.
- Dependency graph SBOM is available.
- Dependabot alerts endpoint returns enabled status.
- Dependabot security updates are enabled.
- Secret scanning and push protection are enabled.
- Branch protection for `main` requires `Quality gates`, `Dependency review`, and `Analyze JavaScript and TypeScript`.
- CodeQL results appear in GitHub Security after the workflow has run.

---

**Completed:** 2026-06-19.
