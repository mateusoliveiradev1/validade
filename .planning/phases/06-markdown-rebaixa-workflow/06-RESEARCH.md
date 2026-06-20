# Phase 06: Markdown/Rebaixa Workflow - Research

**Researched:** 2026-06-20
**Status:** Ready for UI contract before planning
**Mode:** MVP / local-first markdown lifecycle

## RESEARCH COMPLETE

Phase 6 should turn the current one-click `request_markdown` task into a typed, blocked lifecycle for each lot: requested, approved, applied, and shelf-confirmed. The safest MVP shape is not an ERP price-change integration, a role system, a remote evidence store, or a full audit ledger. It is a local-first markdown workflow that extends the existing "Hoje" task model, creates one active task per current stage, preserves stage history, requires leadership decision for approval/rejection, asks for photo placeholder or explicit no-photo reason at application and shelf confirmation, and reuses Phase 5 alert/escalation state for delayed stages.

The phase should keep "Hoje" as the operational source of truth while also exposing a lot-detail entry point for eligible or justified early markdown requests. A lot with stale or uncertain physical presence must not start or advance markdown directly; it must route the collaborator to presence confirmation first.

## Source Inputs

- `.planning/ROADMAP.md` assigns MRK-01, MRK-02, MRK-03, and MRK-04 to Phase 6.
- `.planning/REQUIREMENTS.md` defines request, status tracking, optional evidence, and delayed markdown escalation requirements.
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md` locks D-01 through D-18 for eligibility, early exception, blocked stages, responsibility, stage delays, evidence, and deferred storage/sync scope.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` and Phase 4 code define the existing "Hoje" source-of-truth task workflow, compatible resolutions, recheck behavior, and evidence metadata pattern.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` and Phase 5 code define persistent alert state, reminder cadence, escalation audience, and the rule that alerts never resolve tasks.
- `packages/domain/src/tasks.ts`, `packages/domain/src/alerts.ts`, `packages/contracts/src/tasks.ts`, `apps/mobile/src/capture/repository.ts`, `apps/mobile/src/capture/sqlite-repository.ts`, `apps/mobile/src/capture/TodayScreen.tsx`, `apps/mobile/src/capture/TaskResolutionPanel.tsx`, `apps/mobile/src/capture/LotDetailScreen.tsx`, and `apps/mobile/src/capture/today-copy.ts` are the key implementation anchors.

## Existing Implementation Findings

### Reusable boundaries

- `packages/domain/src/tasks.ts` already defines actionable risk states, `request_markdown`, due buckets, sections, priorities, and compatible resolution helpers with pure TypeScript and no infrastructure imports.
- `packages/domain/src/alerts.ts` already computes alert cadence, off-shift eligibility, escalation audience, and privacy-safe notification content from task facts.
- `packages/contracts/src/tasks.ts` already validates `TodayTaskRecord`, `TaskResolutionCommand`, `resolutionHistory`, and `EvidencePromptMetadataSchema` with `photo_recorded_placeholder` and `no_photo_reason`.
- `apps/mobile/src/capture/repository.ts` is the right port to extend with markdown lifecycle commands because it owns task refresh, task resolution, lot detail loading, alert state refresh, and parse helpers.
- `apps/mobile/src/capture/memory-repository.ts` and `apps/mobile/src/capture/sqlite-repository.ts` already mirror task behavior and preserve resolution history; both must gain the same markdown workflow behavior.
- `apps/mobile/src/capture/sqlite-repository.ts` uses idempotent local migrations, transaction wrappers for multi-step task writes, strict mapping through contracts, and indexed task/alert tables.
- `apps/mobile/src/capture/TodayScreen.tsx` already renders overdue tasks first, sectioned active tasks, alert state rows, and escalation acknowledgement while keeping tasks visible.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` already blocks incompatible actions, uses reinforced confirmation, and records evidence metadata for sales-area recheck.
- `apps/mobile/src/capture/LotDetailScreen.tsx` currently only supports observation; it is the natural second entry point for an eligible or justified markdown request.
- `apps/mobile/src/capture/today-copy.ts` centralizes direct Portuguese-BR operational copy, currently ASCII-normalized in source.

### Current gaps

- `request_markdown` currently resolves the immediate task; it does not create or track a markdown entity or stage chain.
- There is no markdown lifecycle vocabulary for `requested`, `approved`, `rejected`, `applied`, or `shelf_confirmed`.
- There are no task stages such as `approve_markdown`, `apply_markdown`, or `confirm_markdown_on_shelf`.
- There is no early exception command with required justification.
- There is no leadership approval/rejection command or mandatory rejection reason.
- There is no local markdown workflow table or indexed lookup by lot/status.
- There is no stage-specific evidence context: label/price evidence for application and label-plus-product/location evidence for final shelf confirmation.
- Delayed markdown stages currently depend only on generic task age; there is no domain copy, stage severity, or stronger cadence for application/final confirmation.
- Lot detail cannot surface "Solicitar rebaixa" and cannot block the request when presence is uncertain.

## Recommended Architecture

### 1. Add pure markdown workflow vocabulary in the domain package

Extend the domain package with a pure module, likely `packages/domain/src/markdown.ts`, instead of overloading generic task helpers. The module should define:

- `MARKDOWN_WORKFLOW_STAGES`: `requested`, `approved`, `applied`, `shelf_confirmed`, `rejected`.
- `MARKDOWN_STAGE_TASKS`: `approve_markdown`, `apply_markdown`, `confirm_markdown_on_shelf`.
- `MarkdownRequestReason`: `rule_window`, `excess_stock`, `quality_issue`, `package_damage`, `operational_guidance`, `other`.
- stage due profile: approval uses `today` or `shift`, application uses `shift`, final shelf confirmation uses `now` or `shift` and higher priority than approval.
- helper such as `canStartMarkdownWorkflow` that returns blocked when the current physical observation is stale, missing, not found, probably sold out, or otherwise uncertain.
- helper such as `nextMarkdownStageTask` that closes the current stage and derives the next task candidate without importing React Native, SQLite, Zod, or Expo.

Keep `packages/domain/src/tasks.ts` as the generic "Hoje" task vocabulary, but extend its resolution/action vocabulary only where the task system must understand new required resolutions. Avoid a detached markdown queue that never appears in "Hoje".

### 2. Add strict runtime contracts for markdown records and commands

Create `packages/contracts/src/markdown.ts` and export it from `packages/contracts/src/index.ts`. Recommended schemas:

- `MarkdownWorkflowRecordSchema`: id, lotId, status, currentStage, requestedAt, requestedBy, requestReason, optional earlyJustification, optional approvedAt/approvedBy, optional rejectedAt/rejectedBy/rejectionReason, optional appliedAt/appliedBy/evidence, optional shelfConfirmedAt/shelfConfirmedBy/evidence, stageHistory, createdAt, updatedAt.
- `MarkdownStageHistoryEntrySchema`: stage, action, actorLabel, occurredAt, optional reason, optional evidence.
- `MarkdownRequestCommandSchema`: lotId, actorLabel, occurredAt, reason, optional earlyJustification.
- `MarkdownApprovalCommandSchema`: workflowId, taskId, actorLabel, occurredAt, decision `approved | rejected`, optional rejectionReason.
- `MarkdownApplicationCommandSchema`: workflowId, taskId, actorLabel, occurredAt, evidence.
- `MarkdownShelfConfirmationCommandSchema`: workflowId, taskId, actorLabel, occurredAt, evidence.

Reuse `EvidencePromptMetadataSchema` instead of introducing binary/photo URI fields. Tests must reject `uri`, `base64`, `objectKey`, and generic evidence text without structured metadata.

### 3. Extend the local repository as the workflow coordinator

Extend `CaptureRepository` with narrow markdown operations, backed by both memory and SQLite:

- `requestMarkdown(input)`: validates lot presence and eligibility, creates a workflow record, resolves the source `request_markdown` task when applicable, and creates `approve_markdown`.
- `decideMarkdown(input)`: leadership approves or rejects. Approval closes approval task and creates `apply_markdown` for "Equipe do turno"; rejection closes workflow with mandatory reason and does not create follow-up markdown task.
- `recordMarkdownApplication(input)`: closes application task with evidence/no-photo metadata and creates `confirm_markdown_on_shelf`.
- `confirmMarkdownOnShelf(input)`: closes final confirmation task with evidence/no-photo metadata and marks workflow shelf-confirmed.
- `listActiveMarkdownWorkflows` or `loadMarkdownWorkflowForLot`: supports lot detail and task panels without leaking table structure to UI.

SQLite should add a local table such as `markdown_workflows` plus indexes on `lot_id`, `status`, `current_stage`, and `updated_at`. If stage history becomes complex, keep it as strict JSON in this MVP, mirroring existing task `resolution_history_json`; do not add a complete audit table until Phase 8.

Every multi-step transition must be transactional: update workflow, resolve current task, create next task, and refresh alert state inputs together. Duplicate active workflows for the same lot should be rejected or treated idempotently.

### 4. Derive active stage tasks into "Hoje"

The plan should evolve `TodayTaskRecord` rather than hide markdown work elsewhere. Options:

- extend `RequiredResolution` with `approve_markdown`, `apply_markdown`, and `confirm_markdown_on_shelf`;
- extend `TaskResolutionAction` with `approve_markdown`, `reject_markdown`, `apply_markdown`, and `confirm_markdown_on_shelf`;
- keep `section: "request_markdown"` for markdown-related tasks or add a focused markdown section only if UI-SPEC requires it;
- include a markdown workflow id in task metadata if contracts need to route from a task to the workflow.

Approval tasks can be assigned to a leadership label without formal RBAC. Application and final confirmation should use "Equipe do turno" until roles are formalized in Phase 8.

### 5. Add focused mobile flows

The mobile UX should have one task panel with markdown-specific stage copy, not several unrelated screens:

- Existing `request_markdown` task opens "Solicitar rebaixa" and records rule-window request.
- Lot detail exposes "Solicitar rebaixa" when eligible and "Solicitar rebaixa antecipada" with justification when outside the normal window but still physically confirmed.
- If current observation is stale/uncertain/not found/probably sold out, the lot detail and task panel must show "Conferir presenca antes da rebaixa" and route to observation.
- Leadership approval panel shows requested reason, lot, product, location, and mandatory rejection reason.
- Application panel asks for label/price evidence or explicit no-photo reason.
- Final confirmation panel asks for shelf/product/location evidence or explicit no-photo reason.
- Today rows and overdue copy should say where the process is stuck: "Aprovar rebaixa", "Aplicar rebaixa", "Conferir etiqueta na area de venda", "Rebaixa atrasada".

The UI should reuse `PrimaryAction`, `SecondaryAction`, `SelectionRow`, `Field`, `StatusNotice`, `ConfirmationSheet`, `capture-theme.ts`, and `today-copy.ts`.

### 6. Reuse Phase 5 alert escalation for delayed stages

Delayed markdown tasks should remain regular active tasks so `refreshTaskAlertStates` can pick them up:

- approval delay: medium/high urgency, leadership audience when responsible label is leadership;
- application delay: high urgency, escalates to responsible plus leadership;
- shelf confirmation delay: high or now urgency because the shelf state is not proven.

The planner should explicitly test that alert refresh does not resolve or hide delayed markdown tasks. Any stage-specific stronger cadence should be encoded through `dueBucket`, `severity`, or a small domain policy extension, not through UI timers.

## Validation Architecture

Phase 6 needs focused tests at each boundary, then a full regression before verification.

| Layer | Focus | Command / evidence |
|---|---|---|
| Domain markdown policy | stage vocabulary, eligibility, next-stage derivation, presence gate, due/severity policy | `pnpm.cmd --filter @validade-zero/domain test -- markdown` |
| Contract validation | workflow record, stage commands, evidence/no-photo metadata, strict rejection of binary/object-key fields | `pnpm.cmd --filter @validade-zero/contracts test -- markdown` |
| Mobile repository behavior | memory + SQLite lifecycle transitions, transactional task creation, duplicate active workflow prevention, rejection reason, alert visibility | `pnpm.cmd --filter @validade-zero/mobile test -- markdown` |
| Mobile Hoje/detail UI | stage rows, lot-detail entry, early exception justification, approval/rejection, application evidence, final shelf confirmation | `pnpm.cmd --filter @validade-zero/mobile test -- markdown` |
| Alert regression | delayed markdown stages stay visible, escalate through Phase 5 state, and never resolve through alert acknowledgement | `pnpm.cmd --filter @validade-zero/mobile test -- alert` |
| Accessibility/copy | one-hand controls, direct PT-BR labels, non-color-only overdue/stage state, accessible action labels | `pnpm.cmd --filter @validade-zero/mobile test -- today-accessibility` |
| Native smoke | Hoje remains first screen; markdown task opens; no-photo reason path is reachable if fixture supports it | `pnpm.cmd test:e2e:mobile` when Maestro/runtime is available |
| Full regression | monorepo type/lint/test/security suite | `pnpm.cmd check` |

If native runtime is unavailable, execution summaries must record the exact blocker and rely on component/repository coverage without claiming native delivery.

## Security, Privacy, and Safety Notes

- Do not store real photos, image URIs, base64 payloads, object keys, private evidence, real products, or real store data.
- Evidence remains `photo_recorded_placeholder` or `no_photo_reason` metadata until Phase 8 storage/audit.
- Approval/rejection is local role copy only; do not implement formal RBAC in this phase.
- Rejection must require a reason and must not keep charging an intentionally rejected markdown.
- Alerts, reminders, leadership acknowledgement, and notification taps must never mark a markdown stage complete.
- A lot with stale or uncertain presence cannot start or advance markdown; physical confirmation must happen first.
- Do not infer sale, disappearance, or price application from stock/sales data or ERP integrations.
- Keep domain pure and put SQLite/React Native/Expo details behind mobile adapters.

## Common Pitfalls

- Closing `request_markdown` without creating a lifecycle record.
- Allowing "applied" to mean "shelf confirmed".
- Letting rejected markdown continue to create overdue tasks.
- Accepting a generic photo note instead of structured evidence metadata.
- Adding R2/object storage or real image capture before Phase 8.
- Creating a second hidden queue that does not appear in "Hoje".
- Letting lot detail bypass the presence gate.
- Treating leadership acknowledgement as approval, application, confirmation, or resolution.

## Planning Recommendation

Plan the phase as four sequential waves:

1. Domain workflow policy and runtime contracts for markdown records, stage commands, evidence, and task vocabulary.
2. Mobile repository lifecycle in memory and SQLite, including workflow table, stage transitions, task generation, duplicate prevention, and alert visibility.
3. Mobile "Hoje", lot-detail, and task panels for request, early exception, approval/rejection, application evidence, and shelf confirmation evidence.
4. Delayed-stage escalation hardening, accessibility/copy polish, native smoke documentation, and full regression.

This order creates the contract and state machine first, proves local persistence and task visibility second, then gives collaborators and leadership the mobile workflow, and finally hardens delayed/review behavior.
