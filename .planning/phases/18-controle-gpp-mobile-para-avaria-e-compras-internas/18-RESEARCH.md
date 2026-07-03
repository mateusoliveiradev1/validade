# Phase 18 Research - Controle GPP Mobile para avaria e compras internas

## RESEARCH COMPLETE

**Phase:** 18 - Controle GPP Mobile para avaria e compras internas  
**Requirement:** GPP-08  
**Researched:** 2026-07-03  
**Mode:** inline Codex research, because subagent spawning is not available in this runtime

## Executive Summary

Phase 18 should be planned as a mobile-first vertical slice over the Phase 17 GPP API and contracts, not as a new backend domain. The correct implementation path is:

1. Add a separate mobile `Controle GPP` route/hub in `CaptureApp.tsx`.
2. Add typed mobile GPP client/repository methods that call Phase 17 endpoints and parse `packages/contracts/src/gpp.ts`.
3. Add short guided mobile flows for avaria and internal purchase.
4. Add a GPP-specific local pending queue or adapter that reuses the existing sync engine semantics, idempotency, SQLite persistence, conflict review, retry, and discard-with-reason patterns.
5. Keep `Hoje` separate. Do not create GPP-linked validity actions in this phase.

The highest-risk detail is offline truth. The app must only create local GPP pending records when the device/network path is really unavailable. Central validation errors, authorization denial, feature flag denial, and business-rule rejection must stay central failures and must not become local success.

## Local Code Findings

### Mobile Shell and Navigation

- `apps/mobile/src/capture/CaptureApp.tsx` owns the route stack via the `CaptureRoute` union and `routeStack` state.
- The current route set includes `today`, onboarding, product discovery/form, lot registration/detail, task resolution, shift close, observation, barcode, recent lots, and `settings`.
- `CaptureSessionBar` currently exposes only `Ajustes`. There is no bottom/tab navigation; Phase 18 needs a mobile-appropriate way to expose `Controle GPP` without mixing GPP actions into `TodayScreen`.
- `MobileActiveRole` already comes from `SessionContextResponse["activeRole"]`, and `roleLabel()` already handles `gpp`.
- `activeRole === "gpp"` compatibility exists, but initial route is still `today` through `initialRouteStack`.

Planning implication:
- Add a route like `{ name: "gpp-control" }` plus child flow routes or internal screen state.
- Resolve initial route from session/feature flag/action: GPP users land on `gpp-control`; collaborators/leads/admin keep `today`.
- Add a separate app entry visible only when `session.featureFlags.controle_gpp_enabled === true` and session actions/capabilities allow GPP use.

### Existing UI Components and Style

- `apps/mobile/src/capture/capture-ui.tsx` provides `ScreenHeader`, `PrimaryAction`, `SecondaryAction`, `DestructiveAction`, `Field`, `DatePickerAction`, `SelectionRow`, and `StatusNotice`.
- `StatusNotice` already sets alert/live-region semantics for critical/warning/error states.
- Existing styles use calm backgrounds, white/muted surfaces, short radii, 48px minimum touch targets, and direct operational copy.

Planning implication:
- New screens should reuse these primitives first.
- The hub can be a direct `ScrollView` with `ScreenHeader`, two large primary entries, and compact sections for `Minhas pendencias` and `Enviadas hoje`.
- Form steps should use `Field`, `SelectionRow`, and existing action components instead of introducing a separate component system.

### Contracts and API Surface

`packages/contracts/src/gpp.ts` is the Phase 17 contract source of truth.

Important schemas/types:
- `GppAvariaCreateRequestSchema`
- `GppPurchaseCreateRequestSchema`
- `GppMutationResponseSchema`
- `GppQueueSnapshotSchema`
- `GppAvariaFinalitySchema`
- `GppQuantityUnitSchema`
- `GppPurchaseStatusSchema`
- `GppCentralFeedbackStateSchema`

Important contract facts:
- Avaria requires product code and product name.
- Purchase request allows optional product code but requires name/description, quantity/unit, finality.
- Mutation responses distinguish `central_confirmed`, `central_failed`, and `replayed`.
- Realtime events are refresh hints only, not authoritative row state.

API routes in `apps/api/src/gpp.ts` already include:
- `GET /gpp/queue`
- `GET /gpp/detail/:groupId`
- `GET /gpp/divergences`
- `GET /gpp/purchases`
- `GET /gpp/history`
- `POST /gpp/avarias`
- `POST /gpp/purchases`
- Additional GPP mutation routes for movement/correction/divergence/baixa/attendance from Phase 17.

Planning implication:
- Mobile should add a typed client similar to web's GPP client pattern but scoped to create/read flows needed by sector operators.
- Do not duplicate GPP schemas in mobile. Import and parse from `@validade-zero/contracts`.
- Online success copy must key off `GppMutationResponse.state === "central_confirmed"` or `replayed`, never off local save or realtime.

### Session and Feature Gating

`packages/contracts/src/authorization.ts` exposes:
- `session.featureFlags.controle_gpp_enabled`
- `session.actions.canReadGppQueue`
- `session.actions.canCreateGppEntry`
- `session.actions.canCorrectOwnPendingGppEntry`
- `session.actions.canReadGppHistory`
- GPP operational action booleans for web/GPP roles.

The normalization gates GPP actions behind `controle_gpp_enabled`.

Planning implication:
- UI visibility should require `controle_gpp_enabled` and at least `canCreateGppEntry` or `canReadGppQueue`.
- Backend/API authorization remains mandatory. Mobile hiding is ergonomic only.
- GPP role default entry should use the same session-owned data, not hardcoded actor labels.

### Existing Offline and Sync Patterns

`apps/mobile/src/capture/network-state.ts` already normalizes NetInfo snapshots into:
- `online`
- `offline`
- `degraded`

`apps/mobile/src/capture/sync-engine.ts`:
- skips automatic sync when offline;
- skips automatic sync when degraded unless the run is manual;
- sends batches through a `SyncTransport`;
- records ack/retry/conflict by applying `SyncTransportResult`.

`apps/mobile/src/capture/repository.ts`, `memory-repository.ts`, and `sqlite-repository.ts` already model:
- local pending commands;
- idempotency keys;
- retry and conflict states;
- SQLite persistence;
- `listSyncQueue`;
- conflict review and discard-with-reason UI patterns.

Important current nuance:
- Existing sync commands are task/lote shaped and include fields like product display name, lot identity, current location, risk state, and required resolution.
- GPP pending records do not map cleanly to a Today task/lote shape.

Planning implication:
- The planner should not simply cram GPP commands into `OfflineActionCommand` unless the contract is intentionally widened.
- Safer first plan: add GPP-specific local queue records and UI projection, while optionally adding a small adapter to the existing `SyncEngine` transport/retry style.
- The queue must persist idempotency keys with each pending avaria or purchase request.
- Conflict review should mirror `SyncConflictPanel`: show local fact, central rejection/reason, allow correction/retry or discard with justification.

### Existing Copy Vocabulary

`apps/mobile/src/capture/today-copy.ts` already uses central/local truth language:
- `Confirmado na central. Atualizando Hoje com a verdade da nuvem.`
- `Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.`
- `Pendente central. Ainda nao use como confirmacao da loja.`
- `Nao foi possivel sincronizar. As acoes continuam salvas neste aparelho; confira a conexao e tente novamente.`
- `Tentaremos novamente sem duplicar a acao.`

Planning implication:
- Create a `gpp-copy.ts` or colocated constants for GPP-specific copy, but preserve the same truth model.
- Required phrase from context: `Pendente neste aparelho`.
- Online write progress should be `Enviando para central...` or equivalent.
- Online confirmed copy should be `Registrado na central` for avaria and `Solicitacao enviada para central` or equivalent for purchase only after acknowledgement.

## Official Documentation Notes

Official Expo Network documentation distinguishes `isConnected` from `isInternetReachable`; an active connection does not necessarily prove internet reachability. Source: https://docs.expo.dev/versions/latest/sdk/network/

Official Expo NetInfo documentation lists `@react-native-community/netinfo` as the Expo-supported cross-platform network information package, and the project already depends on version `12.0.1`. Source: https://docs.expo.dev/versions/latest/sdk/netinfo/

Official Expo SQLite documentation confirms local databases persist on device and are inspectable in development. The project already uses `expo-sqlite` and has migration helpers, so Phase 18 should extend local SQLite rather than introduce a second persistence mechanism. Source: https://docs.expo.dev/versions/latest/sdk/sqlite/

Research interpretation:
- Network state is a helpful preflight, but the central write attempt and error classification still matter. A server 400/403/feature-disabled/business rejection is not offline. A transport/network failure is the only valid path to `Pendente neste aparelho`.

## Recommended Plan Shape

### Plan 18-01 - Mobile GPP Contracts, Client, and Local Queue Foundation

Purpose:
- Create mobile-side GPP client methods and a GPP pending queue model.
- Keep all request/response parsing contract-backed.
- Add idempotency and network/error classification before UI forms depend on it.

Likely files:
- `apps/mobile/src/capture/gpp-client.ts`
- `apps/mobile/src/capture/gpp-offline-queue.ts`
- `apps/mobile/src/capture/gpp-copy.ts`
- `apps/mobile/src/capture/repository.ts`
- `apps/mobile/src/capture/memory-repository.ts`
- `apps/mobile/src/capture/sqlite-repository.ts`
- `apps/mobile/src/capture/sqlite-migrations.ts`
- tests in `apps/mobile/src/capture/*gpp*.test.ts`

Key behaviors:
- `createGppAvaria` and `createGppPurchaseRequest` parse requests with contract schemas.
- Network/transport failures can enqueue local records.
- Validation/auth/business failures return central failure and do not enqueue local records.
- Duplicate local saves by idempotency key return the existing local pending record.

### Plan 18-02 - Mobile Controle GPP Hub and Role-Aware Entry

Purpose:
- Add separate `Controle GPP` mobile entry and GPP default route without touching `Hoje` semantics.

Likely files:
- `apps/mobile/src/capture/CaptureApp.tsx`
- `apps/mobile/src/capture/ControleGppScreen.tsx`
- `apps/mobile/src/capture/gpp-copy.ts`
- `apps/mobile/src/capture/mobile-capture.accessibility.test.ts`
- `apps/mobile/src/capture/*gpp*.test.tsx`

Key behaviors:
- GPP role opens directly into Controle GPP when enabled.
- Collaborators/leads/admin keep `Hoje` as daily surface.
- GPP entry is hidden if `controle_gpp_enabled` is false or no GPP action exists.
- Hub shows `Registrar avaria`, `Solicitar compra interna`, `Minhas pendencias`, `Enviadas hoje`.

### Plan 18-03 - Registrar Avaria Guided Flow

Purpose:
- Add the short product-code-first avaria wizard.

Likely files:
- `apps/mobile/src/capture/GppAvariaFlow.tsx`
- `apps/mobile/src/capture/ControleGppScreen.tsx`
- `apps/mobile/src/capture/gpp-copy.ts`
- `apps/mobile/src/capture/gpp-flow-state.ts`
- tests

Key behaviors:
- Product code is required.
- Product name/description supports confirmation copy.
- Quantity value and unit are required.
- Finality options are exactly `Baixa GPP`, `Reaproveitamento`, `Producao interna`, `Transferencia`.
- Missing required fields block submission.
- Online success appears only after central acknowledgement.
- Offline-only pending uses `Pendente neste aparelho`.

### Plan 18-04 - Solicitar Compra Interna Flow and Pendencias

Purpose:
- Add purchase request flow plus sector-facing status surfaces.

Likely files:
- `apps/mobile/src/capture/GppPurchaseFlow.tsx`
- `apps/mobile/src/capture/GppPendingScreen.tsx`
- `apps/mobile/src/capture/ControleGppScreen.tsx`
- `apps/mobile/src/capture/gpp-copy.ts`
- tests

Key behaviors:
- Description/name, quantity/unit, and finality are required.
- Product code is optional.
- Status labels for `Minhas pendencias`: `Enviada`, `Atendida`, `Parcial`, `Sem produto`, `Cancelada`.
- Online success waits for central acknowledgement.
- Local pending and central conflict states are visible and reviewable.

### Plan 18-05 - GPP Sync Retry, Conflict Review, and Release Evidence

Purpose:
- Close offline retry/conflict behavior and prove Phase 18 did not integrate with Hoje.

Likely files:
- `apps/mobile/src/capture/gpp-offline-queue.ts`
- `apps/mobile/src/capture/offline-sync-ui.tsx` or GPP-specific equivalent
- `apps/mobile/src/capture/AjustesScreen.tsx` if queue summary must include GPP pending counts
- `.planning/phases/18-*/18-UAT.md`
- `.planning/phases/18-*/18-VALIDATION.md`
- `.planning/phases/18-*/18-TESTING.md`
- `.planning/phases/18-*/18-SUMMARY.md`

Key behaviors:
- Manual `Sincronizar` retries pending GPP records.
- Retry carries original idempotency key.
- Central rejection becomes conflict/review state, not silent discard.
- Conflict allows correction/retry or discard with justification.
- Tests prove `TodayScreen` has no GPP action integration; Phase 19 owns that.

## Risks and Mitigations

| Risk | Why It Matters | Mitigation |
|------|----------------|------------|
| Local pending created for central validation errors | Would falsely tell the sector that GPP received or will receive invalid work | Error classifier must distinguish network/transport failures from 400/403/flag/business failures; tests must cover each. |
| GPP commands forced into Today sync command shape | Existing sync rows assume task/lote risk fields | Add GPP-specific local queue or intentionally generalize sync contracts with tests. |
| Product code UX too loose for avaria | GPP baixa depends on code | Avaria flow starts with product code and blocks submit without it. |
| Purchase flow too strict on code | Sector may know only product name | Purchase create allows optional code, matching Phase 17 contract. |
| GPP role loses access due prepare-turn/onboarding gates | GPP users should open Controle GPP directly | Plan must explicitly define whether `prepareTurnState` is required for GPP-only surface; if not required for GPP central queue, bypass only the Today prep gate while preserving central session/auth. |
| Feature flag hidden only in UI | Backend still needs enforcement | API already gates routes; mobile must still handle 403/404/disabled safely. |
| Realtime misunderstood as success | Phase 17 says events are hints only | Mobile success must depend on mutation response, not event receipt. |

## Validation Architecture

### Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest + React Native test renderer for mobile package |
| Config file | `vitest.config.ts` |
| Quick command | `cmd /c pnpm.cmd --filter @validade-zero/mobile test` |
| Type command | `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` |
| Full relevant command | `cmd /c pnpm.cmd check` |
| Estimated quick runtime | Existing Phase 17 evidence: mobile test suite had 38 files / 292 tests and passed within focused package gate |

### Required Automated Coverage

| Behavior | Test Level | Suggested Files |
|----------|------------|-----------------|
| GPP feature flag/action hides or shows mobile entry | Component | `mobile-gpp-navigation.test.tsx` |
| GPP role initial route opens Controle GPP | Component | `mobile-gpp-navigation.test.tsx` |
| Collaborator keeps Hoje first route | Component | `mobile-gpp-navigation.test.tsx` |
| Avaria blocks missing product code | Component/unit | `gpp-avaria-flow.test.tsx` |
| Avaria blocks missing quantity/unit/finality/destination | Component/unit | `gpp-avaria-flow.test.tsx` |
| Purchase allows missing code but blocks missing name/quantity/finality | Component/unit | `gpp-purchase-flow.test.tsx` |
| Online write shows success only after central-confirmed response | Unit/component | `gpp-client.test.ts`, flow tests |
| Network failure enqueues `Pendente neste aparelho` | Unit | `gpp-offline-queue.test.ts` |
| Central 400/403/flag/business rejection does not enqueue local success | Unit | `gpp-client.test.ts`, `gpp-offline-queue.test.ts` |
| Retry preserves idempotency key and avoids duplicates | Unit | `gpp-offline-queue.test.ts` |
| Central rejection after retry becomes reviewable conflict | Unit/component | `gpp-offline-queue.test.ts`, `GppPendingScreen.test.tsx` |
| Conflict discard requires justification | Component | `GppPendingScreen.test.tsx` |
| Today stays free of GPP actions | Component | `today-screen.test.tsx` or navigation regression test |

### Manual-Only Verification

| Behavior | Why Manual | Instructions |
|----------|------------|--------------|
| One-hand usability in aisle | Test renderer cannot prove ergonomics | Run on Android target or Expo dev build; confirm hub/form controls are reachable and text wraps. |
| Real offline transition | Unit tests can simulate network but not store network behavior | Toggle device network off/on; create one avaria and one purchase; confirm local pending, retry, and central acknowledgement. |
| GPP desk perception | Requires real or staging GPP user flow | Submit from sector mobile and verify GPP web queue receives after central acknowledgement. |

## Planning Gate Notes

- This phase is a UI/front-end phase. `18-UI-SPEC.md` is currently missing.
- The plan-phase workflow's UI Design Contract Gate should stop before `PLAN.md` generation unless `$gsd-ui-phase 18` is run first or the operator explicitly re-runs planning with `--skip-ui`.
- Recommended next command after this research: `$gsd-ui-phase 18`.

## Source Notes

- Phase context: `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-CONTEXT.md`
- Phase 17 handoff: `.planning/phases/17-controle-gpp-web-api-com-tempo-real/17-SUMMARY.md`
- GPP contracts: `packages/contracts/src/gpp.ts`
- Mobile shell: `apps/mobile/src/capture/CaptureApp.tsx`
- Existing offline queue: `apps/mobile/src/capture/sync-engine.ts`, `apps/mobile/src/capture/offline-sync-ui.tsx`, `apps/mobile/src/capture/sqlite-repository.ts`
- Expo Network docs: https://docs.expo.dev/versions/latest/sdk/network/
- Expo NetInfo docs: https://docs.expo.dev/versions/latest/sdk/netinfo/
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
