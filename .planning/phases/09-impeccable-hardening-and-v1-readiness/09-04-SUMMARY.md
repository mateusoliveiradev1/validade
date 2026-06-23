---
phase: 09-impeccable-hardening-and-v1-readiness
plan: "04"
subsystem: release-readiness
tags: [playwright, maestro, accessibility, security, performance, e2e]
requires:
  - phase: 09-02
    provides: Android auth gate, branded pilot assets, and mobile product states
  - phase: 09-03
    provides: authenticated web shell, Command Center, invitations, and privacy surfaces
provides:
  - Deterministic authenticated web E2E coverage for Command Center, privacy, responsive navigation, audit, and membership revocation
  - Mobile auth-gate release-composition tests and Maestro v1 auth/privacy script
  - UI readiness and performance-budget gates integrated into the root release check
affects: [release-docs, v1-go-no-go, android-pilot]
key-files:
  created:
    - apps/web/e2e/v1-readiness.spec.ts
    - apps/web/e2e/fixtures/v1-readiness.ts
    - .maestro/v1-readiness.yaml
    - apps/mobile/src/capture/mobile-release-journeys.test.tsx
    - scripts/check-ui-release-readiness.mjs
    - scripts/check-performance-budgets.mjs
    - docs/performance/budgets.md
  modified:
    - package.json
    - docs/testing/strategy.md
    - apps/web/e2e/audit-roles-shift-close.spec.ts
    - eslint.config.mjs
key-decisions:
  - "UI readiness fails on provisional product copy, missing Privacy Center sections, normal auth-gate bypasses, unsupported Command Center BI vocabulary, or absent launch assets."
  - "The performance gate measures gzip asset totals only and reports no provider URL, evidence metadata, or credential."
  - "Native Maestro evidence is blocked rather than inferred when no Android device or emulator is connected."
requirements-completed: [UI-04]
completed: 2026-06-22
---

# Phase 09 Plan 04: Release Gate Summary

**Deterministic v1 journey coverage and hard release gates for web, mobile composition, public-repo safety, and bundle size.**

## Accomplishments

- Replaced the obsolete web smoke E2E with session-backed Command Center, privacy, narrow-navigation, audit, and administrative revocation journeys; all use fictional fixtures only.
- Added mobile release-composition tests proving the auth gate protects Hoje and exposes Privacy Center before authentication, plus a Maestro v1 auth/privacy script.
- Added UI-readiness and performance scripts to `pnpm security` and `pnpm check`, then formatted the repository so the full quality command is executable.

## Verification

- `pnpm.cmd test:e2e:web` - passed, 5 Playwright scenarios.
- `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys auth-flow accessibility` - passed, 141 tests.
- `pnpm.cmd security` - passed: env, secrets, fictional-data, evidence, UI readiness, and package checks.
- `pnpm.cmd performance:budgets` - passed: web JavaScript 107,743 B gzip and CSS 5,990 B gzip.
- `pnpm.cmd check` - passed: 391 root tests, 207 smoke-suite tests, typecheck, lint, formatting, build, security, and budgets.
- Browser visual review - passed on the web login at 1280 px and 390 px; fields, actions, and wrapping remain visible and usable.

## Native Verification Blocker

- `pnpm.cmd test:e2e:mobile` was attempted and returned `Not enough devices connected (0) to run the requested number of shards (1).`
- This is an external device/emulator blocker. The auth/privacy Maestro script is present, but authenticated native continuation, APK installation, and physical-device behavior remain unverified.

## Deviations

- `pnpm check` initially exposed pre-existing formatting drift across Phase 09 files. The repository formatter was applied mechanically; the repeated full gate passed afterward.

## Next Phase Readiness

- Plan 09-05 can use the exact release gate results and native blocker above for the final validation matrix, UAT checklist, Android pilot instructions, and go/no-go record.

## Self-Check: PASSED WITH EXTERNAL NATIVE BLOCKER

- Web, security, accessibility-oriented journey checks, and performance budgets are green.
- Native device/APK evidence is explicitly blocked, not marked as passed.

---
*Phase: 09-impeccable-hardening-and-v1-readiness*
*Completed: 2026-06-22*
