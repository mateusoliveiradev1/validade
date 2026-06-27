# Phase 10 Pilot UAT

**Status:** Repository evidence partially passed; installed Android UAT blocked.
**Last updated:** 2026-06-27
**Data policy:** Fictional fixtures only. No real store, customer, provider URL, signed URL, token, or evidence binary is recorded here.

## Automated Evidence

| Journey | Status | Evidence |
|---|---|---|
| First access/login gate | Passed | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys` |
| Prepare-turn before Hoje | Passed | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys` |
| Product reuse before lot | Passed | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys` |
| Lot creation after confirmed product | Passed | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys` |
| Command Center active/resolved consistency | Passed | `pnpm.cmd test:e2e:web` |
| Role/store denial in web shell | Passed | `pnpm.cmd test:e2e:web` |
| Central shift-close revalidation | Passed | `pnpm.cmd --filter @validade-zero/domain test -- shift-close`; `pnpm.cmd vitest run --config vitest.config.ts --project api -- shift-close capture`; `pnpm.cmd --filter @validade-zero/mobile test -- shift-close` |
| Final repository gate | Passed | `pnpm.cmd check` -> typecheck, lint, format, tests, smoke tests, build, security, performance |
| Database schema/migration check | Passed locally; remote apply blocked | `pnpm.cmd --filter @validade-zero/database db:check`; no `NEON_DATABASE_URL` or `DATABASE_URL` in the shell |
| Native installed-build journey | Blocked | `pnpm.cmd test:e2e:mobile` -> `Not enough devices connected (0) to run the requested number of shards (1).` |

## Manual UAT Checklist

Use a pilot-safe account and fictional/staging data. Mark each item only after running it on an installed Android build or emulator.

| Scenario | Expected result | Status | Evidence slot |
|---|---|---|---|
| Fresh install opens without session | Login appears; Hoje does not appear before session validation. | Blocked - needs Android device/emulator | `pnpm.cmd test:e2e:mobile` or manual build notes |
| First access or login succeeds | Store, role, privacy path, and session expiry are visible after server-owned session. | Blocked - needs Android device/emulator | Manual APK run |
| Prepare turn | Central read shows store, freshness, products/lots/tasks/conflicts, and no false safe state. | Blocked - needs Android device/emulator | Manual APK run |
| Product reuse | Existing central product is selected before creating a draft. | Blocked - needs Android device/emulator | Manual APK run |
| Product draft | New draft stays pending review and does not silently become trusted catalog. | Blocked - needs Android device/emulator | Manual APK run |
| Lot registration | Lot is registered only after product confirmation and appears as central/pending-central with truthful copy. | Blocked - needs Android device/emulator | Manual APK run |
| Second device visibility | Another same-store Android prepares turn and sees the central product, lot, task, and resolved history. | Blocked - needs second Android/emulator | Manual APK run |
| Terminal resolution | Loss/withdrawal/rebaixa-compatible outcome removes active risk only after central ack and keeps history. | Blocked - needs Android device/emulator | Manual APK run |
| Offline pending action | Local save says pending central and does not declare area safe. | Blocked - needs Android device/emulator | Manual APK run |
| Command Center consistency | Web shows active, resolved, pending review, conflicts/discards, and role/store denial from central fixture. | Passed | `pnpm.cmd test:e2e:web` |
| Shift close safe | Safe close revalidates central capture immediately and rejects any blocker. | Passed in automated tests; blocked for installed APK | Domain/API/mobile tests |
| Shift close unsafe | Unsafe close requires reason, owner, deadline, note, and keeps tasks/alerts active. | Passed in automated tests; blocked for installed APK | Domain/API/mobile tests |
| Push/provider behavior | Push is only a reminder; provider receipt or open intent does not resolve task. | Passed in automated tests; blocked for real provider | API/mobile alert tests; provider run pending |

## Release Truth

- Repository readiness has deterministic evidence for auth gate, prepare-turn composition, product/lot path, Command Center consistency, role/store denial, and central shift-close revalidation.
- Installed Android readiness is **not passed** on 2026-06-27 because no device/emulator is connected for Maestro.
- Provider readiness is **not passed** until an approved Expo/provider run is executed without committing private URLs, tokens, or build artifacts.
