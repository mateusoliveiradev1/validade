# Requirements: Validade Zero

**Defined:** 2026-06-18
**Core Value:** Garantir que nenhum produto vencido permaneça na área de venda, mantendo cada risco visível e acionável até sua resolução confirmada.

## v1 Requirements

### Foundation

- [ ] **FND-01**: Developer can work in a pnpm/Turborepo monorepo with isolated apps, shared packages, cacheable tasks, and consistent scripts.
- [ ] **FND-02**: Developer can rely on strict TypeScript, shared contracts, runtime validation, lint rules, and dependency boundaries across the repo.
- [ ] **FND-03**: Developer can run TDD-focused unit tests, integration tests, E2E checks, security checks, and quality gates from documented commands.
- [ ] **FND-04**: Public repository never contains production secrets, real customer/store data, or private evidence assets.

### Catalog and Lots

- [ ] **CAT-01**: Admin can register products with category, supplier, code/GTIN when available, and operational rule profile.
- [ ] **CAT-02**: Collaborator can register lots with product, quantity, validity date or quality window, received date, and current location.
- [ ] **CAT-03**: Collaborator can use camera/barcode assistance to find products while still manually confirming lot, validity, and quantity.
- [ ] **CAT-04**: Admin can distinguish formal-validity items from FLV fresh items controlled by quality and inspection rules.

### Locations and Presence

- [ ] **LOC-01**: Collaborator can move lots between sales area, stock, cold room, promotional island, and withdrawal/loss area.
- [ ] **LOC-02**: Collaborator can confirm that a lot is still present, moved, sold out/probably gone, withdrawn, lost, or not found.
- [ ] **LOC-03**: System tracks last physical presence with user, time, location, and approximate quantity.
- [ ] **LOC-04**: System treats unverified risky lots as uncertain instead of safe.

### Risk and Tasks

- [ ] **RSK-01**: System generates risk states from product/category rules, current date, validity or quality window, and last physical confirmation.
- [ ] **RSK-02**: System supports configurable windows including 60-day radar, 15-day markdown request, near-expiry critical alerts, and expired withdrawal.
- [ ] **RSK-03**: System creates tasks with owner, due time, status, severity, and required resolution for each actionable risk.
- [ ] **RSK-04**: Collaborator can resolve a task only by selecting a concrete action such as confirmed present, markdown requested, markdown applied, moved, withdrawn, loss, sold out/probably gone, or not found.
- [ ] **RSK-05**: System reopens or escalates tasks when critical risk remains unresolved.

### Push and Shift Workflow

- [ ] **PSH-01**: Collaborator receives push reminders for assigned and critical tasks.
- [ ] **PSH-02**: System repeats or escalates reminders while tasks remain unresolved.
- [ ] **PSH-03**: Collaborator can open a mobile "Hoje" view that lists what must be checked, rebaixado, moved, or withdrawn in the current shift.
- [ ] **PSH-04**: Lead can see whether the sales area is safe or has pending critical risks before shift close.
- [ ] **PSH-05**: System does not rely on push alone; every push corresponds to a persistent in-app task.

### Markdown / Rebaixa

- [ ] **MRK-01**: Collaborator can request markdown/rebaixa for a lot when rule windows require it.
- [ ] **MRK-02**: Lead can track markdown status as requested, approved, applied, and shelf-confirmed.
- [ ] **MRK-03**: Collaborator can attach optional photo evidence for applied price label or shelf confirmation.
- [ ] **MRK-04**: System keeps unresolved markdown tasks visible and escalates delayed approvals or applications.

### Offline and Sync

- [ ] **SYN-01**: Mobile app stores active tasks and required lot snippets locally for poor-connectivity operation.
- [ ] **SYN-02**: Mobile app records actions as idempotent offline commands before syncing.
- [ ] **SYN-03**: System syncs queued commands and surfaces conflicts clearly without silently marking critical actions as confirmed.

### Audit and Security

- [ ] **AUD-01**: System records an audit trail for task creation, assignment, action, escalation, evidence upload, and resolution.
- [ ] **AUD-02**: System enforces role-based access for collaborator, lead, and admin workflows.
- [ ] **AUD-03**: Evidence photos are stored outside Postgres with controlled access and only object references in the database.
- [ ] **AUD-04**: Security checks include dependency audit, secret scanning, authorization tests, and threat-model review before release.

### UI / UX / Copy

- [ ] **UI-01**: Mobile first screen answers "Área de venda segura?" and prioritizes critical operational tasks over passive charts.
- [ ] **UI-02**: Copy uses direct operational language such as "Retirar agora", "Pedir rebaixa", "Conferir ovos", and "Rebaixa atrasada".
- [ ] **UI-03**: Interface supports one-hand use, large touch targets, high contrast, clear critical states, and reduced ambiguity in store conditions.
- [ ] **UI-04**: Design work passes Impeccable shaping, critique, polish, hardening, accessibility, and copy review before v1 completion.

## v2 Requirements

### Integrations

- **INT-01**: System can import product or stock reports from existing corporate systems when export files are available.
- **INT-02**: System can integrate with ERP/sales APIs if the network later grants access.
- **INT-03**: System can automate price updates only after safe corporate integration exists.

### Advanced Intelligence

- **ADV-01**: System can suggest risk windows based on historical resolution times and category behavior.
- **ADV-02**: System can compare stores/sectors using operational risk metrics.
- **ADV-03**: System can parse supplier QR/DataMatrix data automatically when lot and validity are encoded.

### Distribution

- **DST-01**: System can be distributed through official app stores after the zero-cost pilot proves value.
- **DST-02**: System can support multiple stores with organization-level management and provisioning.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Exact sales-based inventory | No sales integration exists for v1. |
| Demand forecasting | Not needed to guarantee no expired product in sales area. |
| Automatic ERP price change | Requires corporate integration and approval outside current scope. |
| Paid stock images | Conflicts with zero-cost and operational authenticity. |
| Treating all FLV fresh as fixed-date expiration | Fresh produce often needs quality/inspection modeling instead. |
| App-store-only deployment | Conflicts with zero-cost pilot. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | TBD | Pending |
| FND-02 | TBD | Pending |
| FND-03 | TBD | Pending |
| FND-04 | TBD | Pending |
| CAT-01 | TBD | Pending |
| CAT-02 | TBD | Pending |
| CAT-03 | TBD | Pending |
| CAT-04 | TBD | Pending |
| LOC-01 | TBD | Pending |
| LOC-02 | TBD | Pending |
| LOC-03 | TBD | Pending |
| LOC-04 | TBD | Pending |
| RSK-01 | TBD | Pending |
| RSK-02 | TBD | Pending |
| RSK-03 | TBD | Pending |
| RSK-04 | TBD | Pending |
| RSK-05 | TBD | Pending |
| PSH-01 | TBD | Pending |
| PSH-02 | TBD | Pending |
| PSH-03 | TBD | Pending |
| PSH-04 | TBD | Pending |
| PSH-05 | TBD | Pending |
| MRK-01 | TBD | Pending |
| MRK-02 | TBD | Pending |
| MRK-03 | TBD | Pending |
| MRK-04 | TBD | Pending |
| SYN-01 | TBD | Pending |
| SYN-02 | TBD | Pending |
| SYN-03 | TBD | Pending |
| AUD-01 | TBD | Pending |
| AUD-02 | TBD | Pending |
| AUD-03 | TBD | Pending |
| AUD-04 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38

---
*Requirements defined: 2026-06-18*
*Last updated: 2026-06-18 after initial definition*
