---
phase: 13
slug: web-operational-navigation-and-readiness-surfaces
status: complete
created: 2026-06-29
---

# Phase 13 - Research

## Research Question

What do we need to know to plan the web split from one all-in-one Command Center into Operacao, Aparelhos, Atualizacoes, and Validacao without weakening the Phase 12 truth boundaries?

## Executive Summary

The safest plan is a presentation-layer split over the existing `CommandCenterProjection`. Phase 13 should not create new API truth, new database state, or new rollout claims. The current `/command-center` projection already carries daily safety, device readiness, build compatibility, safe push-test history, UAT checklist, and pilot blockers. The implementation risk is mostly UI architecture: `apps/web/src/command-center/CommandCenter.tsx` currently fetches, refreshes, mutates push-test timeline, and renders all sections in one component, while tests and E2E still expect UAT/build/pilot blocker details on the first daily screen.

Plan the phase as a sequential refactor:

1. Add durable web routes and a shared Command Center projection host.
2. Distill Operacao so the first scan answers "area de venda segura agora?" and only keeps a compact device strip.
3. Move per-device readiness and safe push test to Aparelhos.
4. Move build/update truth and safe/manual install path to Atualizacoes.
5. Move Loja 18 UAT, external gates, and Go/No-Go synthesis to Validacao, then update E2E proof.

## Relevant Existing Truth

### Projection Contract

`packages/contracts/src/command-center.ts` already exposes:

- `CommandCenterProjection.verdict`, `centralSnapshot`, risk funnel arrays, and shift close arrays for daily operation.
- `CommandCenterProjection.devices` with masked device id, app version/build, approved artifact, build compatibility, last foreground/sync/central read, push/camera state, readiness verdict, blockers, push tests, next action, and updated timestamp.
- `CommandCenterProjection.pilotUat` with fixed Loja 18 steps and public-safe evidence labels.
- `CommandCenterProjection.pilotBlockers` with category, severity, ownership, cause, next action, affected label, evidence reference, and timestamp.
- `PublicSafeTextSchema` rejects private URLs, token-like text, secrets, passwords, Expo push token labels, and build URL markers in public evidence text.

Conclusion: use the existing projection as the single read model. Add route-specific selectors/adapters only in web code if useful.

### API and RBAC

`apps/api/src/command-center.ts` builds the projection and already synthesizes device, build, push-test, UAT, and operational blockers. `apps/api/src/auth.ts` and the session contract expose store-scoped actions:

- `canReadCommandCenter`
- `canReadStoreAudit`
- `canManageUsers`
- `canSendPilotPushTest`

Conclusion: Phase 13 should keep new web routes under `canReadCommandCenter` and keep the push-test button additionally gated by `canSendPilotPushTest`. It should not add broader capabilities in this phase.

### Current Web Architecture

`apps/web/src/App.tsx` owns:

- Auth/session loading.
- Route state as `AppRoute`.
- Fail-closed route fallback through `routeAllowed()` and `firstAllowedRoute()`.
- Wiring `CommandCenter`, `MembershipAdministration`, and `AuditWorkbench`.

`apps/web/src/shell/AppShell.tsx` owns:

- Side navigation with route labels/descriptions/icons.
- Mobile `Sheet` navigation.
- Disabled route behavior with user-facing reasons.

`apps/web/src/command-center/CommandCenter.tsx` owns too much:

- Fetch loop and background refresh.
- Safe push-test mutation and timeline append.
- Daily verdict, central snapshot, device readiness, UAT, pilot blockers, causal insight, funnel sections, and helpers.

Conclusion: start by keeping the fetch loop in one host and extracting route components under `apps/web/src/command-center/`. This avoids a multi-endpoint data split and keeps background refresh consistent.

### Test Surface

`apps/web/src/command-center/command-center.test.tsx` currently asserts that the first Command Center render includes:

- Device readiness.
- UAT Loja 18.
- Bloqueios do piloto.
- APK aprovado and approved artifact label.
- Push-test timeline.

`apps/web/e2e/v1-readiness.spec.ts` currently expects the same pilot/UAT/build details on the first screen.

Conclusion: tests must become route-specific. Operacao tests must assert absence of detailed UAT/build/push history in the first daily flow, while Aparelhos, Atualizacoes, and Validacao tests assert those details moved to the correct route.

## Implementation Strategy

### Route Model

Replace old route id `command` with route ids:

- `operacao`
- `aparelhos`
- `atualizacoes`
- `validacao`
- existing `access`
- existing `audit`

All four new operational routes should require `canReadCommandCenter`. If a user lacks it, the routes are disabled or fallback to the first allowed non-operational route. `Aparelhos` can render the safe push-test action only when `canSendPilotPushTest` is true and the selected device is eligible.

### Shared Projection Host

Create or refactor toward a host component such as `CommandCenterRoutes` or `CommandCenterProjectionShell` that:

- Calls `client.read({ storeId })`.
- Maintains `projection`, `status`, and `lastClientRefreshAt`.
- Refreshes manually and on the existing 20s interval.
- Calls `client.sendSafePushTest()` and appends returned timeline to the matching device.
- Chooses one route component based on `activeRoute`.

Keep refresh error copy hard-fail honest: previous data can remain visible but stale/failure must not mean safe.

### Route Components

Recommended file split:

- `apps/web/src/command-center/CommandCenter.tsx` - host and shared state, or a compatibility export.
- `apps/web/src/command-center/OperacaoRoute.tsx` - daily safety and compact device strip.
- `apps/web/src/command-center/AparelhosRoute.tsx` - readiness-ordered device list and safe push test.
- `apps/web/src/command-center/AtualizacoesRoute.tsx` - approved build, installed versions, stale/incompatible devices, safe update/manual path.
- `apps/web/src/command-center/ValidacaoRoute.tsx` - Go/No-Go, Loja 18 checklist, external gates, sanitized evidence.
- `apps/web/src/command-center/command-center-view-model.ts` - pure helpers for counts, readiness ordering, daily blocker filtering, Go/No-Go synthesis, update-path safety.

This split keeps components small enough for focused tests and lets executor agents work with clear `read_first` files.

### Daily Operation Distillation

Operacao should include:

- The sales-area verdict.
- Central snapshot/freshness.
- The causal "Por que venceu" / blocker explanation already present.
- Current risk funnel sections.
- A compact device strip: `Aparelhos: {apto} aptos, {atencao} em atencao, {bloqueado} bloqueados`.
- Route action `Abrir Aparelhos`.

Operacao should not include detailed:

- UAT checklist.
- Full pilot blocker matrix.
- APK/update instructions.
- Push-test timeline.
- Safe push-test button.

Device readiness becomes a daily blocker only when blocker code affects execution: `invalid_store_or_user`, `missing_first_central_read`, `stale_critical_sync`, `sync_conflict`, or `unsafe_shift_close`. Build-only, camera-only, and push-only rollout blockers can stay in device/update/validation routes unless they block the current daily action.

### Aparelhos

Aparelhos should sort devices by `bloqueado`, `atencao`, `apto`, then most recently updated. Each row should show:

- Verdict and cause.
- `Agora:` next action.
- Last central read.
- Last sync.
- Push permission/provider state.
- Camera permission.
- Build compatibility summary.
- Masked device id.
- Safe push-test timeline and diagnostic copy.

Safe push-test copy must say it does not resolve task state, close shift, or prove area segura.

### Atualizacoes

Atualizacoes should show:

- Approved artifact label, approved app version, approved build.
- Installed app version/build by device.
- Compatibility state: `atual`, `desatualizado`, `desconhecido`, `incompativel`.
- Stale/incompatible grouping and next action.
- Public-safe update path status.

Since no safe web APK/QR config exists in the repo today, the default route should show manual instructions and pending/blocked status rather than inventing a link. If execution introduces a `VITE_*` public URL, it must reject token/private/build URL patterns before rendering. This route must never render EAS build URLs, tokens, Firebase files, device serials, or private links.

### Validacao

Validacao should compute:

- `Go`: no critical/external blockers, all UAT steps passed, devices are compatible enough for rollout gates.
- `No-Go`: critical repo/operator blockers exist.
- `Aguardando prova externa`: only external gates remain, or physical/provider/camera/UAT proof is still missing.

The route should reference cross-route actions:

- Push action lives in Aparelhos.
- Update/build action lives in Atualizacoes.
- Daily safety action lives in Operacao.

Evidence stays label-only: status, timestamp, masked device reference, and evidence reference labels.

## Test Plan Implications

Use focused commands during execution:

- `cmd /c pnpm.cmd --filter @validade-zero/web test`
- `cmd /c pnpm.cmd --filter @validade-zero/web typecheck`
- `cmd /c pnpm.cmd test:e2e:web`
- Final phase gate: `cmd /c pnpm.cmd check`

Update tests so they assert both presence and absence:

- Operacao contains sales-area verdict and operational funnel.
- Operacao does not contain `UAT Loja 18`, `Bloqueios do piloto`, `phase-12-staging-apk-120`, or push-test timeline details.
- Aparelhos contains device verdicts, last central read/sync, push/camera/build summary, and safe push-test diagnostic action.
- Atualizacoes contains approved build and installed-version comparison, but no unsafe URL-like text.
- Validacao contains Go/No-Go verdict, UAT steps, external gates, and evidence labels without daily task duplication.
- Navigation has durable route order and mobile sheet access.

## Security And Privacy Notes

No new privileged backend endpoint is required. The primary security work is preventing navigation and UI copy from overstating proof or leaking sensitive data:

- Keep route access fail-closed behind session actions.
- Keep push-test send authority gated by `canSendPilotPushTest`.
- Keep public evidence public-safe.
- Do not render update links unless they pass a denylist for `token`, `secret`, `password`, `eas://`, build URLs, raw dashboard URLs, or private links.
- Do not add real Loja 18 product names, photos, raw device identifiers, provider tickets, or APK URLs to fixtures or tests.

## Validation Architecture

Phase 13 can be validated with existing Vitest and Playwright infrastructure. No schema push is needed because the plan should not modify database schema or API contracts. Nyquist sampling should check every route slice as it lands, because silent UI regression here would be easy: a route can render and still put the wrong truth in the wrong place.

Recommended validation samples:

- After route shell changes: web typecheck and an App shell/nav unit test.
- After Operacao: web component test for daily route presence/absence.
- After Aparelhos: web component test for device list and safe push-test action.
- After Atualizacoes: web component test for build/update safety and no private URL leakage.
- After Validacao: component test plus Playwright route journey.
- Final: full `pnpm.cmd check` and `pnpm.cmd test:e2e:web`.

## Research Complete

The phase is ready for five sequential execution plans. The sequence should be optimized for low-conflict implementation and strong route-level verification rather than parallel throughput.
