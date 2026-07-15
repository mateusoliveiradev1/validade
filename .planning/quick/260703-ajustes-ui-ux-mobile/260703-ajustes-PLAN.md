---
quick_id: 260703-ajustes
status: in_progress
date: 2026-07-03
---

# Quick Task 260703-ajustes: Melhorar UI/UX mobile da tela Ajustes

## Goal

Use Impeccable product guidance to make Ajustes feel like a calm operational device-control screen.

## Scope

- Preserve Phase 14 contracts: fixed Ajustes access in session bar, return to previous route, readiness summary, no sensitive provider/build secrets.
- Reorganize Ajustes hierarchy around device readiness, sync, push, account/build/privacy/training, and sign-out risk.
- Keep tested labels and safety copy intact unless tests are updated intentionally.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test -- src/capture/ajustes-screen.test.tsx`
- Full mobile test if needed.
- Emulator screenshot after reinstall.
