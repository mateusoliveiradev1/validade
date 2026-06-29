# Roadmap: Validade Zero

**Mode:** Vertical MVP
**Granularity:** Fine
**Requirements covered:** 18/18
**Current status:** v1.1 Operacao Real de Loja e Diagnostico planning

## Milestones

- [x] **v1.0 Repository Complete** - Phases 1-12, 54 plans, shipped 2026-06-28.
- [ ] **v1.1 Operacao Real de Loja e Diagnostico** - Separate daily operation, devices, updates, mobile settings, and Loja 18 validation.

## Phases

<details>
<summary>v1.0 Repository Complete (Phases 1-12) - shipped 2026-06-28</summary>

The v1.0 milestone delivered the repository-complete closed-pilot spine: mobile capture, Hoje tasks, markdown/rebaixa, offline sync, audit/RBAC/evidence, shift close, central truth, Command Center, device readiness, push-test diagnostics, build truth, and guided Loja 18 UAT.

The milestone is not a physical rollout claim. Installed Android, real provider push, real camera/evidence path, and physical Loja 18 UAT remain external proof gates.

</details>

### Phase 13: Web Operational Navigation and Readiness Surfaces

**Goal:** Reorganize the web leadership surface so the Command Center stays focused on sales-area safety while devices, updates, and validation each have a durable place.

**Requirements:** WEB-01, WEB-02, WEB-03, WEB-04, WEB-05
**Status:** Not started

**Success criteria:**
1. Command Center first scan answers the operational safety question without verbose pilot/UAT/build panels in the daily flow.
2. A compact device-readiness summary is always visible from the web operational shell or Command Center header.
3. A dedicated Aparelhos view shows per-device readiness, last central read, last sync, push/camera state, build compatibility, safe push-test status, and next action.
4. A dedicated Atualizacoes view shows approved build, installed versions by device, stale/incompatible devices, and a safe APK/QR update path without leaking secrets.
5. A dedicated Validacao / Go-No-Go view carries Loja 18 UAT and rollout blockers without competing with the daily Command Center.

### Phase 14: Mobile Ajustes and Device Controls

**Goal:** Add a mobile Ajustes area that owns account/store context, push and reminders, sync health, update truth, diagnostics, privacy, and sign-out.

**Requirements:** SET-01, SET-02, SET-03, SET-04, SET-05
**Status:** Not started

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

## Milestone Outcome

v1.1 succeeds when the app feels like a real store tool instead of a pilot debug surface:

- Operators use Hoje and Ajustes without diagnostic clutter.
- Leadership sees device readiness permanently, but detailed device/update/UAT work lives in dedicated web views.
- Healthy sync/push/build state stays quiet; blockers become explicit with next actions.
- Loja 18 validation can run with real product/lote flow and public-safe proof boundaries.

## Active Planning

Start with Phase 13:

```powershell
$gsd-discuss-phase 13
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
| Web Operation | WEB-01..WEB-05 | Phase 13 | Pending |
| Mobile Ajustes | SET-01..SET-05 | Phase 14 | Pending |
| Operational Focus | OPS-01..OPS-04 | Phase 15 | Pending |
| Loja 18 Validation | VAL-01..VAL-04 | Phase 16 | Pending |
