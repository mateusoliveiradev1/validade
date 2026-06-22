# Roadmap: Validade Zero

**Mode:** Vertical MVP
**Granularity:** Fine
**Requirements covered:** 37/37

## Phases

### Phase 1: Engineering Foundation

**Goal:** Establish the monorepo, quality gates, security baseline, and public-repo safety needed for all future work.
**Mode:** mvp
**UI hint:** no
**Requirements:** FND-01, FND-02, FND-03, FND-04, AUD-04
**Success Criteria**:

1. Repository has pnpm/Turborepo workspace with apps/packages structure and consistent scripts.
2. TypeScript, linting, formatting, dependency boundaries, test runners, and security checks run from documented commands.
3. Public repo has safe secret handling, .env examples, and no real operational data.
4. CI can execute the baseline quality suite.

**Plans:** 5/5 plans complete
Plans:
**Wave 1**

- [x] 01-01-PLAN.md - Root workspace and shared package boundaries

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md - API, web, and mobile smoke skeleton

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md - Strict typing, linting, env safety, and repo guards

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md - Test pyramid, safe fixtures, and smoke coverage

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md - CI, security docs, threat model, and README

### Phase 2: Domain and Risk Core

**Goal:** Model products, categories, formal validity, quality windows, and risk state calculation as tested domain logic.
**Mode:** mvp
**UI hint:** no
**Requirements:** CAT-04, LOC-04, RSK-01, RSK-02
**Success Criteria**:

1. Domain package distinguishes formal-validity items from FLV quality-inspection items.
2. Risk engine computes radar, markdown, critical, expired, and uncertain states from rule profiles.
3. Critical domain rules have TDD coverage and mutation-ready structure.
4. Domain logic has no dependency on UI, database, or provider SDKs.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 02-01-PLAN.md - Domain test harness and product/rule vocabulary

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md - Formal-validity and FLV risk-window engine

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md - Physical presence uncertainty and operational commands

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md - Scenario matrix, mutation readiness, and boundary verification

### Phase 3: Mobile Lot Capture

**Goal:** Deliver the first mobile workflow for registering products/lots and confirming physical presence by location.
**Mode:** mvp
**UI hint:** yes
**Requirements:** CAT-01, CAT-02, CAT-03, LOC-01, LOC-02, LOC-03
**Success Criteria**:

1. Collaborator can register product and lot data from mobile.
2. Camera/barcode helps product lookup without becoming mandatory.
3. Collaborator can move and confirm lots across operational locations.
4. Last-seen data captures user, time, location, and approximate quantity.

**Plans:** 4/4 plans complete

**Wave 1**

- [x] 03-01-PLAN.md - Runtime-validated capture contracts and durable local SQLite ledger

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md - Manual product discovery, confirmation, and mode-aware lot registration

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md - Recent lot list and append-only physical observation workflow

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-04-PLAN.md - Optional barcode lookup, accessibility hardening, and mobile smoke coverage

### Phase 4: Today Task Workflow

**Goal:** Turn calculated risks into the mobile "Hoje" task experience that directs shelf work.
**Mode:** mvp
**UI hint:** yes
**Requirements:** RSK-03, RSK-04, PSH-03, UI-01, UI-02, UI-03
**Success Criteria**:

1. Mobile first screen answers whether the sales area is safe.
2. Tasks show severity, due time, required action, and concrete resolution options.
3. Copy is direct and operational for store conditions.
4. Interface supports high contrast, one-hand use, and clear critical states.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 04-01-PLAN.md - Task derivation, contracts, and local task repository

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md - Hoje safety header, task sections, and mobile entry surface

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03-PLAN.md - Compatible task resolution, recheck, and evidence prompt contract

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-04-PLAN.md - Overdue/a11y/smoke hardening and full regression evidence

### Phase 5: Push and Escalation

**Goal:** Add strong reminder and escalation behavior so unresolved risk keeps demanding attention.
**Mode:** mvp
**UI hint:** yes
**Requirements:** RSK-05, PSH-01, PSH-02, PSH-05
**Success Criteria**:

1. Assigned collaborators receive push reminders for critical tasks.
2. Unresolved tasks repeat or escalate according to rule profiles.
3. Every push maps to a persistent in-app task.
4. Critical risk remains visible until physically resolved.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 05-01-PLAN.md - Alert cadence policy and runtime contracts

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md - Mobile alert state, Expo channel, and local scheduling

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-03-PLAN.md - Hoje alert UI, escalation acknowledgement, and push-open fallback

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-04-PLAN.md - API/provider cron seam, smoke, docs, and regression evidence

### Phase 6: Markdown/Rebaixa Workflow

**Goal:** Track the full markdown lifecycle from request to shelf confirmation with optional evidence.
**Mode:** mvp
**UI hint:** yes
**Requirements:** MRK-01, MRK-02, MRK-03, MRK-04
**Success Criteria**:

1. Collaborator can request markdown for eligible lots.
2. Lead can track requested, approved, applied, and shelf-confirmed states.
3. Evidence photo can be attached to applied labels or shelf confirmation.
4. Delayed markdown tasks remain visible and escalate.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 06-01-PLAN.md - Domain markdown lifecycle and runtime contracts

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md - Local markdown workflow repository and alertable stage tasks

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-03-PLAN.md - Mobile Hoje, lot-detail, and task-panel markdown flows

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-04-PLAN.md - Delayed-stage escalation, accessibility, smoke, and docs

### Phase 7: Offline Sync

**Goal:** Make core mobile task execution reliable under poor store connectivity.
**Mode:** mvp
**UI hint:** yes
**Requirements:** SYN-01, SYN-02, SYN-03
**Success Criteria**:

1. Mobile app caches active tasks and required lot snippets.
2. Offline actions are queued as idempotent commands.
3. Sync conflicts are explicit and never silently confirm critical actions.
4. User can understand which actions are synced and which are pending.

**Plans:** 4/4 plans complete
Plans:
**Wave 1**

- [x] 07-01-PLAN.md - Sync contracts and pure offline policy

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md - Mobile offline cache, outbox, and repository projections

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md - Connectivity adapter, sync engine, and API transport seam

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-04-PLAN.md - Hoje sync UI, conflict review, smoke, docs, and regression

### Phase 8: Audit, Roles, and Shift Close

**Goal:** Provide leadership visibility, role-based access, evidence control, and shift-close assurance.
**Mode:** mvp
**UI hint:** yes
**Requirements:** AUD-01, AUD-02, AUD-03, PSH-04
**Success Criteria**:

1. Audit trail records task lifecycle, evidence, escalation, and resolution events.
2. Collaborator, lead, and admin roles have distinct permissions.
3. Evidence assets are stored outside Postgres with controlled access.
4. Lead can confirm whether the sales area is safe before shift close.

**Plans:** 3/5 plans executed
Plans:
**Wave 1**

- [x] 08-01-PLAN.md - Role-aware protected path, durable memberships, and denial auditing

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-02-PLAN.md - Append-only audit producers, mobile timelines, and web workbench

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-03-PLAN.md - Offline evidence queue, private R2 lifecycle, and controlled access

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 08-04-PLAN.md - Truthful safe/unsafe shift close, handoff, and immutable reopen

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 08-05-PLAN.md - Membership administration, integrated security/E2E gates, and runbooks

### Phase 9: Impeccable Hardening and v1 Readiness

**Goal:** Run UI/UX/copy, accessibility, security, performance, and E2E hardening before declaring v1 ready.
**Mode:** mvp
**UI hint:** yes
**Requirements:** UI-04
**Success Criteria**:

1. Impeccable shape/critique/polish/harden passes are completed for mobile and web surfaces.
2. Critical journeys have E2E coverage.
3. Security and public-repo checks pass with no known critical issues.
4. v1 release criteria are documented with remaining risks.

## Coverage

| Requirement | Phase |
|-------------|-------|
| FND-01 | Phase 1 |
| FND-02 | Phase 1 |
| FND-03 | Phase 1 |
| FND-04 | Phase 1 |
| AUD-04 | Phase 1 |
| CAT-04 | Phase 2 |
| LOC-04 | Phase 2 |
| RSK-01 | Phase 2 |
| RSK-02 | Phase 2 |
| CAT-01 | Phase 3 |
| CAT-02 | Phase 3 |
| CAT-03 | Phase 3 |
| LOC-01 | Phase 3 |
| LOC-02 | Phase 3 |
| LOC-03 | Phase 3 |
| RSK-03 | Phase 4 |
| RSK-04 | Phase 4 |
| PSH-03 | Phase 4 |
| UI-01 | Phase 4 |
| UI-02 | Phase 4 |
| UI-03 | Phase 4 |
| RSK-05 | Phase 5 |
| PSH-01 | Phase 5 |
| PSH-02 | Phase 5 |
| PSH-05 | Phase 5 |
| MRK-01 | Phase 6 |
| MRK-02 | Phase 6 |
| MRK-03 | Phase 6 |
| MRK-04 | Phase 6 |
| SYN-01 | Phase 7 |
| SYN-02 | Phase 7 |
| SYN-03 | Phase 7 |
| AUD-01 | Phase 8 |
| AUD-02 | Phase 8 |
| AUD-03 | Phase 8 |
| PSH-04 | Phase 8 |
| UI-04 | Phase 9 |
