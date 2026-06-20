# Phase 04: Today Task Workflow - Pattern Map

**Mapped:** 2026-06-19
**Status:** Ready for planning

## Purpose

This map anchors Phase 4 execution to the current codebase so the Hoje workflow extends Phase 2/3 instead of inventing a parallel task app.

## Existing Patterns to Reuse

| Need | Existing file | Pattern to reuse |
|---|---|---|
| Pure risk calculation | `packages/domain/src/risk.ts` | Keep risk and severity decisions in pure functions that accept typed inputs and return structured reasons. |
| Domain vocabulary exports | `packages/domain/src/types.ts` | Add constants/types with `as const` arrays and exported union types. |
| Runtime contracts | `packages/contracts/src/capture.ts` | Use strict Zod schemas, discriminated unions, small reusable text/id/date validators, and inferred exported types. |
| Repository port | `apps/mobile/src/capture/repository.ts` | Keep app code behind explicit repository interfaces and parsing helpers. |
| Memory adapter | `apps/mobile/src/capture/memory-repository.ts` | Use deterministic `clock` and `createId`, Maps, and identical port behavior for component tests. |
| SQLite adapter | `apps/mobile/src/capture/sqlite-repository.ts` | Idempotent migrations, parameterized `runAsync`, transaction for multi-step writes, JSON only for existing profile payloads. |
| Mobile shell routing | `apps/mobile/src/capture/CaptureApp.tsx` | Simple local state navigation, no router dependency, repository injected from `App.tsx`. |
| Native primitives | `apps/mobile/src/capture/capture-ui.tsx` | System typography, 48dp targets, semantic colors, `PrimaryAction`, `SecondaryAction`, `SelectionRow`, `StatusNotice`, and `Field`. |
| Operational copy | `apps/mobile/src/capture/capture-copy.ts` | Portuguese-BR human copy centralized outside domain enums. |
| Recent list/detail | `RecentLotList.tsx`, `LotDetailScreen.tsx` | Full-width touch rows, compact detail, latest snapshot as the current operational fact. |
| Physical action flow | `ObservationComposer.tsx`, `ConfirmationSheet.tsx` | Action-first inputs and reinforced confirmation for consequential outcomes. |
| Test style | `apps/mobile/src/App.test.tsx`, capture tests | React Test Renderer with mocks for React Native and native Expo packages; domain/repository unit tests with fictitious data. |

## Files Expected to Change

### Domain and contracts

- `packages/domain/src/tasks.ts` - new pure task derivation, priority, due bucket, and compatibility rules.
- `packages/domain/src/tasks.test.ts` - tests for actionable states, radar exclusion, sales-area priority, due buckets, and resolution compatibility.
- `packages/domain/src/index.ts` - export task vocabulary.
- `packages/contracts/src/tasks.ts` - Zod schemas for task records, resolution commands, and evidence prompt metadata.
- `packages/contracts/src/index.ts` - export task contracts.
- `packages/contracts/src/tasks.test.ts` - runtime validation coverage.
- `packages/contracts/package.json` - replace the placeholder test script with a real Vitest contracts-project command.
- `vitest.config.ts` - add a `contracts` project for `packages/contracts/src/**/*.test.ts`.

### Mobile repository and tests

- `apps/mobile/src/capture/repository.ts` - extend or compose repository ports with Hoje task operations.
- `apps/mobile/src/capture/memory-repository.ts` - deterministic task generation/resolution behavior for component tests.
- `apps/mobile/src/capture/sqlite-repository.ts` - local task tables, active task upsert, resolution/recheck persistence, future radar reads.
- `apps/mobile/src/capture/today-task-repository.test.ts` - refresh, priority, duplicate prevention, recheck creation, radar future attention.

### Mobile UI

- `apps/mobile/src/capture/TodayScreen.tsx` - safety header, refresh, sections, task rows, empty state.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - compatible actions, inline blockers, confirmations, recheck/evidence prompt.
- `apps/mobile/src/capture/today-copy.ts` or extension to `capture-copy.ts` - Hoje labels and errors from `04-UI-SPEC.md`.
- `apps/mobile/src/capture/today-screen.test.tsx` - header/sections/navigation.
- `apps/mobile/src/capture/task-resolution.test.tsx` - compatible/incompatible outcomes and recheck behavior.
- `apps/mobile/src/capture/today-accessibility.test.tsx` - labels, target-size style assertions, no color-only risk, long copy wrapping.
- `apps/mobile/src/capture/CaptureApp.tsx` - start at Hoje, preserve registration/recent/detail/observation paths.
- `.maestro/smoke.yaml` - include a stable Hoje assertion if native runtime remains available.

## Scope Fences

- Do not add push notifications, repeat reminders, escalation, or cron. Those are Phase 5.
- Do not implement full markdown approval/applied label workflow. Phase 4 may close current task with "rebaixa solicitada"; full workflow is Phase 6.
- Do not add outbox, sync, server conflict handling, or remote cache. Those are Phase 7.
- Do not store binary photos, R2 object keys, access policies, audit trails, roles, or shift close. Those are Phase 8.
- Do not replace existing capture flows or recent lot detail. Hoje routes into them.

## Implementation Notes for Executor

- Keep task generation idempotent by using a stable active key such as `{lotId}:{riskState}:{requiredResolution}:{recheckParentId?}`.
- Treat task records as local operational state, not authoritative remote audit.
- Prefer small pure helpers and focused tests over a large "task service" class.
- Every visible task row should contain action, product, lot, location, due/severity, owner, and reason.
- Every test fixture must remain clearly fictitious.
