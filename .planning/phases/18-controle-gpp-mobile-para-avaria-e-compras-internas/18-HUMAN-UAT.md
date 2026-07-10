---
status: partial
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
source: [18-VERIFICATION.md, 18-UAT.md, 18-06-SUMMARY.md]
started: 2026-07-10T07:40:00-03:00
updated: 2026-07-10T07:40:00-03:00
---

# Phase 18 Human UAT - Post-170 Conflict Discard

## Current Test

Awaiting an intentionally built post-170 Android artifact. Build 170 remains installed and untouched.

## Tests

### 1. Native justified conflict discard

expected: On an approved post-170 Android build, a central rejection appears as `Conflito de GPP`; empty justification keeps discard disabled; after a reason is entered, one press on `Descartar registro deste aparelho` removes the active conflict, shows device-local discard confirmation, and does not claim central success.
result: pending

## Existing Evidence

- Prior Android/local-central UAT passed avaria, offline retry, code-optional purchase, and GPP web perception.
- The exact conflict-discard route now passes the integrated renderer regression and repository persistence assertions.
- The remaining item is native proof of the new code, not a known repository implementation gap.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

None reported. Native verification is pending because no deliberate post-170 build has been produced.
