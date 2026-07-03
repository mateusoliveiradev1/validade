---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
status: automated-passed-manual-pending
updated: 2026-07-03T02:56:00-03:00
---

# Phase 18 Testing Evidence

## Automated Commands Run

- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-offline-queue gpp-pending-screen today-screen mobile-gpp-navigation`
  - result: passed
  - coverage: retry/idempotency, conflict discard justification, Today boundary, GPP route gating
- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-purchase-flow gpp-pending-screen mobile-gpp-navigation`
  - result: passed
  - coverage: purchase validation, optional product code, pending/sent projections, route gating
- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-avaria-flow mobile-gpp-navigation`
  - result: passed
  - coverage: avaria validation, central success/replay, offline pending, route gating
- `pnpm.cmd --filter @validade-zero/mobile test -- gpp-client gpp-offline-queue`
  - result: passed
  - coverage: GPP client central/offline classification queue persistence
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
  - result: passed
- `pnpm.cmd check`
  - result: passed
  - coverage: monorepo typecheck, lint, format, tests, smoke tests, build, security, and performance budgets

## Manual-Only Checks

- Physical one-hand aisle usability for avaria and purchase.
- Real offline/online transition on Android device.
- GPP web queue perception after central acknowledgement.
- Real central rejection converted into visible conflict, with discard justification retained locally.

## Notes

Renderer tests prove contract, navigation, copy, state boundaries, retry mapping, and Today separation. They do not prove OS network transitions, device ergonomics, or web/API provider perception.
