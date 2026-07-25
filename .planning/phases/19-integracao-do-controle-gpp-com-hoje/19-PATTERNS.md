# Phase 19: Integração do Controle GPP com Hoje — Pattern Map

**Mapped:** 2026-07-25  
**Files classified:** 33  
**Source analogs read:** 26  
**Scope:** GPP-09, additive integration only

## Execution Gate And Truth Boundary

This pattern map is ready for planning, but **Phase 19 source execution is still blocked**.

Before `19-01` changes any source file, require a human checkpoint proving Phase 18 Human UAT Test 1 on an approved post-170 Android build:

```text
checkpoint:human-verify
Expected evidence:
- central rejection is visibly "Conflito de GPP";
- blank discard reason keeps the destructive action disabled;
- one justified discard removes the active local conflict;
- no central-success claim is shown;
- the physical-removal receipt remains auditable.

Current evidence:
18-HUMAN-UAT.md status = partial
Test 1 result = blocked
blocked_by = physical-device

If the evidence is not recorded as passed: stop.
Do not execute Phase 19 source changes.
```

Phase 19 must also preserve this state boundary in every layer:

```text
durable physical truth
  = what quantity actually left the sales area
  = survives missing code, offline transport, central rejection, local discard, and restart

central GPP delivery truth
  = whether a valid linked GPP command was sent, rejected, conflicted, confirmed, or replayed
  = never resolves or erases physical truth by itself
```

Do not change build identifiers, generate an APK, push, or deploy as part of this phase. Do not claim the existing build 171 artifact closes the native interaction gate; it proves packaging/signature metadata only.

## File Classification

Exact new filenames remain discretionary, but these responsibilities are required by `19-CONTEXT.md`, `19-RESEARCH.md`, `19-UI-SPEC.md`, and `19-VALIDATION.md`.

| New/Modified File | Change | Role | Data Flow | Closest Existing Analog | Match |
|---|---|---|---|---|---|
| `packages/domain/src/linked-gpp-removal.ts` | new | domain utility/model | transform | `packages/domain/src/tasks.ts` | role/data-flow |
| `packages/domain/src/index.ts` | modify | barrel/config | transform | existing exports in same file | exact |
| `packages/contracts/src/capture.ts` | modify | contract/model | validation/transform | existing lot and observation schemas in same file | exact |
| `packages/contracts/src/tasks.ts` | modify | contract/model | validation/transform | `TodayTaskRecordSchema` and terminal request schemas in same file | exact |
| `packages/contracts/src/gpp.ts` | modify | contract/model | validation/request-response | existing GPP strict schemas and mutation union in same file | exact |
| `packages/database/drizzle/0019_phase_19_linked_gpp_today.sql` | new | migration | CRUD | `packages/database/drizzle/0018_phase_17_gpp_control.sql` | role/data-flow |
| `packages/database/src/gpp-repository.ts` | modify | repository/service | CRUD/request-response | existing GPP create, receipt, audit, store-scope methods in same file | exact |
| `apps/api/src/gpp.ts` | modify | route/controller | request-response | existing `POST /gpp/avarias` route in same file | exact |
| `apps/mobile/src/capture/linked-gpp-state.ts` | new | model/reducer/utility | event-driven/transform | `gpp-flow-state.ts` + `gpp-offline-queue.ts` | composite |
| `apps/mobile/src/capture/linked-gpp-repository.ts` | new | repository helper | CRUD/event-driven | `gpp-offline-queue.ts` + `repository.ts` | composite |
| `apps/mobile/src/capture/repository.ts` | modify | repository interface | CRUD | existing task and GPP pending methods in same file | exact |
| `apps/mobile/src/capture/memory-repository.ts` | modify | in-memory repository | CRUD/event-driven | existing `resolveTodayTask` and GPP queue implementation | exact |
| `apps/mobile/src/capture/sqlite-repository.ts` | modify | SQLite repository | CRUD/transactional | existing transactional task resolution and GPP outbox | exact |
| `apps/mobile/src/capture/sqlite-migrations.ts` | modify | migration utility | CRUD/schema transform | existing idempotent `ensureColumns` helpers | exact |
| `apps/mobile/src/capture/gpp-client.ts` | modify | transport client | request-response | existing typed create/classification path in same file | exact |
| `apps/mobile/src/capture/gpp-offline-queue.ts` | modify | outbox/state machine | event-driven/CRUD | existing pending/retry/conflict lifecycle in same file | exact |
| `apps/mobile/src/capture/TaskResolutionPanel.tsx` | modify | route-owned component | event-driven/request-response | existing progressive terminal resolution in same file | exact |
| `apps/mobile/src/capture/TodayScreen.tsx` | modify | screen/component | request-response/event-driven | existing task sections and repository refresh in same file | exact |
| `apps/mobile/src/capture/CaptureApp.tsx` | modify | provider/router/orchestrator | event-driven/request-response | existing Today/GPP dependency injection and retry orchestration | exact |
| `packages/domain/src/linked-gpp-removal.test.ts` | new | domain test | transform | `packages/domain/src/tasks.test.ts` | role/data-flow |
| `packages/contracts/src/capture.test.ts` | modify | contract test | validation | existing strict capture schema tests | exact |
| `packages/contracts/src/tasks.test.ts` | modify | contract test | validation | existing terminal/task tests | exact |
| `packages/contracts/src/gpp.test.ts` | modify | contract test | validation | existing strict GPP outcome tests | exact |
| `packages/database/src/repositories.test.ts` | modify | repository integration test | CRUD | existing GPP repository tests | exact |
| `apps/api/src/gpp.test.ts` | modify | API integration/security test | request-response | existing GPP route tests | exact |
| `apps/mobile/src/capture/linked-gpp-state.test.ts` | new | state-machine test | event-driven/transform | `gpp-offline-queue.test.ts` | role/data-flow |
| `apps/mobile/src/capture/capture-repository.test.ts` | modify | repository parity test | CRUD/transactional | existing memory/SQLite parity suite | exact |
| `apps/mobile/src/capture/sqlite-migrations.test.ts` | modify | migration test | CRUD/schema | existing forward-migration tests | exact |
| `apps/mobile/src/capture/gpp-offline-queue.test.ts` | modify | outbox test | event-driven/CRUD | existing retry/conflict/discard tests | exact |
| `apps/mobile/src/capture/task-resolution.test.tsx` | modify | component test | event-driven | existing terminal renderer tests | exact |
| `apps/mobile/src/capture/mobile-capture.accessibility.test.tsx` | modify | accessibility test | event-driven | existing mobile accessibility assertions | exact |
| `apps/mobile/src/capture/mobile-gpp-navigation.test.tsx` | modify | route integration test | event-driven/request-response | existing GPP route/discard regression | exact |
| `apps/mobile/src/capture/today-screen.test.tsx` | modify | screen regression test | event-driven/request-response | existing Today section/count tests | exact |

## Pattern Assignments

### 1. Pure Partial-Removal Rules

**Targets**

- `packages/domain/src/linked-gpp-removal.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/linked-gpp-removal.test.ts`

**Primary analog:** `packages/domain/src/tasks.ts`

The domain package uses dependency-free TypeScript, readonly literal collections, discriminated return types, and explicit rejected variants. Copy the shape, not the task-resolution semantics.

`packages/domain/src/tasks.ts:369-384`:

```ts
export function isResolutionCompatible(
  requiredResolution: RequiredResolution,
  action: TaskResolutionAction,
): boolean {
  return compatibleActionsFor(requiredResolution).includes(action);
}

export function resolveCentralTerminalOutcome(
  input: CentralTerminalResolutionInput,
): CentralTerminalResolutionPolicy {
  if (!isResolutionCompatible(input.requiredResolution, input.action)) {
    return {
      status: "rejected",
      reason: "incompatible_action",
      keepsActiveRiskVisible: true,
    };
  }
```

Apply the same pattern to `calculateLinkedRemoval`:

- validate finite `removed > 0`;
- require identical pending/removed unit;
- reject `removed > pending`;
- never silently clamp;
- return `remaining` and `physicalState` as a discriminated result;
- only a structured conflict with `physicalImpact: "sales_area_presence_uncertain"` may produce `review_required`.

Do not import React, Zod, database clients, or mobile repositories into this file.

`packages/domain/src/index.ts:18-29` shows the export pattern:

```ts
export * from "./presence";
export * from "./profiles";
export * from "./risk";
export * from "./tasks";
export * from "./product-policy";
export * from "./types";
```

Add one sibling export for `./linked-gpp-removal`.

**Test analog:** `packages/domain/src/tasks.test.ts:1-26`

```ts
import { describe, expect, it } from "vitest";
import {
  classifyTodayRiskAttention,
  resolveCentralTerminalOutcome,
  type TodayTaskCandidateInput,
} from "./tasks";

const observedAt = "2030-01-10T09:00:00.000Z";
const salesArea = { kind: "area_de_venda" } as const;
```

Use fixed fictitious timestamps and table-driven cases for full removal, partial remainder, unit mismatch, zero/negative/NaN, above-pending rejection, and both structured physical-impact variants.

### 2. Runtime Contracts And Additive Compatibility

**Targets**

- `packages/contracts/src/capture.ts`
- `packages/contracts/src/tasks.ts`
- `packages/contracts/src/gpp.ts`
- their existing tests

**Quantity/unit analog:** `packages/contracts/src/gpp.ts:99-104`

```ts
export const GppQuantitySchema = z
  .object({
    value: QuantityValueSchema,
    unit: GppQuantityUnitSchema,
  })
  .strict();
```

Use this canonical quantity instead of inventing a mobile-only `{ quantity, unit }` pair. `packages/contracts/src/capture.ts:125-130` currently exposes the gap:

```ts
const CaptureLotBaseSchema = z.object({
  productId: IdentifierSchema,
  lotIdentity: LotIdentitySchema,
  approximateQuantity: z.number().nonnegative(),
  currentLocation: OperationalLocationSchema,
});
```

Add truthful unit provenance. Legacy records with an unknown unit must enter an explicit recovery state; never default an unknown legacy physical quantity to `"un"`.

**Task projection analog:** `packages/contracts/src/tasks.ts:129-150`

```ts
export const TodayTaskRecordSchema = z
  .object({
    id: IdentifierSchema,
    activeKey: IdentifierSchema,
    lotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    riskState: z.enum(TODAY_ACTIONABLE_RISK_STATES),
    severity: TodayTaskSeveritySchema,
    dueBucket: TodayDueBucketSchema,
    requiredResolution: RequiredResolutionSchema,
    section: TodayTaskSectionSchema.exclude(["future_attention"]),
    ownerLabel: RequiredTextSchema,
    status: TodayTaskStatusSchema,
    sourceRisk: SourceRiskSchema,
    priority: z.number().int().nonnegative(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    resolvedAt: IsoDateTimeSchema.optional(),
  })
```

Extend this projection with typed product code, pending quantity/unit, and linked follow-up state. Do not overload `productDisplayName`, `lotIdentity.value`, or copy strings to carry structured data.

`packages/contracts/src/tasks.ts:252-276` shows cross-field refinement:

```ts
export const CentralTerminalResolutionRequestSchema = z
  .object({
    task: TodayTaskRecordSchema.refine(
      (task) => task.status === "active",
      "Central terminal resolution requires active task.",
    ),
    command: TaskResolutionCommandSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.task.id !== value.command.taskId) {
      context.addIssue({
        code: "custom",
        path: ["command", "taskId"],
        message: "Terminal resolution command must target active task.",
      });
    }
  });
```

Use `.strict()` plus `.superRefine()` for provenance consistency: source task, source lot, unit, removed quantity, and idempotency provenance must agree.

**GPP response analog:** `packages/contracts/src/gpp.ts:430-454`

```ts
export const GppMutationResponseSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("central_confirmed"),
    requestId: RequiredIdentifierSchema,
    confirmedAt: IsoDateTimeSchema,
    snapshot: GppQueueSnapshotSchema.optional(),
  }).strict(),
  z.object({
    state: z.literal("central_failed"),
    requestId: RequiredIdentifierSchema,
    failedAt: IsoDateTimeSchema,
    retryable: z.boolean(),
    message: RequiredTextSchema,
  }).strict(),
  z.object({
    state: z.literal("replayed"),
    requestId: RequiredIdentifierSchema,
    replayedAt: IsoDateTimeSchema,
    snapshot: GppQueueSnapshotSchema.optional(),
  }).strict(),
]);
```

Add linked provenance and structured conflict impact additively. Existing Phase 18 `GppAvariaCreateRequestSchema` payloads must continue to parse. Prefer an optional strict `source` variant or a dedicated additive linked schema/endpoint over making old required fields incompatible.

`packages/contracts/src/gpp.test.ts:64-84` is the strictness test pattern:

```ts
it("accepts strict avaria entry required product code central fields", () => {
  const parsed = GppAvariaEntrySchema.parse(avariaEntry);
  expect(parsed.product.code).toBe("162");
  expect(parsed.centralState).toBe("central_confirmed");
});

it("rejects unknown fields avarias without product code", () => {
  expect(GppAvariaEntrySchema.safeParse({ ...avariaEntry, localOnly: true }).success).toBe(false);
});
```

Add explicit backward-compatibility assertions for old Phase 18 payloads and negative assertions for missing source task/lot on the linked variant.

### 3. Central Persistence, Idempotency, Audit, And Auth Scope

**Targets**

- `packages/database/drizzle/0019_phase_19_linked_gpp_today.sql`
- `packages/database/src/gpp-repository.ts`
- `apps/api/src/gpp.ts`
- `packages/database/src/repositories.test.ts`
- `apps/api/src/gpp.test.ts`

**Migration analog:** `packages/database/drizzle/0018_phase_17_gpp_control.sql`

The existing migration uses:

- forward-only `CREATE TABLE IF NOT EXISTS`;
- explicit `CHECK` constraints;
- unique idempotency indexes;
- store-first lookup indexes;
- comments that document business boundaries.

`0018_phase_17_gpp_control.sql:91-100`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS gpp_avaria_entries_idempotency_key_uidx
  ON gpp_avaria_entries (idempotency_key);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_status_idx
  ON gpp_avaria_entries (store_id, status);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_product_code_idx
  ON gpp_avaria_entries (store_id, product_code);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_updated_idx
  ON gpp_avaria_entries (store_id, updated_at DESC);
```

`0018_phase_17_gpp_control.sql:182-198`:

```sql
CREATE TABLE IF NOT EXISTS gpp_mutation_receipts (
  idempotency_key text PRIMARY KEY,
  store_id text NOT NULL,
  operation text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT gpp_mutation_receipts_response_check CHECK (jsonb_typeof(response) = 'object')
);
```

The Phase 19 migration must make source task/lot provenance queryable central columns, not hide it only in client JSON. Index store plus source task/lot. Different lots with the same product code must remain distinct.

**Repository analog:** `packages/database/src/gpp-repository.ts:285-321`

```ts
createAvaria(input) {
  const existingReplay = replay<GppAvariaEntry>(input.request.idempotencyKey);
  if (existingReplay !== undefined) return Promise.resolve(existingReplay);

  const entry = GppAvariaEntrySchema.parse({
    avariaId: input.requestId,
    store: input.store,
    sector: input.request.sector,
    product: input.request.product,
    quantity: input.request.quantity,
    finality: input.request.finality,
    destination: input.request.destination,
    actor: input.actor,
  });

  entries.set(entry.avariaId, entry);
  const result = mutationResult({
    requestId: input.requestId,
    data: entry,
    action: "gpp.avaria.created",
    idempotencyKey: input.request.idempotencyKey,
    previous: null,
    next: entryAuditState(entry),
  });
  return Promise.resolve(persist(input.request.idempotencyKey, result));
}
```

Follow the same replay-before-side-effect order. The repository input receives authenticated `store` and `actor` separately from the parsed client request; provenance lookup must reject cross-store source task/lot references.

**Route/auth analog:** `apps/api/src/gpp.ts:291-312`

```ts
api.post("/gpp/avarias", async (context) => {
  if (!deps.enabled) return gppDisabled(context);
  const rawPayload = await parseJsonBody(context);
  const parsed = GppAvariaCreateRequestSchema.safeParse(rawPayload);
  if (!parsed.success) return context.json({ error: "invalid_gpp_avaria_request" }, 400);

  const scope = await authorizeGpp(
    context,
    deps,
    ["gpp.avaria.create"],
    parsed.data.storeId,
  );
  if (!isAuthorized(scope)) {
    return context.json(AuthorizationContract.denial.parse(scope.body), 403);
  }

  return runGppMutation(context, service, {
    actorContext: scope.actorContext,
    requestId: createRequestId("gpp-avaria", parsed.data.idempotencyKey),
    mutate: () =>
      deps.repository.createAvaria({
        requestId: createRequestId("gpp-avaria", parsed.data.idempotencyKey),
        store: gppStoreScope(scope.actorContext),
        actor: actorSnapshot(scope.actorContext),
        request: parsed.data,
      }),
  });
});
```

`apps/api/src/gpp.ts:643-672` confirms the auth pattern: verify identity, load memberships, authorize capability against target store, and return the server-derived actor context. Never trust actor/store display text from the mobile payload as central truth.

`apps/api/src/gpp.ts:582-612` is the error boundary:

```ts
try {
  const output = await service.runMutation(input);
  return context.json({
    response: output.result.response,
    replayed: output.result.replayed,
    data: output.result.data,
    audit: output.result.audit,
  });
} catch (error) {
  if (isGppBusinessRejection(error)) {
    return context.json(
      { error: "gpp_mutation_rejected", message: safeErrorMessage(error) },
      409,
    );
  }
  return context.json({ error: "central_unavailable" }, 503);
}
```

For Phase 19, return typed conflict impact from domain/repository logic. Do not infer physical impact by parsing Portuguese messages.

### 4. Durable Mobile Aggregate And Repository Parity

**Targets**

- `apps/mobile/src/capture/linked-gpp-state.ts`
- `apps/mobile/src/capture/linked-gpp-repository.ts`
- `apps/mobile/src/capture/repository.ts`
- `apps/mobile/src/capture/memory-repository.ts`
- `apps/mobile/src/capture/sqlite-repository.ts`
- `apps/mobile/src/capture/sqlite-migrations.ts`
- repository/state/migration tests

There is **no exact existing analog** for one record that joins a physical receipt to independent GPP delivery state. Build it from three patterns:

1. strict/discriminated state from `gpp-offline-queue.ts`;
2. memory/SQLite parity from `CaptureRepository`;
3. SQLite transaction ownership from task resolution.

**State analog:** `apps/mobile/src/capture/gpp-offline-queue.ts:15-30`

```ts
export interface GppPendingRecord {
  localId: string;
  kind: GppPendingKind;
  payload: GppPendingPayload;
  idempotencyKey: string;
  state: GppPendingState;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptedAt?: string;
  confirmedAt?: string;
  centralRequestId?: string;
  conflictReason?: string;
  discardJustification?: string;
  discardedAt?: string;
}
```

Improve this for the linked aggregate by using discriminated variants instead of optional-field combinations. Keep `physicalState` and `deliveryState` separate. `awaiting_code` is a durable linked receipt state, not a `GppPendingRecord`.

**Repository interface analog:** `apps/mobile/src/capture/repository.ts:552-567`

```ts
saveOfflineAction(input: OfflineActionCommand): Promise<SyncCommandRecord>;
resolveSyncConflict(input: ResolveSyncConflictInput): Promise<SyncConflictRecord>;
saveGppPending(input: SaveGppPendingInput): Promise<GppPendingRecord>;
listGppPending(): Promise<readonly GppPendingRecord[]>;
loadGppPending(localId: string): Promise<GppPendingRecord | null>;
markGppPendingAttempt(input: MarkGppPendingAttemptInput): Promise<GppPendingRecord>;
markGppPendingConfirmed(input: MarkGppPendingConfirmedInput): Promise<GppPendingRecord>;
markGppPendingConflict(input: MarkGppPendingConflictInput): Promise<GppPendingRecord>;
discardGppPending(input: DiscardGppPendingInput): Promise<GppPendingRecord>;
```

Add a focused repository command that atomically:

- records the immutable physical-removal receipt;
- records removed and remaining quantity/unit;
- updates/reprojects the Today task for full or partial removal;
- creates a linked follow-up state even when product code/unit is incomplete;
- retains actor, source task/active key, source lot, and one idempotency key.

Do not make the UI call `resolveTodayTask` first and save the linked record second.

**SQLite transaction analog:** `apps/mobile/src/capture/sqlite-repository.ts:1878-1892`

```ts
async function resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord> {
  await initialize();
  const command = parseTaskResolutionCommand(input);
  const db = await getDatabase();
  let resolved: TodayTaskRecord | undefined;

  await db.withTransactionAsync(async () => {
    resolved = await resolveTaskInTransaction(db, command, {
      allowSalesAreaRecheck: true,
    });
  });

  if (resolved === undefined) {
    throw new Error("Today task resolution did not complete.");
  }
  return resolved;
}
```

Put physical receipt persistence and full/partial Today update inside one `withTransactionAsync` callback. Central send happens only after this transaction commits.

**Memory analog:** `apps/mobile/src/capture/memory-repository.ts:1233-1272`

```ts
function resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord> {
  return Promise.resolve().then(() => {
    const command = parseTaskResolutionCommand(input);
    const existing = todayTasks.get(command.taskId);
    if (existing === undefined) {
      throw new Error(`Cannot resolve an unknown Today task: ${command.taskId}`);
    }

    const resolved = parseTodayTaskRecord({
      ...existing,
      status: "resolved",
      updatedAt: command.occurredAt,
      resolvedAt: command.occurredAt,
    });
    todayTasks.set(resolved.id, resolved);
    return resolved;
  });
}
```

Implement the same assertions and outputs in memory and SQLite. For partial removal, do not copy the unconditional whole-task `status: "resolved"` assignment; reproject the remainder as an active Today risk.

**Migration helper analog:** `apps/mobile/src/capture/sqlite-migrations.ts:37-51`

```ts
async function ensureColumns(
  db: SchemaMigrationDatabase,
  tableName: string,
  columns: readonly { name: string; definition: string }[],
): Promise<void> {
  const existingRows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
  const existingColumns = new Set(existingRows.map((column) => column.name));

  for (const column of columns) {
    if (existingColumns.has(column.name)) continue;
    await db.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition};`,
    );
    existingColumns.add(column.name);
  }
}
```

Use forward-only, idempotent migration helpers. Test upgrade from legacy unitless rows and ensure the recovery state remains explicit after restart.

### 5. Valid-Payload Handoff, Transport Classification, Retry, And Discard

**Targets**

- `apps/mobile/src/capture/gpp-client.ts`
- `apps/mobile/src/capture/gpp-offline-queue.ts`
- `apps/mobile/src/capture/CaptureApp.tsx`
- their tests

**Draft/build analog:** `apps/mobile/src/capture/gpp-flow-state.ts:47-89`

```ts
export function validateGppAvariaDraft(
  draft: GppAvariaDraft,
): GppAvariaValidationError | undefined {
  if (draft.productCode.trim().length === 0) return "missing_product_code";
  const parsedQuantity = Number(draft.quantity.replace(",", "."));
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || draft.unit === undefined) {
    return "missing_quantity_unit";
  }
  if (draft.finality === undefined) return "missing_finality_destination";
  return undefined;
}
```

Reuse validation and request building, but lock source product/lot identity and expose only `baixa_gpp`, `reaproveitamento`, and `producao_interna`. Do not expose Phase 18's `transferencia` in the linked Hoje branch.

**Critical queue invariant:** `apps/mobile/src/capture/gpp-offline-queue.ts:79-105`

```ts
export function parseGppPendingPayload(
  kind: GppPendingKind,
  payload: GppPendingPayload,
): GppPendingPayload {
  return kind === "avaria"
    ? GppAvariaCreateRequestSchema.parse(payload)
    : GppPurchaseCreateRequestSchema.parse(payload);
}

export function createGppPendingRecord(input: {
  localId: string;
  kind: GppPendingKind;
  payload: GppPendingPayload;
  now: string;
}): GppPendingRecord {
  const payload = parseGppPendingPayload(input.kind, input.payload);
  return {
    localId: input.localId,
    kind: input.kind,
    payload,
    idempotencyKey: payload.idempotencyKey,
    state: "pending_retry",
    attemptCount: 0,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
```

Because this parser requires a complete valid request, never put `Falta informar o código` or unknown-unit state into this queue.

**Transport classification analog:** `apps/mobile/src/capture/gpp-client.ts:148-179`

```ts
async function postGppMutation(input: {
  fetcher: typeof fetch;
  baseUrl: string;
  path: string;
  kind: GppRequestKind;
  request: GppCreateRequest;
}): Promise<GppCreateResult> {
  try {
    const response = await input.fetcher(`${input.baseUrl}${input.path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(input.request),
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      return classifyGppHttpFailure({ status: response.status, payload });
    }
    return classifyGppMutationResponse(parseMutationPayload(payload), response.status);
  } catch (error) {
    return {
      state: "offline_pending_candidate",
      kind: input.kind,
      request: input.request,
      idempotencyKey: input.request.idempotencyKey,
      message: GPP_COPY.localPending,
      error: normalizeTransportError(error),
    };
  }
}
```

Only the `catch` transport/reachability path can become `Pendente neste aparelho`. HTTP 400/401/403/404/409/422/503 and typed central business responses remain central failures/corrections, not offline success.

**Retry transition analog:** `apps/mobile/src/capture/gpp-offline-queue.ts:163-193`

```ts
export function applyGppRetryResult(input: {
  record: GppPendingRecord;
  result: GppCreateResult;
  attemptedAt: string;
}): GppPendingRecord {
  const attempted = {
    ...input.record,
    attemptCount: input.record.attemptCount + 1,
    lastAttemptedAt: input.attemptedAt,
    updatedAt: input.attemptedAt,
  };

  if (input.result.state === "central_success") {
    return { ...attempted, state: "central_confirmed" };
  }
  if (input.result.state === "offline_pending_candidate") {
    return { ...attempted, state: "pending_retry" };
  }
  return { ...attempted, state: "conflict", conflictReason: input.result.message };
}
```

Preserve the original idempotency key on automatic resume retry and manual `Sincronizar pendências GPP`. Local discard requires a non-empty reason and mutates only GPP delivery state; it must not delete or rewrite the physical receipt.

**Orchestrator analog:** `apps/mobile/src/capture/CaptureApp.tsx:255-305`

```ts
const syncGppPendingNow = useCallback(async (): Promise<void> => {
  if (gppClient === undefined) {
    setGppSyncNotice({
      tone: "warning",
      title: "Sincronizacao GPP indisponivel",
      body: "As pendencias continuam neste aparelho.",
    });
    return;
  }

  const pending = await repository.listGppPending();
  for (const record of pending) {
    const result = await sendGppPendingRecord(gppClient, record);
    if (result.state === "central_success") {
      await repository.markGppPendingConfirmed({
        localId: record.localId,
        confirmedAt:
          result.response.state === "replayed"
            ? result.response.replayedAt
            : result.response.confirmedAt,
        centralRequestId: result.response.requestId,
      });
    } else if (result.state === "central_failure") {
      await repository.markGppPendingConflict({
        localId: record.localId,
        occurredAt: new Date().toISOString(),
        reason: result.message,
      });
    }
  }
});
```

Keep orchestration route-owned. Refresh linked receipt projections from repository truth after every retry, correction, conflict, acknowledgement, or discard.

### 6. Progressive Terminal UI And Compact Hoje Follow-Up

**Targets**

- `apps/mobile/src/capture/linked-gpp-state.ts`
- `apps/mobile/src/capture/TaskResolutionPanel.tsx`
- `apps/mobile/src/capture/TodayScreen.tsx`
- `apps/mobile/src/capture/CaptureApp.tsx`
- renderer, accessibility, route, and screen tests

**Route ownership analog:** `apps/mobile/src/capture/CaptureApp.tsx:1113-1132`

```tsx
<TaskResolutionPanel
  repository={repository}
  task={currentRoute.task}
  actorLabel={actorLabel}
  onBack={goBack}
  onDone={() => resetToToday()}
  onSyncCentralAction={syncPendingCommandsNow}
  onLocalSave={() => {
    resetToToday({
      notice: todayCopy.sync.localSaved,
      highlightedTaskId: currentRoute.task.id,
    });
    void syncPendingCommandsAutomatically().catch(() => undefined);
  }}
/>
```

Keep `TaskResolutionPanel` as route owner, but extract linked draft/reducer/view so the existing panel does not gain another monolithic state machine. `CaptureApp` injects repository, GPP client, store/sector/session context, actor label, refresh, route, and retry callbacks.

**Terminal action/error pattern:** `apps/mobile/src/capture/TaskResolutionPanel.tsx:269-346`

```ts
async function submit(): Promise<void> {
  if (selectedAction === undefined || !compatible) return;
  setSubmitting(true);

  const command = {
    taskId: task.id,
    action: selectedAction,
    actorLabel,
    occurredAt: now().toISOString(),
  } satisfies OfflineActionCommand["payload"];

  await repository.resolveTodayTask(command);
  setSubmitting(false);
  setConfirming(false);
  onDone();
}
```

Do not copy the one-step resolve call for the linked branch. Replace it with:

1. quantity and inherited evidence;
2. exact physical confirmation;
3. atomic linked-removal repository command;
4. only then reveal the three GPP destinations;
5. locked review;
6. valid central submission;
7. separate two-truth receipt.

`Confirmar esgotado` remains a separate consequential action and creates no GPP record.

**Focused flow/state analog:** `apps/mobile/src/capture/GppAvariaFlow.tsx:27-32`

```ts
type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "central_confirmed"; message: string }
  | { kind: "offline_pending"; message: string }
  | { kind: "central_failed"; message: string };
```

Use a discriminated reducer, not independent booleans. Extend it with `awaiting_code`, `correction_required`, structured `conflict`, and `replayed`, while keeping physical state in a separate discriminant.

`apps/mobile/src/capture/GppAvariaFlow.tsx:197-210` is the selection-row pattern:

```tsx
{GPP_AVARIA_FINALITIES.map((option) => (
  <SelectionRow
    key={option.value}
    detail={`Encaminha para ${option.destination} - destino automatico`}
    label={option.label}
    onPress={() =>
      setDraft((current) => ({
        ...current,
        finality: option.value,
        destination: option.destination,
      }))
    }
    selected={draft.finality === option.value}
  />
))}
```

For Phase 19, reveal only after physical confirmation and supply the approved three-option subset. Reuse `ScreenSection`, `SelectionRow`, `Field`, `PrimaryAction`, `SecondaryAction`, `DestructiveAction`, and `StatusNotice`; do not add a component/icon/animation package.

**Status rendering analog:** `apps/mobile/src/capture/GppAvariaFlow.tsx:129-156`

```tsx
{submission.kind === "submitting" ? (
  <StatusNotice title="Enviando para central..." tone="info">
    Aguarde a confirmacao antes de sair desta tela.
  </StatusNotice>
) : null}
{submission.kind === "central_confirmed" ? (
  <StatusNotice title={submission.message} tone="success">
    A avaria foi recebida pelo Controle GPP central.
  </StatusNotice>
) : null}
{submission.kind === "offline_pending" ? (
  <StatusNotice title={submission.message} tone="warning">
    A central ainda nao recebeu esta avaria.
  </StatusNotice>
) : null}
```

Phase 19 must render two notices/label-value facts:

- `Área de venda`: physical state;
- `Envio GPP`: delivery state.

Central success copy is allowed only for `central_confirmed` or `replayed`. Missing code uses `Falta informar o código`, never `Pendente neste aparelho`.

**Hoje section analog:** `apps/mobile/src/capture/TodayScreen.tsx:617-670`

```tsx
<View style={styles.taskList}>
  {overdueTasks.length === 0 ? null : (
    <View style={styles.taskSection}>
      <SectionHeading count={overdueTasks.length} title={todayCopy.sections.overdue} />
      {overdueTasks.map((task) => (
        <TodayTaskRow key={task.id} task={task} onPress={() => onOpenTask?.(task)} />
      ))}
    </View>
  )}
  {ACTIVE_SECTION_ORDER.map((section) => {
    const sectionTasks = currentTasks.filter((task) => task.section === section);
    if (sectionTasks.length === 0) return null;
    return (
      <View key={section} style={styles.taskSection}>
        <SectionHeading count={sectionTasks.length} title={todayCopy.sections[section]} />
        {sectionTasks.map((task) => (
          <TodayTaskRow key={task.id} task={task} onPress={() => onOpenTask?.(task)} />
        ))}
      </View>
    );
  })}
</View>
```

Add `Pendências GPP após retirada` before active task sections, after the safety/shift and transient refresh area. It is a separate follow-up projection:

- does not increment sales-area risk or active-task count;
- shows only actionable linked states, not success-only history;
- sorts physical implication, missing code, correction/conflict, then transport pending;
- uses one section-level `Sincronizar pendências GPP` action;
- deep-links to preserved draft/correction or the existing durable pending surface;
- never duplicates the Phase 20 central queue.

### 7. Test Structure And Required Assertions

**Contract test analog:** `packages/contracts/src/gpp.test.ts:203-226`

```ts
it("distinguishes central mutation outcomes without optimistic success", () => {
  expect(
    GppMutationResponseSchema.parse({
      state: "central_confirmed",
      requestId: "request-1",
      confirmedAt: now,
    }).state,
  ).toBe("central_confirmed");
});
```

**Outbox test analog:** `apps/mobile/src/capture/gpp-offline-queue.test.ts:58-87`

```ts
it("tracks retry attempts, conflicts, central confirmations, discards", async () => {
  const repository = createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => "gpp-local-1",
  });
  const pending = await repository.saveGppPending({
    kind: "avaria",
    payload: avariaPayload,
  });

  await expect(
    repository.markGppPendingAttempt({
      localId: pending.localId,
      attemptedAt: "2030-01-10T09:10:00.000Z",
    }),
  ).resolves.toMatchObject({
    state: "retrying",
    attemptCount: 1,
    idempotencyKey: avariaPayload.idempotencyKey,
  });
});
```

**Transport test analog:** `apps/mobile/src/capture/gpp-client.test.ts:120-134`

```ts
it("returns offline-pending candidate only transport failures", async () => {
  const fetcher = vi.fn(() => {
    throw new TypeError("Network request failed");
  });
  const client = createFetchGppClient({
    baseUrl: "https://api.example.test",
    fetcher,
  });

  await expect(client.createGppPurchaseRequest(purchaseRequest)).resolves.toMatchObject({
    state: "offline_pending_candidate",
    idempotencyKey: purchaseRequest.idempotencyKey,
    message: "Pendente neste aparelho",
  });
});
```

Required Phase 19 test matrix:

1. full removal records physical receipt and resolves only the removed risk;
2. partial removal preserves remaining quantity/unit as active Today risk;
3. above-pending quantity is rejected without clamp and offers reconference;
4. missing/invalid code survives restart as `Falta informar o código` and never enters GPP outbox;
5. valid transport failure alone enters `Pendente neste aparelho`;
6. HTTP/central validation, permission, feature, and business rejection become `Corrigir envio`;
7. conflict without physical implication leaves physical risk resolved;
8. conflict with `sales_area_presence_uncertain` reprojects affected quantity as `Revisão física necessária`;
9. retry/replay reuses the original idempotency key and creates no duplicate;
10. justified discard retains physical receipt and creates no central call;
11. same code/different lot remains separate in mobile and central persistence;
12. memory and SQLite adapters produce identical outputs;
13. authenticated server store/actor override client claims and reject cross-store provenance;
14. old Phase 18 standalone avaria and purchase payloads/routes still work;
15. Hoje follow-up does not change active-risk counts;
16. exact two-truth labels, progressive order, 48dp targets, TalkBack state/order, narrow wrapping, and reduced-motion behavior follow `19-UI-SPEC.md`.

Use the focused commands already specified in `19-VALIDATION.md`, then run `cmd /c pnpm.cmd check` before verification. Renderer/API/database tests do not replace the blocked native Phase 18 gate or the later deliberate Phase 19 Android UAT.

## Shared Patterns

### Validation

- Parse at every boundary with Zod; use `.strict()` and discriminated unions.
- Keep old Phase 18 payloads backward compatible.
- Do not use `any` or UI-only casts for provenance/state.

### Authorization

- Enforce `controle_gpp_enabled` and `gpp.avaria.create` server-side.
- Derive actor/store from authenticated membership.
- Scope idempotency and source task/lot lookups by store.

### Persistence

- Commit physical receipt and Today full/partial update in one local SQLite transaction.
- Perform central GPP delivery after the physical transaction.
- Store central provenance in queryable columns and append-only audit facts.
- Preserve memory/SQLite parity.

### Error Handling

- Transport exception: may become local pending.
- Central/HTTP validation, permission, feature, business rejection: correction/conflict, never local pending.
- Structured physical-impact signal controls physical reopening; never parse copy.

### UI

- Route-owned orchestration, focused extracted linked state/view.
- Progressive inline disclosure; no modal-first or decorative grid.
- One primary action per step and explicit disabled/error copy.
- Physical and GPP facts are always separately labeled.
- Reuse capture UI/theme primitives and approved PT-BR strings.

## Patterns Not To Copy

1. **Do not copy unconditional whole-task resolution** from current `resolveTodayTask` for partial removal.
2. **Do not copy `client === undefined => saveGppPending`** from `GppAvariaFlow` for incomplete linked drafts. Only a valid request plus actual transport failure may enter the outbox.
3. **Do not default an unknown lot unit to `"un"`**, even though an existing purchase request builder has a fallback.
4. **Do not infer physical reopening from an error message** or every GPP conflict.
5. **Do not trust mobile actor/store text** as central authoritative data.
6. **Do not create a second retry queue** or a duplicate Phase 20 queue inside Hoje.
7. **Do not expose `transferencia`** in the Phase 19 terminal destinations.
8. **Do not erase the physical receipt when a local GPP attempt is discarded.**
9. **Do not wait for central acknowledgement to resolve a confirmed removed quantity.**
10. **Do not claim central success before `central_confirmed` or `replayed`.**

## No Exact Analog

These responsibilities are genuinely new and must use composite patterns:

- the durable linked physical/GPP aggregate;
- atomic partial-removal plus linked-receipt persistence;
- explicit legacy unknown-unit recovery;
- structured conflict physical impact;
- Hoje's compact post-removal GPP follow-up projection.

The closest existing files supply state, persistence, transport, and UI conventions, but none currently enforces the complete two-truth invariant. Plans must name that invariant in task acceptance criteria rather than assuming reuse alone provides it.
