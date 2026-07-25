---
status: complete
quick_id: 260725-cxt
commit: d9b3cbf
---

# Summary

Recreated Dependabot PR #17 on top of current `main` and kept its 23
minor/patch npm updates. The Prettier 3.9.6 update changed union-type wrapping,
so its required mechanical formatting was committed separately across 17
source files.

## Verification

`pnpm check` passed end-to-end with the new dependency set:

- typecheck and lint
- repository formatting
- 834 repository tests
- 493 smoke tests
- production builds
- security checks
- performance budgets

No formatter change altered runtime behavior.

## Follow-up

Publish a replacement PR, require green remote checks, merge it, and close #17
as superseded.
