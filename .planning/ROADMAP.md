# Roadmap: Validade Zero

**Mode:** Vertical MVP
**Granularity:** Fine
**Requirements covered:** 37/37
**Current status:** v1.0 Repository Complete archived on 2026-06-28

## Milestones

- [x] **v1.0 Repository Complete** - Phases 1-12, 54 plans, shipped 2026-06-28.
- [ ] **Next milestone** - define with `$gsd-new-milestone`.

## Phases

<details>
<summary>v1.0 Repository Complete (Phases 1-12) - shipped 2026-06-28</summary>

### Phase 1: Engineering Foundation

**Goal:** Establish the monorepo, quality gates, security baseline, and public-repo safety needed for all future work.
**Plans:** 5/5 plans complete

### Phase 2: Domain and Risk Core

**Goal:** Model products, categories, formal validity, quality windows, and risk state calculation as tested domain logic.
**Plans:** 4/4 plans complete

### Phase 3: Mobile Lot Capture

**Goal:** Deliver the first mobile workflow for registering products/lots and confirming physical presence by location.
**Plans:** 4/4 plans complete

### Phase 4: Today Task Workflow

**Goal:** Turn calculated risks into the mobile "Hoje" task experience that directs shelf work.
**Plans:** 4/4 plans complete

### Phase 5: Push and Escalation

**Goal:** Add strong reminder and escalation behavior so unresolved risk keeps demanding attention.
**Plans:** 4/4 plans complete

### Phase 6: Markdown/Rebaixa Workflow

**Goal:** Track the full markdown lifecycle from request to shelf confirmation with optional evidence.
**Plans:** 4/4 plans complete

### Phase 7: Offline Sync

**Goal:** Make core mobile task execution reliable under poor store connectivity.
**Plans:** 4/4 plans complete

### Phase 8: Audit, Roles, and Shift Close

**Goal:** Provide leadership visibility, role-based access, evidence control, and shift-close assurance.
**Plans:** 5/5 plans complete

### Phase 9: Impeccable Hardening and v1 Readiness

**Goal:** Run UI/UX/copy, accessibility, security, performance, and E2E hardening before declaring v1 ready.
**Plans:** 5/5 plans complete
**Status:** Complete with external rollout blockers.

### Phase 10: Real Pilot Flow Rebuild

**Goal:** Rebuild the real pilot flows around product creation, lot lifecycle, central sync, access, and resolution truth.
**Plans:** 6/6 plans complete
**Status:** Complete with external Android/provider blockers.

### Phase 11: Mobile Visual Polish and Emulator Validation

**Goal:** Polish the Android critical mobile flow and validate the installed emulator/device path while preserving central-truth semantics.
**Plans:** 4/4 plans complete
**Status:** Complete with external device/provider/camera blockers.

### Phase 12: Pilot Operations and Device Readiness

**Goal:** Turn the closed-pilot build into an observable, supportable store operation with device, user, push, permissions, version and UAT readiness.
**Plans:** 5/5 plans complete
**Status:** Complete with external Android/provider/camera/physical UAT blockers.

</details>

## Milestone Outcome

The v1.0 milestone delivered the repository-complete closed-pilot spine:

- Mobile-first lot capture, physical presence, task resolution, markdown/rebaixa, offline queue, audit, roles, evidence controls, shift close, push/escalation semantics, and Command Center visibility.
- Central truth for product creation/reuse, lot lifecycle, task projection, terminal resolution, second-device convergence, and leadership web views.
- Pilot readiness surfaces for devices, push-test diagnostics, release metadata, guided Loja 18 UAT, and operational blocker synthesis.
- Validation artifacts showing all 37 v1 requirements traced through requirements, summaries, and verification records.

The milestone is not a physical rollout claim. Installed Android, real provider push, real camera/evidence path, and physical Loja 18 UAT remain external proof gates.

## Active Planning

No active phase is open after v1.0. Start the next cycle with:

```powershell
$gsd-new-milestone
```

## Archive

Detailed v1.0 planning history is archived here:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
- `.planning/MILESTONES.md`

Phase execution directories remain in `.planning/phases/` for raw history. Use `$gsd-cleanup` later if you want to move them into the milestone archive.

## Coverage

Full v1 traceability is archived in `.planning/milestones/v1.0-REQUIREMENTS.md`.

| Area | Requirements | Status |
|------|--------------|--------|
| Foundation | FND-01..FND-04 | Complete |
| Catalog and Lots | CAT-01..CAT-04 | Complete |
| Locations and Presence | LOC-01..LOC-04 | Complete |
| Risk and Tasks | RSK-01..RSK-05 | Complete |
| Push and Shift Workflow | PSH-01..PSH-05 | Complete |
| Markdown / Rebaixa | MRK-01..MRK-04 | Complete |
| Offline and Sync | SYN-01..SYN-03 | Complete |
| Audit and Security | AUD-01..AUD-04 | Complete |
| UI / UX / Copy | UI-01..UI-04 | Complete |
