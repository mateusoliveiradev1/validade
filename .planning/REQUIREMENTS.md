# Requirements: Validade Zero v1.1

**Defined:** 2026-06-29
**Milestone:** v1.1 Operacao Real de Loja e Diagnostico
**Core Value:** Garantir que nenhum produto vencido permaneca na area de venda, mantendo cada risco visivel e acionavel ate sua resolucao confirmada.

## v1.1 Requirements

### Web Operation

- [x] **WEB-01**: Leadership can use the Command Center as the daily sales-area safety view without UAT, Go/No-Go, build, or verbose device diagnostics crowding the first operational scan.
- [x] **WEB-02**: Leadership can always see a compact device-readiness summary in the web operational shell or Command Center header, including counts for authorized, blocked, attention, and ready devices.
- [x] **WEB-03**: Leadership can open a dedicated Aparelhos view with per-device readiness, last central read, last sync, push/camera state, build compatibility, safe push-test status, and next action.
- [x] **WEB-04**: Leadership can open an Atualizacoes view that shows the approved APK/build, installed versions by device, stale or incompatible devices, and a safe update path such as APK link or QR without exposing secrets.
- [x] **WEB-05**: Leadership can open a Validacao / Go-No-Go view for Loja 18 UAT, rollout blockers, and evidence status without mixing that validation checklist into the daily Command Center.

### Mobile Ajustes

- [x] **SET-01**: The operator can open Ajustes from the mobile app shell while preserving the active store, role, session, and current operational context.
- [x] **SET-02**: The operator can view and manage push/lembretes in Ajustes, including permission state, provider/local reminder state, test action, disable path, and honest copy that push is not physical execution.
- [x] **SET-03**: The operator can view synchronization health in Ajustes, including last central read, last sync, pending local commands, conflicts, retry/discard path, and whether the state blocks safe close.
- [x] **SET-04**: The operator can view update/build truth in Ajustes, including installed version, approved version, environment, API target, package id, and manual update instructions for local APK distribution.
- [x] **SET-05**: The operator can access account, store, privacy, and sign-out controls from Ajustes using the existing closed-pilot authorization model.

### Operational Focus

- [ ] **OPS-01**: Hoje shows sync, push, and build/update health compactly when healthy, and promotes those states to blocking cards only when they affect task execution, safe close, or validation.
- [ ] **OPS-02**: Preparar turno guides an empty real store from first central read into product creation/reuse and lot registration without making an expected empty catalog look like a fatal error.
- [ ] **OPS-03**: Fechamento do turno summarizes active tasks, unresolved sync, stale central read, device/update blockers, and the physical checklist before any safe-close action can be accepted.
- [ ] **OPS-04**: Command Center, Hoje, and Ajustes use the same readiness vocabulary for central read, local cache, sync queue, push, camera, build, and device authorization.

### Loja 18 Validation

- [ ] **VAL-01**: A store lead can run a guided Loja 18 validation path covering first real product, real lot, task projection, task resolution, second-device visibility, update/build status, and shift close.
- [ ] **VAL-02**: Validation records pass, blocked, and external-blocked outcomes public-safely, without storing real product names, photos, tokens, private URLs, or personal data in repository artifacts.
- [ ] **VAL-03**: The app keeps APK install, provider push, camera/evidence, second-device proof, and physical Loja 18 UAT as explicit gates instead of treating repo tests or mocks as rollout proof.
- [ ] **VAL-04**: The milestone produces a clear next-step runbook for store validation so the operator knows what to do in the aisle and leadership knows what evidence is still missing.

## Future Requirements

### Updates

- **UPD-01**: The app can use Expo/EAS Update or another OTA-compatible update channel for JavaScript-only fixes when the installed runtime is compatible.
- **UPD-02**: The app can enforce mandatory update windows after a production distribution channel exists.

### Rollout

- **ROL-01**: Multi-store rollout can enroll additional stores beyond Loja 18 with store-specific validation state.
- **ROL-02**: Production cutover can run against a separate production environment with backup, restore drill, and migration verification.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic silent update for sideloaded local APK | Local APK distribution is not a reliable auto-update channel; v1.1 must show update truth and manual path first. |
| App store release | Still outside the zero-cost closed pilot and requires separate distribution, privacy, and compliance work. |
| Direct ERP, stock, or sales integration | The pilot continues without internal network/API dependencies. |
| Treating push provider accepted as task execution | Push remains reminder/diagnostic only; physical execution needs task state and confirmation. |
| Storing real Loja 18 evidence in the public repo | Public-repo safety remains mandatory; UAT artifacts must stay sanitized. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WEB-01 | Phase 13 | Complete |
| WEB-02 | Phase 13 | Complete |
| WEB-03 | Phase 13 | Complete |
| WEB-04 | Phase 13 | Complete |
| WEB-05 | Phase 13 | Complete |
| SET-01 | Phase 14 | Complete |
| SET-02 | Phase 14 | Complete |
| SET-03 | Phase 14 | Complete |
| SET-04 | Phase 14 | Complete |
| SET-05 | Phase 14 | Complete |
| OPS-01 | Phase 15 | Pending |
| OPS-02 | Phase 15 | Pending |
| OPS-03 | Phase 15 | Pending |
| OPS-04 | Phase 15 | Pending |
| VAL-01 | Phase 16 | Pending |
| VAL-02 | Phase 16 | Pending |
| VAL-03 | Phase 16 | Pending |
| VAL-04 | Phase 16 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-06-29*
*Last updated: 2026-06-29 after v1.1 milestone definition*
