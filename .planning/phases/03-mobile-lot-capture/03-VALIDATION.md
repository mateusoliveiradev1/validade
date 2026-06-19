---
phase: "03"
slug: mobile-lot-capture
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-19
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for the first mobile product, lot, and physical-presence capture loop.

## Test Infrastructure

| Property | Value |
|---|---|
| **Framework** | Vitest root projects, React Test Renderer, Maestro, Expo device/emulator smoke |
| **Config file** | `vitest.config.ts`, `apps/mobile/tsconfig.json`, `eslint.config.mjs`, `.maestro/smoke.yaml` |
| **Quick run command** | `pnpm --filter @validade-zero/mobile test` |
| **Full suite command** | `pnpm check` |
| **Estimated runtime** | ~180 seconds for automated suite; device camera smoke is manual |

## Sampling Rate

- **After every task commit:** Run the task-specific `<automated>` command in the corresponding plan.
- **After every plan wave:** Run `pnpm --filter @validade-zero/mobile test` and `pnpm --filter @validade-zero/mobile typecheck`.
- **Before `$gsd-verify-work`:** Run `pnpm lint`, `pnpm test`, `pnpm test:e2e:mobile` when an emulator/device is available, and `pnpm check`.
- **Max feedback latency:** 180 seconds for the full automated suite, excluding first-run native/emulator startup.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| 03-01-01 | 01 | 1 | CAT-01, CAT-02 | T-03-01 | Product, lot, location, and observation input rejects malformed/mode-incompatible values | unit | `pnpm --filter @validade-zero/mobile test -- capture-contract` | pending | pending |
| 03-01-02 | 01 | 1 | LOC-03 | T-03-02 | Repository appends observations and derives latest snapshot without deleting history | unit | `pnpm --filter @validade-zero/mobile test -- capture-repository` | pending | pending |
| 03-02-01 | 02 | 2 | CAT-01, CAT-02 | T-03-03 | Manual product confirmation blocks lot save until all mode-required data is explicitly supplied | component | `pnpm --filter @validade-zero/mobile test -- lot-registration` | pending | pending |
| 03-02-02 | 02 | 2 | CAT-03 | T-03-04 | Unknown barcode pre-fills only code and continues through human-confirmed product creation | component | `pnpm --filter @validade-zero/mobile test -- product-lookup` | pending | pending |
| 03-03-01 | 03 | 3 | LOC-01, LOC-02, LOC-03 | T-03-05 | Location movement and physical outcomes are append-only, attributed, timed, and visible in current state | component | `pnpm --filter @validade-zero/mobile test -- presence-observation` | pending | pending |
| 03-03-02 | 03 | 3 | LOC-02 | T-03-06 | Withdrawal/loss/not-found/probably-sold-out need reinforced confirmation; uncertainty remains visible | component | `pnpm --filter @validade-zero/mobile test -- reinforced-confirmation` | pending | pending |
| 03-04-01 | 04 | 4 | CAT-03 | T-03-07 | Denied/unavailable camera leaves manual lookup fully usable; scanned values are not auto-registered | component/manual | `pnpm --filter @validade-zero/mobile test -- camera-fallback` | pending | pending |
| 03-04-02 | 04 | 4 | CAT-01, CAT-02, CAT-03, LOC-01, LOC-02, LOC-03 | T-03-08 | Critical journeys, strict types, boundaries, and no-real-data guard stay green | E2E/static | `pnpm lint && pnpm test && pnpm check` | pending | pending |

## Wave 0 Requirements

- [x] `apps/mobile` exists and participates in the root Vitest project matrix.
- [x] Existing mobile smoke test uses React Test Renderer and can mock native modules.
- [x] `packages/domain` exposes product modes, risk calculation, and physical-confirmation vocabulary.
- [x] `packages/contracts` exposes Zod and actor/store schema patterns.
- [ ] `expo-camera` and `expo-sqlite` installed through Expo compatibility resolver before their production adapters are implemented.
- [ ] New mobile test files added to `eslint.config.mjs` project-service allowlist if excluded from `apps/mobile/tsconfig.json`.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Camera permission prompt and live barcode preview | CAT-03 | Native hardware permissions and preview are not reliable in React Test Renderer | On Android/iOS device or emulator: open scanner, grant permission, scan a fictitious code, assert product confirmation is required before any lot form can save. |
| Permission denied / no-camera fallback | CAT-03 | OS-level denial path requires native runtime confirmation | Deny camera permission, open the same action, search by typed name/code, create/select a product, and register a lot successfully. |
| Store-floor readability and one-hand reachability | CAT-01, CAT-02, LOC-01, LOC-02 | Lighting, touch target reach, and fast date entry need visual/human review | Follow the Phase 3 UI-SPEC on a phone-size emulator; verify all primary actions have clear Portuguese labels, visible errors, non-color-only attention states, and are usable without camera. |

## Validation Sign-Off

- [x] Every planned task has an automated verification command or a named native manual check.
- [x] Sampling continuity: no three consecutive tasks lack automated feedback.
- [x] Wave 0 names the required Expo modules and test/lint wiring.
- [x] No watch-mode flags are used in verification commands.
- [x] Automated feedback target is under 180 seconds after dependencies are installed.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
