---
quick_id: 260703-rdt
status: complete
date: 2026-07-03
---

# Quick Task 260703-rdt: Polir UI/UX visual mobile do app inteiro

## Goal

Use Impeccable product guidance to improve the mobile app's real-app feel without changing Phase 18 GPP data-flow semantics.

## Scope

- Strengthen shared mobile UI primitives and state vocabulary.
- Improve login, first access and recovery hierarchy while preserving tested labels.
- Improve authenticated session header without introducing a sidebar-like pattern.
- Improve Controle GPP Setor/GPP account distinction and local-vs-central truth.
- Improve GPP avaria/purchase quantity, unit, destination and bottom-action ergonomics.
- Keep existing operational contracts intact.

## Verification

- `pnpm.cmd --filter @validade-zero/mobile typecheck`
- `pnpm.cmd --filter @validade-zero/mobile test`
- Local Android release install on emulator via `C:\vzb`.
- Screenshot evidence under `artifacts/mobile-*-polished*.png` and `artifacts/mobile-gpp-avaria-bottom-final.png`.
