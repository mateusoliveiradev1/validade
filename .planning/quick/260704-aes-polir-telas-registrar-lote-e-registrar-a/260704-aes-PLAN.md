---
quick_id: 260704-aes
status: in_progress
date: 2026-07-04
---

# Quick Task 260704-aes Plan

## Goal

Polish the mobile Registrar lote and Registrar avaria screens, then fix the validity-resolution flow so a real operator can mark a product as sold/esgotado or record a label/validity change without being forced to mark perda.

## Scope

- Improve the existing React Native screens using the current `capture-ui` primitives and `capture-theme` tokens.
- Keep GPP separate from Hoje and preserve Phase 18 boundaries.
- Preserve truthful central/offline wording for GPP.
- Add/adjust tests for the validity resolution path.
- Install and validate the resulting APK on the emulator before preparing the test APK.

## Tasks

1. Audit current Registrar lote, Registrar avaria, and TaskResolutionPanel behavior.
2. Polish Registrar lote layout, copy hierarchy, date/quantity grouping, location selection, and success state.
3. Polish Registrar avaria input/review/success states using the same shared product UI vocabulary.
4. Fix the task resolution action set/compatibility so sold/esgotado and label/validity-change paths are available where operationally valid.
5. Add or update focused tests.
6. Run typecheck, mobile tests, Impeccable detector, install on emulator, and capture evidence.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test`
- Impeccable detector on touched mobile UI files
- Release APK install on `emulator-5554`
- Manual screenshot pass through Registrar lote, Registrar avaria, and the corrected validity resolution flow
