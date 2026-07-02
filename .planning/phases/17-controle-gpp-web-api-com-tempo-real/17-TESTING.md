---
phase: 17-controle-gpp-web-api-com-tempo-real
created: 2026-07-02
status: passed
nyquist_compliant: true
---

# Phase 17 - Testing Evidence

Focused evidence for the Controle GPP web/API foundation. These commands prove repository behavior, not physical GPP desk cutover.

## Focused Commands

| Layer | Command | Result | Evidence Time |
|-------|---------|--------|---------------|
| Domain | `cmd /c pnpm.cmd --filter @validade-zero/domain test` | PASS: 14 files, 155 tests | 2026-07-02T19:15:17-03:00 |
| Contracts | `cmd /c pnpm.cmd --filter @validade-zero/contracts test` | PASS: 12 files, 114 tests | 2026-07-02T19:15:17-03:00 |
| Database | `cmd /c pnpm.cmd --filter @validade-zero/database test` | PASS: 2 files, 62 tests | 2026-07-02T19:15:17-03:00 |
| API | `cmd /c pnpm.cmd --filter @validade-zero/api test` | PASS: 14 files, 114 tests | 2026-07-02T19:15:17-03:00 |
| Web | `cmd /c pnpm.cmd --filter @validade-zero/web test` | PASS: 12 files, 56 tests | 2026-07-02T19:15:18-03:00 |
| Mobile compatibility | `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` | PASS | 2026-07-02T19:25:00-03:00 |
| Mobile regression | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` | PASS: 38 files, 292 tests | 2026-07-02T19:25:00-03:00 |
| Web E2E | `cmd /c pnpm.cmd test:e2e:web` | PASS: 7 Playwright tests | 2026-07-02T19:15:45-03:00 |
| Full repo gate | `cmd /c pnpm.cmd check` | PASS: typecheck, lint, format, tests, smoke tests, build, security, performance budgets | 2026-07-02T19:37:55-03:00 |

## Coverage Scope

- **Feature flag:** API worker-runtime and web shell tests prove `controle_gpp_enabled` is default-off and the route is hidden until the flag/action permits it.
- **Role/capabilities:** Domain, contracts, API, and web tests prove `gpp` is explicit and does not inherit admin/lead powers.
- **Persistence:** Database tests cover additive GPP schema, repository idempotency, store scope, saldo, and lifecycle transitions.
- **API:** API tests cover GPP queue/detail/history routes, central-first writes, store-scoped authorization, audit append, replay, central failure, and realtime publish-after-commit behavior.
- **Realtime:** API and web tests prove events are refresh hints only; clients re-read central queue snapshots and keep manual refresh/fallback when realtime is paused.
- **Web route:** Web tests cover sector-first Avarias, search, central unavailable alert, failed baixa retryability, purchase code confirmation, history filters, and route-level realtime refresh.
- **E2E:** Playwright covers GPP role landing, feature-flagged route visibility, Avarias/Compras navigation, and central-unavailable fallback.
- **Mobile boundary:** Mobile typecheck/tests cover the compatibility-only widening for the shared `gpp` role. Phase 17 does not add a mobile Controle GPP route, Hoje integration, offline/local-pending GPP behavior, Expo config change, app version change, or Android versionCode change.

## Known Non-Fatal Warnings

- Some Playwright/Vite runs can log local proxy `ECONNREFUSED` lines for API paths that are intentionally mocked by route fixtures. These logs are non-fatal only when the Playwright process exits 0 and assertions pass.
- Realtime WebSocket availability is simulated in unit tests and falls back to paused/manual refresh in local browser smoke. Real cross-device perception remains manual-only.

## Manual-Only Proof Gates

| Gate | Why It Remains Manual | Required Handling |
|------|------------------------|-------------------|
| Real GPP desk flow with labels/caixa | Automated tests cannot prove physical label handling. | Keep caderno/caixa paralelo and compare against web history for a controlled sample. |
| Cross-device staging perception | Unit tests simulate events; real store network and browser sessions can still differ. | Open two authorized web sessions for the same store and confirm refresh or paused/manual fallback. |
| Caderno/caixa cutover decision | Phase 17 intentionally delivers web/API foundation only. | Do not remove physical fallback until later rollout evidence justifies it. |

## Residual Risk

The code proves central-first GPP web/API behavior, but does not prove real GPP operator adoption, physical caixa consistency, mobile GPP capture, or ERP/stock baixa integration.
