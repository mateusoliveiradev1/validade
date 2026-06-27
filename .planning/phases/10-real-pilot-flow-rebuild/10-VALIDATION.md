# Phase 10 Validation Matrix

**Status:** Repository gates passed; Android/provider/remote migration evidence blocked
**Mode:** central-truth pilot UAT

| Area | Required evidence | Gate |
|---|---|---|
| Prepare-turn central hydration | Fresh SQLite install downloads session-scoped store, catalog, lots, active tasks, conflicts, and pending local state without fixture seed data. | Mobile repository tests, API tests, and Android UAT checklist. |
| Product search/create | Search, similar-match warning, reuse, draft creation, review, and no duplicate product path. | Contract/API/mobile/web tests. |
| Lot registration | Central lot and observation become visible on second device after acknowledgement. | Database/API/mobile integration tests and UAT. |
| Task projection | Central task projection derives active/radar/resolved rows from lot state and compatible actions. | Domain/contract/API tests. |
| Terminal resolution | Loss, withdrawal, completed repack, not-found, probably sold out, move, recheck, and markdown shelf confirmation stop active risk only after central ack. | Domain/API/mobile sync tests. |
| Sync taxonomy | Local, pending central, synchronized, conflict, discarded, and resolved states are distinct in mobile and web. | Contract/mobile/web tests. |
| Command Center | Web reads the same central projection as mobile, including active, resolved, conflict, pending review, and shift close blockers. | API/web tests and Playwright. |
| RBAC and store scope | Collaborator, lead, and admin see only authorized actions and store facts; cross-store IDs are denied. | API authorization tests and web/mobile UI tests. |
| Shift close | Safe close requires current central revalidation; unsafe close remains explicit with handoff and blockers. | Domain/API/mobile tests and UAT. |
| Security and data safety | No secrets, real store data, raw evidence binaries, device URIs, signed URLs, or production provider artifacts are committed. | `pnpm.cmd security` and focused source scans. |
| Android pilot reality | Installed build on a second phone/emulator completes first access, product, lot, resolution, and second-device visibility. | `pnpm.cmd test:e2e:mobile` plus manual UAT record. |

## Current Evidence - 2026-06-27

| Area | Status | Evidence |
|---|---|---|
| Prepare-turn central hydration | Passed in automated composition/API coverage | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys`; capture/API prepare-turn tests from 10-01 through 10-05 |
| Product search/create | Passed for central reuse and draft/review coverage | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys`; `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture authorization` |
| Lot registration | Passed for native composition and central write coverage | `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys`; capture repository/API tests |
| Terminal resolution | Passed in domain/API/mobile sync tests; installed run pending | `pnpm.cmd vitest run --config vitest.config.ts --project api -- capture sync`; `pnpm.cmd --filter @validade-zero/mobile test -- today-screen task-resolution sync-engine` |
| Sync taxonomy | Passed in automated mobile/web/API coverage | 10-04/10-05 verification plus `pnpm.cmd test:e2e:web` |
| Command Center | Passed in Playwright with active/resolved consistency and role/store denial | `pnpm.cmd test:e2e:web` |
| RBAC and store scope | Passed in API/web tests; installed app run pending | `pnpm.cmd test:e2e:web`; authorization tests from 10-05 |
| Shift close | Passed in domain/contracts/API/mobile tests with central revalidation | `pnpm.cmd --filter @validade-zero/domain test -- shift-close`; `pnpm.cmd --filter @validade-zero/contracts test -- shift-close`; `pnpm.cmd vitest run --config vitest.config.ts --project api -- shift-close capture`; `pnpm.cmd --filter @validade-zero/mobile test -- shift-close` |
| Security and data safety | Passed | `pnpm.cmd security`; `pnpm.cmd check` |
| Final repository gate | Passed | `pnpm.cmd check` -> typecheck, lint, format, 506 tests, 261 smoke tests, build, security, and performance budgets passed |
| Database migration check | Passed locally; remote apply blocked | `pnpm.cmd --filter @validade-zero/database db:check` passed; `NEON_DATABASE_URL` and `DATABASE_URL` are missing |
| Android pilot reality | Blocked | `pnpm.cmd test:e2e:mobile` -> `Not enough devices connected (0) to run the requested number of shards (1).` |

## Final Phase 10 UAT Script

1. Activate or log in to a pilot-safe account for one store.
2. Tap `Preparar turno` and confirm central read freshness, store name, role, and sync queue.
3. Search for a product, reuse an existing similar item, then create a new draft product without forcing a lot.
4. Register a lot for a confirmed product in the sales area.
5. On another Android install for the same store, prepare the turn and confirm the product, lot, and task appear centrally.
6. Resolve the lot as retirada or perda and keep the phone offline for one run to confirm local pending copy.
7. Reconnect and sync; verify central ack removes the active task but keeps history/audit.
8. Open Command Center and confirm the same lot is resolved, not active, and visible in history.
9. Attempt a safe shift close only after central revalidation; record unsafe close when blockers remain.

## Blocked Evidence Policy

- If no Android emulator/device is connected, record mobile E2E as blocked and do
  not claim installed-build readiness.
- If Expo provider credentials or build URLs are unavailable, record the provider
  gap without committing any private artifact.
- If central staging data is unavailable, use fictional deterministic staging
  fixtures in tests and keep real pilot UAT unchecked.
