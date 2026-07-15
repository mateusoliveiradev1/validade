---
quick_id: 260704-ajustes
status: in_progress
date: 2026-07-04
---

# Quick Task 260704-ajustes Plan

## Goal

Redesign the mobile Ajustes screen so it feels like a real operational mobile app surface, not a long vertical PDF.

## Scope

- Keep Phase 14 boundaries: Ajustes owns device/account/push/sync/build/privacy/sign-out controls.
- Preserve tested operational labels and behaviors where they are action contracts.
- Reduce vertical reading load and repeated card weight.
- Make the first viewport useful: status, urgent action, compact health summary, and clear navigation to the rest.
- Keep details available without making every detail compete at the top.

## Tasks

1. Audit current Ajustes IA, visual hierarchy, tests, and shared capture UI tokens.
2. Rework Ajustes into a compact mobile settings control surface.
3. Add or adjust tests around the new section navigation/copy without weakening behavior tests.
4. Run mobile tests, typecheck, Impeccable detector.
5. Rebuild/install APK only if requested after this polish pass is validated.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile test`
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- Impeccable detector on touched UI files
- Emulator screenshot pass for Ajustes
