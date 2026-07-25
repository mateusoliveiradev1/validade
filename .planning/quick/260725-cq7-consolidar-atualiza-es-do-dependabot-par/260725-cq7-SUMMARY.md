---
status: complete
quick_id: 260725-cq7
commit: 7e674af
---

# Summary

Consolidated the five open GitHub Actions upgrades into one maintenance change:

- `actions/checkout` v7
- `actions/setup-node` v6
- `pnpm/action-setup` v6
- `actions/dependency-review-action` v5
- `github/codeql-action` v4

Dependabot now groups future GitHub Actions updates into a single pull request.

## Verification

- Typecheck and lint passed.
- 834 repository tests passed.
- 493 smoke tests passed.
- Build, security checks, and performance budgets passed.
- Formatting passed for all files changed by this task.
- The repository-wide local format check was affected only by CRLF line endings
  in pre-existing Windows checkout files; GitHub CI provides the canonical
  clean-checkout formatting result.

## Follow-up

Publish the maintenance PR, require green remote checks, merge it, then close
the five individual Dependabot PRs as superseded.
