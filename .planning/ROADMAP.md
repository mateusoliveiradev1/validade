# Roadmap: Validade Zero

**Mode:** Vertical MVP
**Granularity:** Fine
**Requirements covered:** 28/28
**Current status:** Phase 16 validation/testing active; v1.2 Controle GPP phases drafted

## Milestones

- [x] **v1.0 Repository Complete** - Phases 1-12, 54 plans, shipped 2026-06-28.
- [ ] **v1.1 Operacao Real de Loja e Diagnostico** - Separate daily operation, devices, updates, mobile settings, and Loja 18 validation.
- [ ] **v1.2 Controle GPP e Tempo Real Operacional** - Add a store-scoped GPP control layer for avarias, internal purchases, backend-backed auditability, and additive realtime visibility without disturbing the build 170 validation.

## Phases

<details>
<summary>v1.0 Repository Complete (Phases 1-12) - shipped 2026-06-28</summary>

The v1.0 milestone delivered the repository-complete closed-pilot spine: mobile capture, Hoje tasks, markdown/rebaixa, offline sync, audit/RBAC/evidence, shift close, central truth, Command Center, device readiness, push-test diagnostics, build truth, and guided Loja 18 UAT.

The milestone is not a physical rollout claim. Installed Android, real provider push, real camera/evidence path, and physical Loja 18 UAT remain external proof gates.

</details>

### Phase 13: Web Operational Navigation and Readiness Surfaces

**Goal:** Reorganize the web leadership surface so the Command Center stays focused on sales-area safety while devices, updates, and validation each have a durable place.

**Requirements:** WEB-01, WEB-02, WEB-03, WEB-04, WEB-05
**Status:** Complete - verified 2026-06-29

**Success criteria:**
1. Command Center first scan answers the operational safety question without verbose pilot/UAT/build panels in the daily flow.
2. A compact device-readiness summary is always visible from the web operational shell or Command Center header.
3. A dedicated Aparelhos view shows per-device readiness, last central read, last sync, push/camera state, build compatibility, safe push-test status, and next action.
4. A dedicated Atualizacoes view shows approved build, installed versions by device, stale/incompatible devices, and a safe APK/QR update path without leaking secrets.
5. A dedicated Validacao / Go-No-Go view carries Loja 18 UAT and rollout blockers without competing with the daily Command Center.

**Plans:**
- **Wave 1:** `13-01-PLAN.md` - Route foundation, shell navigation, shared `/command-center` projection host, and fail-closed access.
- **Wave 2:** `13-02-PLAN.md` - Operacao daily safety route and compact device-readiness strip.
- **Wave 3:** `13-03-PLAN.md` - Aparelhos device readiness route and diagnostic safe push-test action.
- **Wave 4:** `13-04-PLAN.md` - Atualizacoes approved-build truth, installed versions, and public-safe/manual update path.
- **Wave 5:** `13-05-PLAN.md` - Validacao Go/No-Go route plus route-specific Playwright coverage.

### Phase 14: Mobile Ajustes and Device Controls

**Goal:** Add a mobile Ajustes area that owns account/store context, push and reminders, sync health, update truth, diagnostics, privacy, and sign-out.

**Requirements:** SET-01, SET-02, SET-03, SET-04, SET-05
**Status:** Complete - ready for verification

**Success criteria:**
1. Operators can open Ajustes from the mobile app shell without losing the active store, role, session, or current operational route.
2. Push/lembretes controls show permission state, provider/local reminder state, test action, disable path, and copy that never treats push as physical execution.
3. Sync health shows last central read, last sync, pending local commands, conflicts, retry/discard path, and whether the state blocks safe close.
4. Update/build truth shows installed version, approved version, environment, API target, package id, and manual update instructions for local APK distribution.
5. Account, store, privacy, and sign-out controls use the existing closed-pilot authorization model.

### Phase 15: Operational Surface Distillation

**Goal:** Reduce operational noise in Hoje, Preparar turno, Fechamento do turno, and Command Center while keeping blockers visible at the moment they matter.

**Requirements:** OPS-01, OPS-02, OPS-03, OPS-04
**Status:** Not started

**Success criteria:**
1. Hoje shows sync, push, and build/update health compactly when healthy and promotes them to blocking cards only when they affect execution, safe close, or validation.
2. Preparar turno guides an empty real store from first central read into product creation/reuse and lot registration without making an expected empty catalog look fatal.
3. Fechamento do turno summarizes active tasks, unresolved sync, stale central read, device/update blockers, and the physical checklist before safe-close can be accepted.
4. Command Center, Hoje, and Ajustes use one shared readiness vocabulary for central read, local cache, sync queue, push, camera, build, and device authorization.

### Phase 16: Loja 18 Validation Runbook and Go/No-Go Proof

**Goal:** Turn the cleaned operational surfaces into a guided real-store validation path with public-safe evidence and honest external proof gates.

**Requirements:** VAL-01, VAL-02, VAL-03, VAL-04
**Status:** Not started

**Success criteria:**
1. A store lead can run a guided Loja 18 validation path covering first real product, real lot, task projection, task resolution, second-device visibility, update/build status, and shift close.
2. Validation records pass, blocked, and external-blocked outcomes public-safely without real product names, photos, tokens, private URLs, or personal data in repository artifacts.
3. APK install, provider push, camera/evidence, second-device proof, and physical Loja 18 UAT remain explicit gates rather than being inferred from repo tests or mocks.
4. The milestone produces a clear next-step runbook for store validation in the aisle and leadership evidence review.

### Phase 17: Controle GPP Web API com tempo real

**Goal:** Build the additive Controle GPP web/API foundation behind a feature flag, with central-first writes, auditability, idempotency, store-scoped permissions, and realtime store-room notifications that never replace central truth.

**Requirements:** GPP-01, GPP-02, GPP-03, GPP-04, GPP-05, GPP-06, GPP-07
**Status:** Not started
**Depends on:** Phase 16

**Success criteria:**
1. New GPP contracts, tables, endpoints, idempotency keys, and audit events are additive and do not alter the tested build 170 mobile flow.
2. The web GPP surface exposes Avarias, Compras internas, Divergencias, and Historico by store/sector with grouped and detail views.
3. Backend permissions enforce store, role, sector, creator, status, and mandatory justification rules for every GPP write.
4. Realtime events publish only after central database success and cause clients to re-read central snapshots, with manual refresh fallback.
5. `controle_gpp_enabled` keeps the new surface hidden from current Loja 18 validation until explicitly enabled.

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-discuss-phase 17, then /gsd-ui-phase 17 or /gsd-plan-phase 17 as required)

### Phase 18: Controle GPP Mobile para avaria e compras internas

**Goal:** Add the mobile Controle GPP entry for sector operators to register avarias and request internal purchases with central-confirmed feedback, while keeping local-only behavior restricted to real offline use.

**Requirements:** GPP-08
**Status:** Not started
**Depends on:** Phase 17

**Success criteria:**
1. Mobile shows a separate Controle GPP entry with Registrar avaria, Solicitar compra interna, Minhas pendencias, and Enviadas hoje.
2. Avaria registration requires product code, quantity/unit, and destination/finality fields for baixa GPP, reaproveitamento, producao interna, or transferencia.
3. Internal purchase requests can start from product name/description plus quantity and finality, with product code optional until GPP service.
4. Role-aware navigation opens GPP users directly into Controle GPP while collaborators keep Hoje as the daily validation surface.
5. Online mobile actions show success only after central acknowledgement; offline actions remain explicitly pending on this device.

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-discuss-phase 18 after Phase 17 verification)

### Phase 19: Integracao do Controle GPP com Hoje

**Goal:** Connect Hoje task resolution to Controle GPP only after the GPP web/API/mobile base is proven, so vencido/retirado lots can generate avaria, reaproveitamento, or producao interna records without hiding sales-area risk prematurely.

**Requirements:** GPP-09
**Status:** Not started
**Depends on:** Phase 18

**Success criteria:**
1. Hoje offers Registrar avaria por vencimento, Enviar para reaproveitamento, Enviar para producao interna, and Confirmar esgotado in the correct terminal contexts.
2. GPP-linked Hoje actions confirm the product left the sales area before resolving sales-area risk.
3. Hoje-created GPP records preserve lot linkage, product code, quantity/unit, destination/finality, actor, and central acknowledgement state.
4. Internal purchases remain separate from Hoje and cannot be used to hide vencido or sales-area risk.
5. Existing build 170 semantics remain untouched until this future mobile version is intentionally built and validated.

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-discuss-phase 19 after Phase 18 verification)

### Phase 20: Tempo real do Hoje

**Goal:** Extend the proven store-room realtime layer from Controle GPP to Hoje so active tasks/lots refresh across web/mobile quickly while central snapshots remain the source of truth.

**Requirements:** GPP-10
**Status:** Not started
**Depends on:** Phase 19

**Success criteria:**
1. Hoje task/lot changes publish store-scoped events only after central database success.
2. Web/mobile clients treat realtime events as refresh hints and re-read central snapshots instead of mutating task truth from socket payloads.
3. Manual refresh and existing polling/fallback paths still work when realtime is paused, disconnected, or disabled.
4. Cross-device visibility improves without weakening central acknowledgement, conflict, or offline-pending semantics.
5. Realtime remains feature-flagged and can be disabled without breaking the core Hoje workflow.

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-discuss-phase 20 after Phase 19 verification)

## Milestone Outcome

v1.1 succeeds when the app feels like a real store tool instead of a pilot debug surface:

- Operators use Hoje and Ajustes without diagnostic clutter.
- Leadership sees device readiness permanently, but detailed device/update/UAT work lives in dedicated web views.
- Healthy sync/push/build state stays quiet; blockers become explicit with next actions.
- Loja 18 validation can run with real product/lote flow and public-safe proof boundaries.

v1.2 succeeds when Controle GPP becomes a trustworthy store tool without destabilizing the tested validity flow:

- GPP sees avarias, internal purchases, divergences, and history by store/sector from central truth.
- Sector operators can register avarias and internal purchase requests without paper becoming the primary workflow.
- Realtime makes work visible quickly, but central acknowledgement remains the only success source.
- Hoje integrates with GPP only after the GPP base is proven, preserving zero expired product in the sales area.

## Active Planning

Continue validating the current Loja 18 build 170 flow. When ready to start the GPP track:

```powershell
$gsd-discuss-phase 17
```

## Archive

Detailed v1.0 planning history is archived here:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
- `.planning/MILESTONES.md`

Phase execution directories from v1.0 were cleared from `.planning/phases/` when v1.1 started.

## Coverage

| Area | Requirements | Phase | Status |
|------|--------------|-------|--------|
| Web Operation | WEB-01..WEB-05 | Phase 13 | Complete |
| Mobile Ajustes | SET-01..SET-05 | Phase 14 | Complete |
| Operational Focus | OPS-01..OPS-04 | Phase 15 | Pending |
| Loja 18 Validation | VAL-01..VAL-04 | Phase 16 | Pending |
| GPP Web/API Realtime | GPP-01..GPP-07 | Phase 17 | Pending |
| GPP Mobile | GPP-08 | Phase 18 | Pending |
| GPP + Hoje Integration | GPP-09 | Phase 19 | Pending |
| Hoje Realtime | GPP-10 | Phase 20 | Pending |
