# Phase 06: Markdown/Rebaixa Workflow - Pattern Map

**Mapped:** 2026-06-20
**Status:** Ready for planning

## Purpose

This map anchors Phase 6 execution to the current local-first "Hoje" task architecture. Markdown/rebaixa must become a blocked lifecycle for each lot without creating a hidden queue, storing real evidence, adding ERP integration, or bypassing physical presence confirmation.

## Existing Patterns to Reuse

| Need | Existing file | Pattern to reuse |
|---|---|---|
| Pure task and risk vocabulary | `packages/domain/src/tasks.ts` | `as const` arrays, exported union types, pure helpers, and no infrastructure imports. |
| Presence freshness | `packages/domain/src/presence.ts` | `classifyPhysicalConfirmationFreshness` and explicit missing/stale/fresh states for safety gates. |
| Alert escalation | `packages/domain/src/alerts.ts` | Cadence derived from `TodayTaskRecord` facts, audience selection, and notification copy that never resolves tasks. |
| Runtime task contracts | `packages/contracts/src/tasks.ts` | Strict Zod schemas, evidence metadata discriminated union, and parsed command boundaries. |
| Runtime capture contracts | `packages/contracts/src/capture.ts` | Operational location, lot identity, physical observation, and ASCII-safe fake fixture patterns. |
| Repository port | `apps/mobile/src/capture/repository.ts` | Narrow operations, parse helpers, deterministic dependencies, and shared helpers used by memory and SQLite adapters. |
| Memory adapter | `apps/mobile/src/capture/memory-repository.ts` | In-memory maps, deterministic clock/id injection, and behavior mirroring SQLite for component tests. |
| SQLite adapter | `apps/mobile/src/capture/sqlite-repository.ts` | Idempotent `CREATE TABLE IF NOT EXISTS`, indexes, parameterized writes, transactions for multi-step task changes, and row mapping through contracts. |
| Mobile shell routing | `apps/mobile/src/capture/CaptureApp.tsx` | Simple local screen-state routing for Today, task resolution, lot detail, and observation flows. |
| Hoje task screen | `apps/mobile/src/capture/TodayScreen.tsx` | Safety verdict first, overdue/current sections, task row anatomy, alert status, and escalation acknowledgement. |
| Task panel | `apps/mobile/src/capture/TaskResolutionPanel.tsx` | Explicit choices, inline blockers, reinforced confirmation, evidence/no-photo metadata, and typed repository submission. |
| Lot detail | `apps/mobile/src/capture/LotDetailScreen.tsx` | Presence-focused lot summary with observation route before unsafe actions. |
| Mobile primitives | `apps/mobile/src/capture/capture-ui.tsx` | `PrimaryAction`, `SecondaryAction`, `SelectionRow`, `Field`, `StatusNotice`, and 48dp touch targets. |
| Tokens | `apps/mobile/src/capture/capture-theme.ts` | Semantic colors, 6/8px radii, spacing tokens, warning/critical/accent treatments. |
| Operational copy | `apps/mobile/src/capture/today-copy.ts` | Centralized visible PT-BR copy, currently ASCII-normalized in source. |
| Component tests | `apps/mobile/src/capture/task-resolution.test.tsx`, `today-screen.test.tsx` | React Test Renderer mocks, fake fixtures, visible copy assertions, and repository command assertions. |
| Repository tests | `apps/mobile/src/capture/today-task-repository.test.ts`, `alert-state.test.ts` | Local lifecycle tests using fake products/lots, no real data, and source checks for unsafe storage. |
| Native smoke | `.maestro/smoke.yaml` | Short stable assertions around `Hoje`, safety verdict, refresh action, and registration paths. |

## Files Expected to Change

### Domain and contracts

- `packages/domain/src/markdown.ts` - pure markdown workflow stages, request reasons, presence gate, stage task derivation, and due/severity policy.
- `packages/domain/src/markdown.test.ts` - tests for rule-window request, early exception, stale/uncertain presence blocking, stage progression, and final terminal states.
- `packages/domain/src/tasks.ts` - extend required resolutions and task actions with approval/application/final-confirmation markdown stages.
- `packages/domain/src/tasks.test.ts` - compatibility tests for the new markdown stage actions.
- `packages/domain/src/alerts.ts` - privacy-safe action labels for new markdown stage resolutions.
- `packages/domain/src/alerts.test.ts` - alert label/cadence tests for delayed markdown stages.
- `packages/domain/src/index.ts` - export markdown vocabulary.
- `packages/contracts/src/markdown.ts` - strict workflow record, stage history, and stage command schemas.
- `packages/contracts/src/markdown.test.ts` - strict parsing and evidence-safety tests, including rejection of `uri`, `base64`, and `objectKey`.
- `packages/contracts/src/tasks.ts` - optional markdown workflow/stage metadata on Today tasks, using domain enums.
- `packages/contracts/src/tasks.test.ts` - task contract tests for markdown stage metadata and new actions.
- `packages/contracts/src/index.ts` - export markdown contracts.

### Mobile repository

- `apps/mobile/src/capture/repository.ts` - repository port operations for request, decision, application, shelf confirmation, active workflow lookup, lot entry state, and parse helpers.
- `apps/mobile/src/capture/memory-repository.ts` - local markdown workflow map, duplicate-active prevention, stage transition behavior, and task creation.
- `apps/mobile/src/capture/sqlite-repository.ts` - `markdown_workflows` table, indexes, strict JSON stage history, and transactional transitions.
- `apps/mobile/src/capture/markdown-workflow.test.ts` - lifecycle tests for memory behavior, SQLite source safety, duplicate prevention, rejection reason, evidence/no-photo, and task visibility.
- `apps/mobile/src/capture/alert-state.test.ts` - delayed markdown stage alert/escalation tests.

### Mobile UI

- `apps/mobile/src/capture/today-copy.ts` - approved Phase 6 labels: `Solicitar rebaixa`, `Aprovar rebaixa`, `Aplicar rebaixa`, `Confirmar etiqueta na area de venda`, delayed copy, evidence labels, and rejection copy.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - markdown-specific approval/rejection, application evidence, and final confirmation panels.
- `apps/mobile/src/capture/LotDetailScreen.tsx` - eligible request, early exception request, already-active workflow summary, and presence gate route.
- `apps/mobile/src/capture/CaptureApp.tsx` - route lot-detail markdown entry to request flow or observation flow.
- `apps/mobile/src/capture/TodayScreen.tsx` - stage labels and delayed stage row treatment without changing Hoje as the source of truth.
- `apps/mobile/src/capture/task-resolution.test.tsx` - component tests for approval, rejection reason, evidence/no-photo, final confirmation, and no-binary command payloads.
- `apps/mobile/src/capture/today-screen.test.tsx` - Hoje rows and overdue markdown stage copy.
- `apps/mobile/src/capture/today-accessibility.test.tsx` - non-color-only delayed stage state, accessible labels, and one-hand control labels.
- `apps/mobile/src/App.test.tsx` - smoke-level app routing around markdown tasks and lot detail entry.
- `.maestro/smoke.yaml` - stable native smoke labels only if deterministic without camera/storage.

### Documentation

- `docs/operations/markdown-workflow.md` - pilot limitations, no ERP/price automation, evidence metadata only, delayed stage escalation, and manual native smoke notes.

## Scope Fences

- Do not implement ERP price changes, sales/stock integration, or automatic price updates.
- Do not implement formal RBAC, permissions, shift-close dashboard, or full audit trail. Those remain Phase 8.
- Do not implement offline command queue, sync conflicts, or idempotent remote commands. Those remain Phase 7.
- Do not store real photos, image URIs, base64 strings, object keys, R2 references, private evidence, or real operational data.
- Do not let push delivery, alert acknowledgement, approval notification, or UI row rendering resolve a markdown stage.
- Do not let lot detail bypass stale/missing/not-found/probably-sold-out presence gates.
- Do not allow `applied` to mean `shelf_confirmed`.
- Do not keep rejected markdown workflows charging follow-up tasks.

## Implementation Notes for Executor

- Keep domain code pure. Markdown policy may consume domain presence/task types, but must not import Zod, React Native, SQLite, Expo, Hono, or provider adapters.
- Treat "Hoje" task records as the active work surface. A workflow record holds history; a Today task holds the current stage to execute.
- Store one active task per workflow stage. Approving closes approval and opens application; applying closes application and opens shelf confirmation; final confirmation closes the workflow.
- Use `ownerLabel: "Lideranca local"` for approval and `ownerLabel: "Equipe do turno"` for application/final confirmation until formal roles arrive in Phase 8.
- Use `photo_recorded_placeholder` or `no_photo_reason` for evidence. Any real binary, URI, object key, or storage handle is out of scope.
- Keep visible copy in `today-copy.ts`, direct and ASCII-normalized to match current mobile sources.
- Use component/repository tests as the primary verification. Native smoke can document a runtime blocker honestly if Maestro/device support is unavailable.
