---
status: resolved
trigger: "quando finalizou voltou para a tela hoje com esse erro e na hora de solicitar a rebaixa esse erro ai"
created: 2026-06-21T15:56:33-03:00
updated: 2026-06-21T16:11:22-03:00
---

# Debug Session: Markdown SQLite Migration

## Symptoms

- Expected: saving an eligible lot refreshes Hoje and requesting markdown creates the approval task.
- Actual: Hoje shows refresh failure and lot detail shows markdown advancement failure.
- Visible errors: `Nao foi possivel atualizar agora` and `Nao foi possivel avancar a rebaixa`.
- Reproduction: use an existing development-build database, create an eligible lot, return to Hoje, then request markdown from lot detail.

## Current Focus

hypothesis: Confirmed and fixed. Existing `today_tasks` tables predate Phase 6 and lack `markdown_workflow_id` and `markdown_stage`; the Today task path also resolved `request_markdown` without creating a workflow.
test: Reloaded the app, retested the existing UAT lot from its detail screen, and verified Hoje shows `Aprovar rebaixa`.
expecting: No refresh error and no markdown advancement error; eligible lots can reach the approval task.
next_action: Continue UAT from Test 3.
reasoning_checkpoint: Legacy SQLite migration now adds the missing columns idempotently, and request tasks call `requestMarkdown` with `sourceTaskId` instead of generic task resolution.

## Evidence

- timestamp: 2026-06-21T15:57:31-03:00
  observation: Live database extracted from `files/SQLite/validade-zero-capture.db` with WAL/SHM.
  result: `PRAGMA table_info(today_tasks)` has no `markdown_workflow_id` or `markdown_stage`.
- timestamp: 2026-06-21T15:58:00-03:00
  observation: `markdown_workflows` exists with the complete Phase 6 schema.
  result: Failure is an additive migration gap on an existing table, not missing initialization or network connectivity.
- timestamp: 2026-06-21T16:08:00-03:00
  observation: Regression tests covered both the legacy `today_tasks` migration and the Today-panel `request_markdown` submit path.
  result: `pnpm.cmd --filter @validade-zero/mobile test -- task-resolution markdown-workflow` passed.
- timestamp: 2026-06-21T16:11:00-03:00
  observation: Live emulator retest from `Queijo UAT` detail returned to Hoje with `Aprovar rebaixa`.
  result: UAT Test 2 is unblocked.

## Eliminated

- hypothesis: Metro/network failure causes Hoje refresh error.
  reason: Lot detail and local task refresh fail after a successful local save; live SQLite schema is incompatible with current upsert SQL.
- hypothesis: Physical presence blocks the request.
  reason: UI derives `eligible_rule_window` and displays `Janela de rebaixa disponivel para este lote`.

## Resolution

root_cause: Existing installations are not migrated when `CREATE TABLE IF NOT EXISTS today_tasks` runs against the pre-Phase-6 table.
fix: "Added an idempotent SQLite migration for missing markdown task columns and routed Today request-markdown submissions through repository.requestMarkdown."
verification: "`pnpm.cmd --filter @validade-zero/mobile test -- task-resolution markdown-workflow`; live emulator shows `Aprovar rebaixa` after requesting markdown."
files_changed:
  - apps/mobile/src/capture/sqlite-migrations.ts
  - apps/mobile/src/capture/sqlite-repository.ts
  - apps/mobile/src/capture/TaskResolutionPanel.tsx
  - apps/mobile/src/capture/markdown-workflow.test.ts
  - apps/mobile/src/capture/task-resolution.test.tsx
