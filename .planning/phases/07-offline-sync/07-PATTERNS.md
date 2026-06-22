---
phase: 07
slug: offline-sync
status: complete
created: 2026-06-22
---

# Phase 07 - Pattern Map

## PATTERN MAPPING COMPLETE

## Files To Touch

| Target | Role | Closest Analog | Pattern To Preserve |
|--------|------|----------------|---------------------|
| `packages/domain/src/sync.ts` | Pure sync/offline policy | `packages/domain/src/alerts.ts`, `packages/domain/src/markdown.ts` | Export const vocabularies, pure helpers, no Zod/UI/SQLite imports. |
| `packages/contracts/src/sync.ts` | Runtime schemas | `packages/contracts/src/tasks.ts`, `packages/contracts/src/markdown.ts` | Zod `.strict()` schemas, inferred types, reuse existing command schemas. |
| `apps/mobile/src/capture/repository.ts` | Repository port | Existing markdown/alert methods in the same file | Add typed methods plus parse helpers, keep adapters behind one interface. |
| `apps/mobile/src/capture/memory-repository.ts` | Test adapter | Markdown workflow implementation | Mutate local Maps deterministically and parse every stored record through contracts. |
| `apps/mobile/src/capture/sqlite-repository.ts` | Durable adapter | `markdown_workflows`, `task_alert_states`, `resolveTaskInTransaction` | Create tables/indexes in init, map rows with strict schemas, wrap multi-row state changes in `withTransactionAsync`. |
| `apps/mobile/src/capture/sqlite-migrations.ts` | Idempotent migrations | `ensureTodayTaskMarkdownColumns` | Add column/table migration helpers using `PRAGMA table_info` where ALTER is needed. |
| `apps/mobile/src/capture/sync-engine.ts` | Sync runner | `apps/api/src/index.ts` alert service seam, repository ports | Dependency-injected network/transport/clock; fake transport in tests. |
| `apps/mobile/src/capture/network-state.ts` | NetInfo adapter | `apps/mobile/src/capture/alert-channel.ts` | Native dependency wrapped behind a small interface and fakeable in tests. |
| `apps/api/src/index.ts` | API sync seam | Phase 5 scheduled alert seam | Hono route parses contracts, uses injectable service/repository, no real data/secrets. |
| `apps/mobile/src/capture/today-copy.ts` | Copy | Current Hoje/push/markdown copy | ASCII PT-BR operational labels, no developer terms in UI. |
| `apps/mobile/src/capture/TodayScreen.tsx` | Offline status and queue summary | Alert channel surface and task rows | Keep safety header first; add sync band below it; render text labels for every state. |
| `apps/mobile/src/capture/TaskResolutionPanel.tsx` | Offline save feedback | Existing recheck/markdown evidence flow | Keep primary action as physical outcome; sync status is feedback, not CTA replacement. |

## Existing Code Excerpts

### SQLite transaction pattern

`sqlite-repository.ts` resolves task state inside a transaction:

```ts
await db.withTransactionAsync(async () => {
  resolved = await resolveTaskInTransaction(db, command, { allowSalesAreaRecheck: true });
});
```

Phase 7 should use the same style for:

- Save offline command + visible pending projection.
- Mark commands syncing + increment attempts.
- Apply ack/conflict + update task sync metadata.

### Schema mapping pattern

Stored rows are mapped through Zod:

```ts
function mapTodayTask(row: TodayTaskRow): TodayTaskRecord {
  return parseTodayTaskRecord({
    id: row.id,
    activeKey: row.active_key,
    // ...
  });
}
```

Phase 7 should add `mapSyncCommand`, `mapSyncConflict`, and `mapOfflineCacheStatus` with the same strict boundary.

### UI hierarchy pattern

`TodayScreen.tsx` already orders:

1. `ScreenHeader`
2. safety header
3. status notices
4. alert surface
5. task list
6. future attention

Phase 7 should insert:

1. offline/sync status band directly after the safety header
2. conflict summary before normal pending queue
3. compact queue summary before task sections or just after status band, while preserving safety as first content

### Copy pattern

`today-copy.ts` centralizes visible labels. Add sync copy there:

- `Pronto para operar sem internet`
- `Sem internet agora. Usando tarefas salvas neste aparelho.`
- `Acao salva no aparelho. Vamos sincronizar quando a conexao voltar.`
- `Pendente de sincronizacao`
- `Sincronizando pendencias`
- `Sincronizado as {horario}.`
- `Nao foi possivel sincronizar`
- `Conflito de sincronizacao`
- `Tentaremos novamente sem duplicar a acao.`

## Testing Patterns

- Component tests mock React Native primitives via `vi.mock("react-native", ...)` and inspect JSON strings plus accessibility labels.
- Repository tests use deterministic fake dates and generated IDs.
- Contract tests assert strict rejection of extra fields.
- Source-safety assertions can use `readFileSync` and `expect(source).not.toContain(...)`, as done in markdown/evidence tests.

## Landmines

- Do not expose command IDs as primary UI copy.
- Do not let `resolveTodayTask` silently become offline behavior; add an explicit offline command path so online/local resolution semantics stay understandable.
- Do not remove critical tasks from visible Hoje just because a command was saved locally.
- Do not add raw photo URI/base64/object storage fields.
- Do not rely on NetInfo as proof that a sync succeeded; only transport ack changes command state to synced.
- Do not add a separate sync dashboard or desktop monitor.

