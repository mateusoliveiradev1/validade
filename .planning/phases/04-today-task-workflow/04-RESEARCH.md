# Phase 04: Today Task Workflow - Research

**Researched:** 2026-06-19
**Status:** Ready for planning
**Mode:** MVP / mobile vertical task workflow

## RESEARCH COMPLETE

Phase 4 should add a local-first task layer over the Phase 2 risk engine and the Phase 3 capture ledger. The right shape is not a new backend, push queue, analytics dashboard, or evidence storage system. It is a focused mobile "Hoje" workflow that derives actionable lot tasks from existing local lot snapshots, persists task state locally, blocks incompatible resolutions, and keeps sales-area safety visible until a compatible physical action and required recheck are complete.

The implementation should stay sequential and vertical: first create task vocabulary/contracts/storage, then render the Hoje surface, then implement resolution and recheck loops, then harden accessibility, overdue/refresh states, and smoke coverage.

## Source Inputs

- `.planning/ROADMAP.md` assigns RSK-03, RSK-04, PSH-03, UI-01, UI-02, and UI-03 to this phase.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` locks D-01 through D-25, including task eligibility, sales-area priority, compatible resolution, recheck, evidence prompt, owner, due behavior, and the "Area de venda segura?" contract.
- `.planning/phases/04-today-task-workflow/04-UI-SPEC.md` locks the mobile visual/copy system for the Hoje screen and the local primitives expected by execution.
- Phase 2 domain code exposes `calculateLotRisk`, risk states, operational commands, and physical-confirmation freshness rules in `packages/domain`.
- Phase 3 mobile code provides `CaptureRepository`, SQLite/memory implementations, recent lot snapshots, lot detail, observation append, reinforced confirmation, and Portuguese-BR capture copy.

## Existing Implementation Findings

### Reusable boundaries

- `packages/domain/src/risk.ts` is the only source that should decide whether a lot is `expired`, `critical`, `markdown_due`, `uncertain`, `radar`, or `safe`.
- `packages/contracts/src/capture.ts` already validates product, lot, operational location, lot identity, and physical observation inputs.
- `apps/mobile/src/capture/repository.ts` already exposes current lot snapshots and detail records that include product profile, lot facts, and current observation.
- `apps/mobile/src/capture/sqlite-repository.ts` already has idempotent local migrations and parameterized storage that can be extended for task records.
- `ObservationComposer` and `ConfirmationSheet` already represent action-first physical observations and reinforced confirmation. Phase 4 should extend or wrap them for task resolution instead of duplicating an incompatible workflow.

### Current gaps

- There is no task identity, status, owner, due time, severity, required resolution, or recheck record.
- `RecentLotList` shows uncertainty and current physical state but intentionally does not create tasks.
- `CaptureApp` starts at product discovery; Phase 4 needs a first-class `Hoje` path while keeping `Registrar lote`, recent lots, detail, and observation flows reachable.
- The repository can append observations but cannot yet resolve a task, block an incompatible action, or create a follow-up recheck.
- Evidence is not stored. Phase 4 should only capture the UX/contract expectation for a photo or explicit no-photo reason.

## Recommended Architecture

### 1. Add a pure task derivation layer

Create a small pure module, likely `packages/domain/src/tasks.ts`, that maps risk assessments and current lot facts into task candidates. It should not import React Native, SQLite, contracts, or repository code.

The pure layer should define:

- actionable risk states: `expired`, `critical`, `markdown_due`, and `uncertain`;
- non-actionable `radar` as future attention only;
- severity and due buckets such as `now`, `shift`, `today`, and `follow_up`;
- required resolution kinds such as `withdraw_or_loss`, `check_presence`, `request_markdown`, and `follow_up_recheck`;
- priority comparison that places sales-area expired/critical/uncertain lots before markdown and other-location work.

This keeps "what must be done" testable without coupling it to the mobile screen.

### 2. Add runtime contracts for task records and resolution commands

Create task schemas in `packages/contracts/src/tasks.ts` and export them from `packages/contracts/src/index.ts`. Contracts should preserve domain vocabulary, but represent mobile storage and UI command inputs clearly:

- `TodayTaskSchema`: task id, lot id, risk state, required resolution, section, due bucket, status, owner label, source risk, and recheck parent when applicable.
- `TaskResolutionInputSchema`: task id, chosen action, actor label, occurred time, optional destination, quantity/evidence/no-photo fields, and confirmation metadata.
- `EvidencePromptSchema`: "photo captured" placeholder or explicit no-photo reason. Do not store binary files or object keys yet.

Runtime validation belongs at repository boundaries and command handlers. The pure domain package should not import Zod.

### 3. Extend the local repository, not a remote workflow

Extend `CaptureRepository` or add a narrow `TodayTaskRepository` port in `apps/mobile/src/capture/` backed by both memory and SQLite. Required operations:

- initialize task tables;
- refresh tasks from current lots and risk calculations;
- list active Hoje tasks ordered by operational priority;
- list future radar attention separately;
- resolve a task through a compatible action;
- create a recheck task after withdrawal/loss from sales area;
- keep last successful list visible when refresh fails.

SQLite can add local task tables in the existing database. No Cloudflare Worker, Neon, push, cron, outbox, R2, remote audit, or role enforcement should enter this phase.

### 4. Build Hoje as the first operational surface

`CaptureApp` should show `Hoje` first after initialization and provide clear routes to:

- `Registrar lote`;
- recent lot list;
- lot detail;
- task resolution panel;
- existing observation flow when a task action needs physical confirmation.

The screen hierarchy is fixed by the UI-SPEC: sales-area safety verdict first, then critical task, compatible action, product/lot/location, due/owner, and supporting reason. It should remain a mobile task column, not a desktop dashboard.

### 5. Enforce compatible resolution before closing

Task resolution rules should be explicit and tested:

- expired lots cannot close through "confirmar presenca";
- sales-area expired withdrawal/loss requires destination `Retirada/perda`;
- withdrawal/loss of a sales-area expired or critical task creates `Reconferir area de venda`;
- the safety header does not return to safe while that recheck is open;
- "not found", "probably sold out", and "rebaixa solicitada" close the immediate task only conditionally and create follow-up work when safety is not final;
- incompatible actions render inline blocking copy and suggest the correct action.

The existing `ConfirmationSheet` can be extended so destructive and conditional outcomes show product, lot, local, quantity, chosen action, and consequence.

### 6. Evidence prompt is contract-only in Phase 4

For recheck completion, ask for `Registrar foto da area` when possible or require a no-photo reason. Store only the chosen placeholder/status and explicit reason in local task resolution metadata. Do not add R2, image picker upload, offline binary sync, controlled access, evidence object keys, or audit retention.

## Validation Architecture

Phase 4 needs fast feedback after every plan and broader regression at closeout.

| Layer | Focus | Command / evidence |
|---|---|---|
| Domain task derivation | actionable risk filtering, priority, due bucket, compatible resolution matrix | `pnpm.cmd --filter @validade-zero/domain test -- tasks` |
| Contract validation | task record, resolution command, evidence/no-photo metadata | `pnpm.cmd --filter @validade-zero/contracts test -- tasks` or root Vitest project if contracts has no package test script |
| Repository behavior | memory adapter, SQLite migration, task refresh, recheck creation, radar future attention | `pnpm.cmd --filter @validade-zero/mobile test -- today-task-repository` |
| Mobile component flow | Hoje header, sections, task rows, resolution panel, incompatible-action notice, evidence/recheck prompt | `pnpm.cmd --filter @validade-zero/mobile test -- today` |
| Accessibility/copy | Portuguese-BR labels, 48 dp targets, non-color-only risk states, reduced ambiguity, wrapping | `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` |
| Native smoke | initial Hoje screen and a critical task route when fixture support is practical | `pnpm.cmd test:e2e:mobile` when Android/iOS runtime is available |
| Full regression | monorepo quality/security suite | `pnpm.cmd check` |

If contract package lacks a focused test script, use the root Vitest config with the exact test filename. If native runtime is unavailable, record the exact blocker in the summary and keep component/static coverage green.

## Security, Privacy, and Safety Notes

- Task generation uses local risk inputs; every runtime task/resolution input is untrusted until parsed by contracts.
- Task resolution must be idempotent enough for local repeated taps: do not create duplicate active tasks for the same lot/risk/recheck key.
- Do not store real photos, private evidence, production data, or secrets.
- Do not use sales, stock, ERP, or remote APIs to infer whether a lot disappeared.
- Do not let a push, refresh, or "resolved" button alone hide a critical sales-area risk.
- Keep `packages/domain` pure and keep mobile storage behind repository ports.

## Common Pitfalls

- Turning `radar` into a task and drowning the shift list.
- Closing expired sales-area risk after withdrawal without a recheck.
- Treating "not found" or "probably sold out" as final safety.
- Adding photo/R2/audit work because the UX asks for evidence.
- Building a dashboard of metrics instead of the single operational answer: area de venda segura?
- Duplicating date/risk rules in React Native components.
- Hiding lot-level tasks inside one grouped product card.

## Planning Recommendation

Plan the phase as four sequential waves:

1. Task derivation, contracts, repository tables, refresh, priority, and future-attention separation.
2. Hoje screen shell, safety header, task sections, task rows, refresh behavior, and navigation from CaptureApp.
3. Resolution panel, incompatible-action blocking, reinforced confirmations, sales-area withdrawal/loss recheck, and evidence/no-photo contract.
4. Owner/due/overdue polish, accessibility/copy hardening, Maestro smoke update, full regression, and honest verification summary.

This order creates a tested task source before UI, then resolves the highest-safety behavior before final hardening.
