---
phase: 13
slug: web-operational-navigation-and-readiness-surfaces
status: complete
created: 2026-06-29
---

# Phase 13 - Pattern Map

## Purpose

Map existing implementation patterns before planning the web split. This artifact tells executors which files to read and which conventions to preserve.

## Existing Source Patterns

### App Routing And Fail-Closed Fallback

Source: `apps/web/src/App.tsx`

- `AppRoute` is imported from `apps/web/src/shell/AppShell.tsx`.
- `routeAllowed(route, session)` is the local fail-closed guard.
- `firstAllowedRoute(session)` chooses the first authorized surface.
- The current route state starts at `"command"`.
- The authenticated app renders `AppShell` once and swaps content by `activeRoute`.

Pattern to preserve:

- Extend the route union rather than introducing a router library.
- Keep capability checks centralized and explicit.
- Use `setRoute()` callbacks for cross-route actions such as `Abrir Aparelhos` or `Auditoria`.

### Shell Navigation

Source: `apps/web/src/shell/AppShell.tsx`

- Side nav is fixed on desktop and a `Sheet` on mobile.
- Navigation items include lucide icon, label, description, `aria-current`, disabled state, and reason copy.
- Disabled route reasons are computed by `navItemState(route, session)`.
- Privacy/logout are kept outside the primary route list.

Pattern to preserve:

- Add route items in the order `Operacao -> Aparelhos -> Atualizacoes -> Validacao -> Acessos da loja -> Auditoria`.
- Keep icon + text buttons, not icon-only route nav.
- Keep mobile route navigation in the existing `Sheet`.

### Command Center Fetch And Refresh

Source: `apps/web/src/command-center/CommandCenter.tsx`

- Uses `createFetchCommandCenterClient(fetcher)` when no test client is provided.
- Keeps `status`, `projection`, and `lastClientRefreshAt` in component state.
- `load({ background: true })` refreshes without replacing current content with skeleton.
- 20-second background interval refreshes the projection.
- Refresh failure renders a `role="alert"` error with retry action.
- Safe push test appends returned timeline entries to the matching device.

Pattern to preserve:

- Keep one shared host for projection loading and refresh.
- Route components should receive the current projection and route callbacks.
- Do not duplicate fetch logic in each route.

### Current Route Sections

Source: `apps/web/src/command-center/CommandCenter.tsx`

- `CentralSnapshotPanel` renders central read/freshness facts.
- `DeviceReadinessPanel` renders readiness, push/camera/build, and safe push-test timeline.
- `PilotUatPanel` renders Loja 18 checklist.
- `PilotBlockersPanel` renders blocker synthesis.
- `CommandCenterInsightPanel` renders causal explanation and `Por que venceu`.
- `FunnelSection` and `FunnelRow` render operational lists.

Pattern to preserve:

- Extract or move these panels; do not rewrite the copy from scratch unless the UI-SPEC requires it.
- Keep `Badge` tones mapped to semantic states.
- Keep repeated rows as bordered dense list rows rather than nested card grids.

### Public-Safe Fixtures

Sources:

- `apps/web/src/command-center/command-center.test.tsx`
- `apps/web/e2e/fixtures/v1-readiness.ts`

Fixture rules:

- Use fictitious labels.
- Use masked device ids such as `moto...001`.
- Use approved build metadata `0.12.0`, build `120`, artifact `phase-12-staging-apk-120`.
- Do not include tokens, build URLs, raw device ids, real photos, or real product names.

Pattern to preserve:

- Keep route tests public-safe.
- Add absence assertions for unsafe text and wrong-route details.

## Suggested New Files

| File | Role | Closest Existing Pattern |
|------|------|--------------------------|
| `apps/web/src/command-center/command-center-view-model.ts` | Pure selectors for counts, route summaries, daily blocker filtering, Go/No-Go, update-path safety | Existing helper functions at bottom of `CommandCenter.tsx` |
| `apps/web/src/command-center/OperacaoRoute.tsx` | Daily safety route | Current verdict, central snapshot, insight, and funnel sections |
| `apps/web/src/command-center/AparelhosRoute.tsx` | Device readiness route | Current `DeviceReadinessPanel` and safe push-test helpers |
| `apps/web/src/command-center/AtualizacoesRoute.tsx` | Build/update route | Existing device build fields and `buildCompatibilityLabel()` |
| `apps/web/src/command-center/ValidacaoRoute.tsx` | UAT and Go/No-Go route | Current `PilotUatPanel` and `PilotBlockersPanel` |

## Code Excerpts To Reuse Conceptually

- `appendSafePushTestResult()` in `CommandCenter.tsx`: preserve this update pattern so a diagnostic send immediately appears in Aparelhos.
- `compareDeviceReadiness()` in `CommandCenter.tsx`: use the same readiness ordering for Aparelhos.
- `buildCompatibilityLabel()` and `buildCompatibilityTone()` in `CommandCenter.tsx`: reuse for Atualizacoes.
- `uatStepOrder()` and `uatStepStateLabel()` in `CommandCenter.tsx`: reuse for Validacao.
- `roleLabel()` in `AppShell.tsx`: keep role display stable.

## Anti-Patterns To Avoid

- Do not add route tabs inside the daily Command Center.
- Do not keep one long anchored page.
- Do not add new API endpoints just to filter the existing projection.
- Do not render APK/build URLs from fixtures or env without public-safe validation.
- Do not make provider accepted or push opened look like task execution.
- Do not make live presence claims from foreground/sync/central-read timestamps.
- Do not hide device readiness entirely from Operacao; it must remain a compact permanent signal.

## Pattern Mapping Complete
