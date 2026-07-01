import { describe, expect, it } from "vitest";
import {
  SyncCommandRecordSchema,
  type CentralLotCreateRequest,
  type ProductDraftCreateRequest,
  type SyncCommandRecord,
} from "@validade-zero/contracts";
import { createAuditRepositoryFromQuery } from "./audit-repository";
import {
  createAuthRepositoryFromQuery,
  createInMemoryAuthRepository,
  createLoginAttemptLimiterFromQuery,
} from "./auth-repository";
import {
  createCaptureRepositoryFromQuery,
  createInMemoryCaptureRepository,
} from "./capture-repository";
import {
  createInMemoryMembershipManagementRepository,
  createMembershipRepositoryFromQuery,
} from "./membership-repository";
import { createMaintenanceRepositoryFromQuery } from "./maintenance-repository";

describe("database repositories", () => {
  it("runs retention cleanup only against technical auth tables", async () => {
    const captured: Array<{ query: string; values: unknown[] }> = [];
    const repository = createMaintenanceRepositoryFromQuery({
      query(query: string, values?: unknown[]) {
        captured.push({ query, values: values ?? [] });
        return Promise.resolve([{ deleted_count: 2 }]);
      },
    } as never);

    const result = await repository.run({
      now: new Date("2030-01-10T12:00:00.000Z"),
      retention: { authLoginAttemptHours: 24, expiredAuthRecordDays: 7 },
    });

    expect(result.deleted).toEqual({
      authLoginAttempts: 2,
      authSessions: 2,
      authRecoveryTokens: 2,
      authInvites: 2,
    });
    expect(captured.map((call) => call.query)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("delete from auth_login_attempts"),
        expect.stringContaining("delete from auth_sessions"),
        expect.stringContaining("delete from auth_recovery_tokens"),
        expect.stringContaining("delete from auth_invites"),
      ]),
    );
    expect(captured.map((call) => call.query).join("\n")).not.toMatch(
      /delete from (audit_events|central_products|central_lots|central_observations|central_projected_tasks)/i,
    );
  });

  it("maps active membership rows to the domain shape", async () => {
    const repository = createMembershipRepositoryFromQuery((() =>
      Promise.resolve([
        {
          subject_id: "lead-local",
          role: "lead",
          store_id: "loja-piloto",
          store_name: "Loja Ficticia Piloto",
          status: "active",
        },
      ])) as never);

    await expect(repository.listActiveMemberships("lead-local")).resolves.toEqual([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
    ]);
  });

  it("only exposes append and store-scoped select operations for audit events", () => {
    const repository = createAuditRepositoryFromQuery((() => Promise.resolve([])) as never);
    const keys = Object.keys(repository);

    expect(keys).toEqual(["append", "appendWithMutation", "listByTarget", "queryStore"]);
    expect("update" in repository).toBe(false);
    expect("delete" in repository).toBe(false);
  });

  it("writes sanitized append-only audit rows with idempotent insert-only SQL", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      if (strings.join("?").includes("select")) {
        return Promise.resolve([createAuditRow()]);
      }

      return Promise.resolve([]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);

    const event = await repository.append({
      eventId: "event-1",
      idempotencyKey: "idem-1",
      type: "access.denied",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      actorId: "actor-1",
      actorDisplayName: "Pessoa Piloto",
      actorRoleSnapshot: "lead",
      occurredAt: new Date("2026-06-22T10:00:00.000Z"),
      targetType: "access_request",
      targetId: "task-ficticia",
      targetLabel: "Tentativa bloqueada",
      summary: "Acesso negado sanitizado.",
      reason: "outside_store_scope",
      status: "denied",
      metadata: { requestedCapability: "task.act" },
    });

    expect(String(captured[0]?.[0])).toContain("insert into audit_events");
    expect(String(captured[0]?.[0])).toContain("on conflict (idempotency_key) do nothing");
    expect(String(captured[0]?.[0])).not.toMatch(/update|delete/i);
    expect(String(captured[0]?.[0])).toContain("sanitized");
    expect(String(captured[0]?.[0])).toContain("true");
    expect(event).toMatchObject({
      eventId: "event-1",
      storeId: "loja-piloto",
      status: "denied",
    });
  });

  it("does not run the mutation callback when idempotency already exists", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      return Promise.resolve([createAuditRow()]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);
    let mutationCount = 0;

    const result = await repository.appendWithMutation({
      event: {
        eventId: "event-1",
        idempotencyKey: "idem-1",
        type: "task.changed",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        actorId: "actor-1",
        actorDisplayName: "Pessoa Piloto",
        actorRoleSnapshot: "lead",
        occurredAt: new Date("2026-06-22T10:00:00.000Z"),
        targetType: "task",
        targetId: "task-ficticia",
        summary: "Tarefa atualizada.",
      },
      mutate: () => {
        mutationCount += 1;
        return Promise.resolve({ status: "mutated" });
      },
    });

    expect(result.replayed).toBe(true);
    expect(mutationCount).toBe(0);
    expect(String(captured[0]?.[0])).toContain("where idempotency_key =");
    expect(captured).toHaveLength(1);
  });

  it("persists login throttling by hashed identifier only", async () => {
    const captured: Array<{ query: string; values: unknown[] }> = [];
    const sql = {
      query(query: string, values: unknown[]) {
        captured.push({ query, values });
        if (query.includes("count(*)")) return Promise.resolve([{ attempt_count: 4 }]);
        return Promise.resolve([]);
      },
    } as never;
    const limiter = createLoginAttemptLimiterFromQuery(sql, {
      pepper: "test-token-pepper-at-least-16",
      maxAttempts: 5,
      windowMs: 15 * 60_000,
    });

    await expect(
      limiter.isAllowed("Person@Example.Invalid", new Date("2030-01-10T12:00:00.000Z")),
    ).resolves.toBe(true);
    await limiter.recordFailure("Person@Example.Invalid", new Date("2030-01-10T12:01:00.000Z"));
    await limiter.clear("Person@Example.Invalid");

    const serialized = JSON.stringify(captured);
    expect(serialized).not.toContain("Person@Example.Invalid");
    expect(serialized).not.toContain("person@example.invalid");
    expect(serialized).toMatch(/[0-9a-f]{64}/);
    expect(captured.some((call) => call.query.includes("insert into auth_login_attempts"))).toBe(
      true,
    );
    expect(captured.some((call) => call.query.includes("delete from auth_login_attempts"))).toBe(
      true,
    );
  });

  it("queries audit rows with a mandatory store predicate and cursor limit", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      return Promise.resolve([createAuditRow()]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);

    const page = await repository.queryStore({
      storeId: "loja-piloto",
      targetType: "task",
      targetId: "task-ficticia",
      limit: 10,
    });

    expect(String(captured[0]?.[0])).toContain("where store_id =");
    expect(String(captured[0]?.[0])).toContain("target_type");
    expect(String(captured[0]?.[0])).toContain("limit");
    expect(page.items).toHaveLength(1);
  });

  it("hydrates prepare-turn packages by authorized store only", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [
        centralProduct("store-1", "produto-store-1"),
        centralProduct("store-2", "produto-store-2"),
      ],
      lots: [centralLot("store-1", "lote-store-1"), centralLot("store-2", "lote-store-2")],
      tasks: [centralTask("store-1", "tarefa-store-1"), centralTask("store-2", "tarefa-store-2")],
    });

    const response = await repository.prepareTurn(prepareTurnInput("store-1"));
    expect(response.products.map((item) => item.centralProductId)).toEqual(["produto-store-1"]);
    expect(response.lots.map((item) => item.centralLotId)).toEqual(["lote-store-1"]);
    expect(response.activeTasks.map((item) => item.centralTaskId)).toEqual(["tarefa-store-1"]);
    expect(response.store.readiness).toBe("prepared");
    expect(JSON.stringify(response)).not.toContain("store-2");
    expect(repository.readDeviceSnapshots()).toHaveLength(1);
    expect(repository.readAuditEvents()[0]).toMatchObject({
      type: "sync.changed",
      sanitized: true,
    });
  });

  it("lists pilot device readiness by store without leaking other stores or raw tokens", async () => {
    const repository = createInMemoryCaptureRepository();
    await repository.upsertDeviceSnapshot({
      deviceId: "device-store-1-ready",
      storeId: "store-1",
      storeName: "Loja Ficticia 1",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      appVersion: "0.12.0",
      appBuild: "147",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      preparedAt: new Date("2030-01-10T12:00:00.000Z"),
      lastForegroundAt: new Date("2030-01-10T12:01:00.000Z"),
      lastSyncAt: new Date("2030-01-10T12:02:00.000Z"),
      lastCentralReadAt: new Date("2030-01-10T12:03:00.000Z"),
      lastHydratedAt: new Date("2030-01-10T12:03:00.000Z"),
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
      pushPermission: "granted",
      pushProviderState: "remote_ready",
      cameraPermission: "granted",
      updatedAt: new Date("2030-01-10T12:04:00.000Z"),
    });
    await repository.upsertDeviceSnapshot({
      deviceId: "device-store-1-blocked",
      storeId: "store-1",
      storeName: "Loja Ficticia 1",
      deviceLabel: "Aparelho sem leitura",
      activeUserLabel: "Colaborador FICTICIO",
      pendingCommandCount: 1,
      conflictCount: 0,
      source: "central",
      pushPermission: "denied",
      pushProviderState: "local_only",
      cameraPermission: "denied",
      updatedAt: new Date("2030-01-10T11:00:00.000Z"),
    });
    await repository.upsertDeviceSnapshot({
      deviceId: "device-store-2",
      storeId: "store-2",
      storeName: "Loja Ficticia 2",
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
      updatedAt: new Date("2030-01-10T12:00:00.000Z"),
    });

    const readiness = await repository.listDeviceReadiness({
      storeId: "store-1",
      storeName: "Loja Ficticia 1",
      now: new Date("2030-01-10T12:30:00.000Z"),
      requireCamera: true,
      requireRemotePush: true,
    });

    expect(readiness.map((device) => device.verdict)).toEqual(["bloqueado", "apto"]);
    expect(readiness[0]).toMatchObject({
      deviceLabel: "Aparelho sem leitura",
      buildCompatibility: "desconhecido",
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "missing_first_central_read" }),
        expect.objectContaining({ code: "push_required_without_push" }),
        expect.objectContaining({ code: "camera_required_without_camera" }),
        expect.objectContaining({ code: "old_build_attention" }),
      ]),
    });
    expect(readiness[1]).toMatchObject({
      deviceLabel: "Moto G Lideranca",
      buildCompatibility: "atual",
      approvedArtifactLabel: "uat17-shift-close-alerts-apk-147",
      approvedAppVersion: "0.12.0",
      approvedBuild: "147",
    });
    expect(JSON.stringify(readiness)).not.toMatch(
      /device-store-1-ready|device-store-2|pushToken|expoPushToken|buildUrl/i,
    );
  });

  it("returns deterministic needs-review semantics for empty prepare-turn reads", async () => {
    const repository = createInMemoryCaptureRepository();

    const response = await repository.prepareTurn(prepareTurnInput("store-empty"));
    expect(response.store.readiness).toBe("needs_review");
    expect(response.cache.state).toBe("needs_first_central_read");
    expect(response.store.blockers[0]).toContain("Leitura central sem fatos");
  });

  it("uses store-scoped SQL and writes sanitized prepare-turn audit rows", async () => {
    const captured: unknown[][] = [];
    const sql = {
      query(strings: string, values?: unknown[]) {
        captured.push([strings, ...(values ?? [])]);
        if (strings.includes("from central_products")) {
          return Promise.resolve([centralProductRow()]);
        }

        return Promise.resolve([]);
      },
    };
    const repository = createCaptureRepositoryFromQuery(sql as never);

    const response = await repository.prepareTurn(prepareTurnInput("store-1"));
    const selectQueries = captured.slice(0, 5).map(([query]) => String(query));
    expect(selectQueries).toHaveLength(5);
    expect(selectQueries.every((query) => /where\s+((t|p)\.)?store_id = \$1/.test(query))).toBe(
      true,
    );
    expect(String(captured[5]?.[0])).toContain("insert into central_device_snapshots");
    expect(String(captured[6]?.[0])).toContain("insert into audit_events");
    expect(String(captured[6]?.[0])).toContain("sanitized");
    expect(String(captured[6]?.[0])).toContain("true");
    expect(response.products[0]?.centralProductId).toBe("produto-store-1");
  });

  it("prevents duplicate product drafts by normalized name or GTIN", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [
        {
          ...centralProduct("store-1", "produto-store-1"),
          normalizedKey: "ovos brancos ficticios",
          gtin: "7890000000001",
        },
      ],
    });

    const duplicateByGtin = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos Outra Embalagem FICTICIOS",
        gtin: "7890000000001",
      }),
    );
    const duplicateByName = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos FICTICIOS",
      }),
    );

    expect(duplicateByGtin).toMatchObject({
      outcome: "reuse_existing",
      duplicateReason: "gtin",
    });
    expect(duplicateByName).toMatchObject({
      outcome: "reuse_existing",
      duplicateReason: "normalized_name",
    });
    expect(repository.readProductDrafts()).toHaveLength(0);
    expect(repository.readAuditEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "product",
          action: "product.reused",
          sanitized: true,
        }),
      ]),
    );
  });

  it("links new scanned identifiers to an existing product instead of creating a duplicate", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [
        {
          ...centralProduct("store-1", "produto-store-1"),
          normalizedKey: "ovos brancos ficticios",
          gtin: "7890000000001",
        },
      ],
    });

    const response = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos FICTICIOS",
        identifiers: [{ type: "barcode", value: "7890000000099" }],
      }),
    );
    const lookup = await repository.searchProducts({
      requestId: "search-by-barcode-store-1",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      actorId: "subject-1",
      actorDisplayName: "Pessoa Piloto",
      actorRoleSnapshot: "lead",
      request: {
        identifier: { type: "barcode", value: "7890000000099" },
        requestedAt: "2030-01-10T09:00:00.000Z",
      },
    });

    expect(response).toMatchObject({
      outcome: "reuse_existing",
      reusableProduct: { centralProductId: "produto-store-1" },
    });
    expect(lookup).toMatchObject({
      resultState: "reuse_available",
      reusableProducts: [
        {
          centralProductId: "produto-store-1",
          matchReasons: ["exact_identifier"],
          identifiers: expect.arrayContaining([
            expect.objectContaining({ type: "barcode", value: "7890000000099" }),
          ]),
        },
      ],
    });
    expect(repository.readProductDrafts()).toHaveLength(0);
  });

  it("returns similar candidates before creating a product draft", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [
        {
          ...centralProduct("store-1", "produto-store-1"),
          normalizedKey: "ovos brancos ficticios",
        },
      ],
    });

    const firstAttempt = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos Organicos FICTICIOS",
      }),
    );
    expect(firstAttempt).toMatchObject({
      outcome: "similar_found",
      similarCandidates: [
        {
          centralProductId: "produto-store-1",
          matchKind: "similar_candidate",
        },
      ],
    });

    const draft = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos Organicos FICTICIOS",
        similarCandidateIds: ["produto-store-1"],
      }),
    );
    const replay = await repository.createProductDraft(
      productDraftInput("store-1", {
        displayName: "Ovos Brancos Organicos FICTICIOS",
        similarCandidateIds: ["produto-store-1"],
      }),
    );

    expect(draft).toMatchObject({
      outcome: "draft_pending_review",
      draft: {
        reviewStatus: "pending_review",
        source: "draft_pending_review",
      },
    });
    expect(replay).toMatchObject({
      outcome: "draft_pending_review",
      draft: {
        centralProductId: draft.draft?.centralProductId,
      },
    });
    expect(repository.readProductDrafts()).toHaveLength(1);
  });

  it("uses normalized product keys and sanitized catalog audit rows in SQL", async () => {
    const captured: unknown[][] = [];
    const sql = {
      query(strings: string, values?: unknown[]) {
        captured.push([strings, ...(values ?? [])]);
        return Promise.resolve([]);
      },
    };
    const repository = createCaptureRepositoryFromQuery(sql as never);

    const response = await repository.createProductDraft(productDraftInput("store-1"));

    expect(response).toMatchObject({
      outcome: "draft_pending_review",
      normalizedKey: "ovos caipiras ficticios",
    });
    expect(captured.some(([query]) => String(query).includes("normalized_key"))).toBe(true);
    expect(
      captured.some(([query]) => String(query).includes("insert into central_category_catalog")),
    ).toBe(true);
    expect(captured.some(([query]) => String(query).includes("insert into central_products"))).toBe(
      true,
    );
    const auditQuery = captured.find(([query]) =>
      String(query).includes("insert into audit_events"),
    );
    expect(String(auditQuery?.[0])).toContain("'product'");
    expect(String(auditQuery?.[0])).toContain("sanitized");
    expect(String(auditQuery?.[0])).toContain("true");
  });

  it("reviews SQL product drafts by central product id and updates the real draft id", async () => {
    const captured: unknown[][] = [];
    const sql = {
      query(strings: string, values?: unknown[]) {
        captured.push([strings, ...(values ?? [])]);
        if (strings.includes("from central_product_drafts d")) {
          return Promise.resolve([
            {
              ...centralProductRow(),
              central_product_id: "product:store-1:cabotia-kg-ped",
              display_name: "Cabotia KG PED FICTICIO",
              normalized_key: "cabotia kg ped ficticio",
              status: "draft",
              state: "pending",
              identifiers: [],
              draft_id: "draft:store-1:cabotia-kg-ped",
              requested_by_label: "Pessoa Piloto",
              created_at: "2030-01-10T09:00:00.000Z",
            },
          ]);
        }

        return Promise.resolve([]);
      },
    };
    const repository = createCaptureRepositoryFromQuery(sql as never);

    const response = await repository.reviewProductDraft({
      requestId: "review-by-product-id-store-1",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      actorId: "subject-1",
      actorDisplayName: "Pessoa Piloto",
      actorRoleSnapshot: "lead",
      request: {
        draftId: "product:store-1:cabotia-kg-ped",
        decision: "approve",
        reviewedAt: "2030-01-10T09:05:00.000Z",
      },
    });
    const selectQuery = captured.find(([query]) =>
      String(query).includes("from central_product_drafts d"),
    );
    const draftUpdateQuery = captured.find(([query]) =>
      String(query).includes("update central_product_drafts"),
    );

    expect(response).toMatchObject({
      draft: {
        draftId: "draft:store-1:cabotia-kg-ped",
        centralProductId: "product:store-1:cabotia-kg-ped",
        reviewStatus: "validated",
      },
    });
    expect(String(selectQuery?.[0])).toContain("d.draft_id = $2 or d.central_product_id = $2");
    expect(draftUpdateQuery?.[5]).toBe("draft:store-1:cabotia-kg-ped");
  });

  it("rejects central lot writes for unknown or cross-store products", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [centralProduct("store-2", "produto-cross-store")],
    });

    await expect(
      repository.createLot(
        centralLotCreateInput("store-1", {
          lot: { ...centralLotCreateRequest().lot, productId: "produto-cross-store" },
        }),
      ),
    ).rejects.toThrow("central_product_not_found");
    await expect(
      repository.createLot(
        centralLotCreateInput("store-1", {
          lot: { ...centralLotCreateRequest().lot, productId: "produto-desconhecido" },
        }),
      ),
    ).rejects.toThrow("central_product_not_found");
  });

  it("rejects central lot writes for products that are not validated yet", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [
        {
          ...centralProduct("store-1", "produto-store-1"),
          status: "draft",
          state: "pending",
        },
      ],
    });

    await expect(repository.createLot(centralLotCreateInput("store-1"))).rejects.toThrow(
      "central_product_not_found",
    );
  });

  it("creates central lots idempotently and exposes their projected task on prepare-turn", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [centralProduct("store-1", "produto-store-1")],
    });

    const first = await repository.createLot(
      centralLotCreateInput("store-1", {
        request: { ...centralLotCreateRequest(), idempotencyKey: "lote-idem-001" },
      }),
    );
    const replay = await repository.createLot(
      centralLotCreateInput("store-1", {
        request: { ...centralLotCreateRequest(), idempotencyKey: "lote-idem-001" },
      }),
    );
    const prepared = await repository.prepareTurn(prepareTurnInput("store-1"));

    expect(replay.lot.centralLotId).toBe(first.lot.centralLotId);
    expect(prepared.lots).toHaveLength(1);
    expect(prepared.activeTasks).toHaveLength(1);
    expect(prepared.activeTasks[0]).toMatchObject({
      centralLotId: first.lot.centralLotId,
      riskState: "expired",
      requiredResolution: "withdraw_or_loss",
    });
    expect(repository.readAuditEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "lot",
          action: "lot.created",
          sanitized: true,
        }),
      ]),
    );
  });

  it("keeps central projected task active keys within the public contract for mobile lot ids", async () => {
    const repository = createInMemoryCaptureRepository({
      products: [centralProduct("store-1", "produto-store-1")],
    });
    const mobileIdempotencyKey =
      "mobile-lot:produto-store-1:generated_internal:INTERNO-LOCAL-MR11XPQA:processed_repack_loss:a";

    const first = await repository.createLot(
      centralLotCreateInput("store-1", {
        request: {
          ...centralLotCreateRequest(),
          idempotencyKey: mobileIdempotencyKey,
          lot: {
            ...centralLotCreateRequest().lot,
            identity: {
              identitySource: "generated_internal",
              value: "INTERNO-LOCAL-MR11XPQA",
            },
            mode: "processed_repack_loss",
          },
        },
      }),
    );
    const replay = await repository.createLot(
      centralLotCreateInput("store-1", {
        request: {
          ...centralLotCreateRequest(),
          idempotencyKey: mobileIdempotencyKey,
          lot: {
            ...centralLotCreateRequest().lot,
            identity: {
              identitySource: "generated_internal",
              value: "INTERNO-LOCAL-MR11XPQA",
            },
            mode: "processed_repack_loss",
          },
        },
      }),
    );
    const prepared = await repository.prepareTurn(prepareTurnInput("store-1"));

    expect(`${first.lot.centralLotId}:expired:withdraw_or_loss:root`.length).toBeGreaterThan(120);
    expect(first.taskProjection.attention).toBe("active_task");
    expect(first.acknowledgement.acknowledgementId.length).toBeLessThanOrEqual(120);
    expect(replay.taskProjection).toEqual(first.taskProjection);
    if (first.taskProjection.attention === "active_task") {
      expect(first.taskProjection.activeKey).toMatch(/^task-key:store-1:/);
      expect(first.taskProjection.activeKey.length).toBeLessThanOrEqual(120);
      expect(prepared.activeTasks[0]?.activeKey).toBe(first.taskProjection.activeKey);
    }
  });

  it("applies accepted sync commands to central active tasks idempotently", async () => {
    const task = {
      ...centralTask("store-1", "task-sync-001"),
      activeKey: "active-sync-001",
      centralLotId: "lot-sync-001",
      riskState: "expired" as const,
      severity: "critical" as const,
      requiredResolution: "withdraw_or_loss" as const,
    };
    const repository = createInMemoryCaptureRepository({
      lots: [centralLot("store-1", "lot-sync-001")],
      tasks: [task],
    });
    const command = syncCommandForTask({
      taskId: task.centralTaskId,
      activeKey: task.activeKey,
      lotId: task.centralLotId,
      action: "withdraw",
      requiredResolution: "withdraw_or_loss",
      riskState: "expired",
      idempotencyKey: "sync-central-accepted-001",
    });

    const first = await repository.applySyncCommand(syncApplyInput("store-1", command));
    const replay = await repository.applySyncCommand(syncApplyInput("store-1", command));
    const prepared = await repository.prepareTurn(prepareTurnInput("store-1"));

    expect(first).toMatchObject({
      status: "ack",
      centralResult: {
        kind: "resolved_history",
        history: {
          centralTaskId: task.centralTaskId,
          action: "withdraw",
          resolutionState: "resolved",
        },
      },
    });
    expect(replay).toEqual(first);
    expect(prepared.activeTasks).toHaveLength(0);
    expect(prepared.resolvedHistory).toEqual([
      expect.objectContaining({
        centralTaskId: task.centralTaskId,
        action: "withdraw",
        state: "resolved",
      }),
    ]);
    expect(repository.readAuditEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "resolve_task.resolved",
          sanitized: true,
        }),
      ]),
    );
  });

  it("keeps active central risk visible when a sync command conflicts", async () => {
    const task = centralTask("store-1", "task-conflict-001");
    const repository = createInMemoryCaptureRepository({
      lots: [centralLot("store-1", "lot-store-1")],
      tasks: [task],
    });
    const command = syncCommandForTask({
      taskId: task.centralTaskId,
      activeKey: task.activeKey,
      lotId: task.centralLotId,
      action: "withdraw",
      requiredResolution: "check_presence",
      riskState: "critical",
      idempotencyKey: "sync-central-conflict-001",
    });

    const result = await repository.applySyncCommand(syncApplyInput("store-1", command));
    const prepared = await repository.prepareTurn(prepareTurnInput("store-1"));

    expect(result).toMatchObject({
      status: "conflict",
      conflict: {
        remoteChange: {
          kind: "critical_command_blocked",
        },
      },
    });
    expect(prepared.activeTasks).toEqual([
      expect.objectContaining({
        centralTaskId: task.centralTaskId,
      }),
    ]);
    expect(prepared.conflicts).toEqual([
      expect.objectContaining({
        commandId: command.id,
        state: "conflict",
      }),
    ]);
  });

  it("writes central lot, observation, task projection, and audit SQL rows", async () => {
    const captured: unknown[][] = [];
    const sql = {
      query(strings: string, values?: unknown[]) {
        captured.push([strings, ...(values ?? [])]);
        if (
          strings.includes("from central_products") &&
          !strings.includes("join central_products")
        ) {
          return Promise.resolve([centralProductRow()]);
        }

        return Promise.resolve([]);
      },
    };
    const repository = createCaptureRepositoryFromQuery(sql as never);

    const response = await repository.createLot(centralLotCreateInput("store-1"));

    expect(response.taskProjection).toMatchObject({
      attention: "active_task",
      riskState: "expired",
    });
    expect(captured.some(([query]) => String(query).includes("insert into central_lots"))).toBe(
      true,
    );
    expect(
      captured.some(([query]) => String(query).includes("insert into central_observations")),
    ).toBe(true);
    expect(
      captured.some(([query]) => String(query).includes("insert into central_projected_tasks")),
    ).toBe(true);
    const auditQuery = captured.find(([query]) =>
      String(query).includes("insert into audit_events"),
    );
    expect(String(auditQuery?.[0])).toContain("'lot'");
    expect(String(auditQuery?.[0])).toContain("sanitized");
    expect(String(auditQuery?.[0])).toContain("true");
  });

  it("preserves decimal central lot quantities in SQL writes", async () => {
    const captured: unknown[][] = [];
    const sql = {
      query(strings: string, values?: unknown[]) {
        captured.push([strings, ...(values ?? [])]);
        if (
          strings.includes("from central_products") &&
          !strings.includes("join central_products")
        ) {
          return Promise.resolve([centralProductRow()]);
        }

        return Promise.resolve([]);
      },
    };
    const repository = createCaptureRepositoryFromQuery(sql as never);

    await repository.createLot(
      centralLotCreateInput("store-1", {
        lot: { ...centralLotCreateRequest().lot, approximateQuantity: 1.5 },
      }),
    );

    const centralLotWrite = captured.find(([query]) =>
      String(query).includes("insert into central_lots"),
    );

    expect(centralLotWrite).toContain(1.5);
  });

  it("deduplicates pilot invites and rejects expired invite tokens", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    const first = await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    const replay = await repository.createInvite({
      ...inviteInput(),
      token: "different-raw-token-that-must-not-be-stored",
    });

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ invite: first.invite, replayed: true });
    await expect(
      repository.validateInvite({
        token: RAW_INVITE_TOKEN,
        now: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ).resolves.toEqual({ status: "expired" });
  });

  it("stores only salted password and token hashes", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    await repository.activateAccount({
      token: RAW_INVITE_TOKEN,
      password: RAW_PASSWORD,
      activatedAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.rotateSession({
      sessionId: "session-1",
      subjectId: "subject-1",
      storeId: "store-1",
      nextToken: RAW_SESSION_TOKEN,
      expiresAt: new Date("2026-06-22T18:05:00.000Z"),
      occurredAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.createRecoveryRequest({
      recoveryId: "recovery-1",
      idempotencyKey: "recovery-idempotency-1",
      identifier: "person@example.invalid",
      token: RAW_RECOVERY_TOKEN,
      expiresAt: new Date("2026-06-22T10:35:00.000Z"),
      createdAt: new Date("2026-06-22T10:06:00.000Z"),
    });

    const stored = JSON.stringify(repository.readStoredState());
    expect(stored).not.toContain(RAW_INVITE_TOKEN);
    expect(stored).not.toContain(RAW_SESSION_TOKEN);
    expect(stored).not.toContain(RAW_RECOVERY_TOKEN);
    expect(stored).not.toContain(RAW_PASSWORD);
    expect(repository.readStoredState().credentials[0]?.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(repository.readStoredState().credentials[0]?.passwordAlgorithm).toBe(
      "pbkdf2-sha256:20000",
    );
    await expect(
      repository.verifyPassword({
        identifier: "person@example.invalid",
        password: RAW_PASSWORD,
      }),
    ).resolves.toMatchObject({ subjectId: "subject-1", storeId: "store-1" });
  });

  it("rejects password hashes above the worker-safe cost without burning CPU", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    await repository.activateAccount({
      token: RAW_INVITE_TOKEN,
      password: RAW_PASSWORD,
      activatedAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    const credential = repository.readStoredState().credentials[0] as
      | { passwordAlgorithm: string }
      | undefined;
    expect(credential).toBeDefined();
    if (credential !== undefined) credential.passwordAlgorithm = "pbkdf2-sha256:310000";

    await expect(
      repository.verifyPassword({
        identifier: "person@example.invalid",
        password: RAW_PASSWORD,
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks session refresh after the store membership is revoked", async () => {
    const memberships = createMemberships();
    const repository = createInMemoryAuthRepository({ memberships, secrets: TEST_SECRETS });
    await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    await repository.activateAccount({
      token: RAW_INVITE_TOKEN,
      password: RAW_PASSWORD,
      activatedAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.rotateSession({
      sessionId: "session-1",
      subjectId: "subject-1",
      storeId: "store-1",
      nextToken: RAW_SESSION_TOKEN,
      expiresAt: new Date("2026-06-22T18:05:00.000Z"),
      occurredAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await expect(
      repository.verifySession({
        token: RAW_SESSION_TOKEN,
        now: new Date("2026-06-22T10:06:00.000Z"),
      }),
    ).resolves.toMatchObject({ subjectId: "subject-1", storeId: "store-1" });

    await memberships.revokeMembership({
      membershipId: "membership-1",
      storeId: "store-1",
      expectedVersion: 1,
      idempotencyKey: "revoke-membership-1",
      occurredAt: new Date("2026-06-22T10:07:00.000Z"),
    });

    await expect(
      repository.verifySession({
        token: RAW_SESSION_TOKEN,
        now: new Date("2026-06-22T10:08:00.000Z"),
      }),
    ).resolves.toBeUndefined();
  });

  it("stores bounded privacy intake without evidence or secret fields", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    const receipt = await repository.createPrivacyRequest({
      requestId: "privacy-1",
      idempotencyKey: "privacy-idempotency-1",
      subjectId: "subject-1",
      storeId: "store-1",
      requestType: "access",
      contactChannel: "email",
      contactValue: "person@example.invalid",
      dataCategories: ["identity", "store_and_role", "timestamps_and_audit"],
      requestBody: "Solicito uma copia dos dados associados a minha conta.",
      receivedAt: new Date("2026-06-22T10:10:00.000Z"),
    });

    expect(receipt.replayed).toBe(false);
    expect(Object.keys(receipt.request)).not.toEqual(
      expect.arrayContaining(["binary", "base64", "deviceUri", "signedUrl", "secret"]),
    );
  });

  it("qualifies account columns when completing recovery through SQL", async () => {
    const captured: unknown[][] = [];
    const repository = createAuthRepositoryFromQuery(
      {
        query(strings: string, values?: unknown[]) {
          captured.push([strings, ...(values ?? [])]);
          return Promise.resolve([
            {
              subject_id: "subject-1",
              store_id: "store-1",
              identifier: "person@example.invalid",
              display_name: "Pessoa Piloto",
              password_hash: "00",
              password_salt: "00",
              password_algorithm: "pbkdf2-sha256:20000",
              status: "active",
              password_updated_at: "2026-06-22T10:05:00.000Z",
              created_at: "2026-06-22T10:00:00.000Z",
              updated_at: "2026-06-22T10:05:00.000Z",
            },
          ]);
        },
      } as never,
      TEST_SECRETS,
    );

    await expect(
      repository.consumeRecoveryToken({
        token: RAW_RECOVERY_TOKEN,
        password: RAW_PASSWORD,
        consumedAt: new Date("2026-06-22T10:05:00.000Z"),
      }),
    ).resolves.toMatchObject({ subjectId: "subject-1", status: "active" });

    expect(String(captured[0]?.[0])).toContain("returning");
    expect(String(captured[0]?.[0])).toContain("a.subject_id");
  });
});

const TEST_SECRETS = {
  tokenPepper: "test-token-pepper-at-least-16",
  passwordPepper: "test-password-pepper-at-least-16",
};
const RAW_INVITE_TOKEN = "raw-invite-token-at-least-thirty-two-characters";
const RAW_SESSION_TOKEN = "raw-session-token-at-least-thirty-two-characters";
const RAW_RECOVERY_TOKEN = "raw-recovery-token-at-least-thirty-two-characters";
const RAW_PASSWORD = "senha-piloto-forte-123";

function createMemberships() {
  const occurredAt = new Date("2026-06-22T10:00:00.000Z");
  return createInMemoryMembershipManagementRepository([
    {
      membershipId: "membership-1",
      subjectId: "subject-1",
      displayName: "Pessoa Piloto",
      role: "lead",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    },
  ]);
}

function inviteInput() {
  return {
    inviteId: "invite-1",
    idempotencyKey: "invite-idempotency-1",
    identifier: "Person@Example.Invalid",
    subjectId: "subject-1",
    displayName: "Pessoa Piloto",
    storeId: "store-1",
    storeName: "Loja Ficticia Piloto",
    role: "lead" as const,
    expiresAt: new Date("2026-06-29T10:00:00.000Z"),
    createdBy: "admin-1",
    createdAt: new Date("2026-06-22T10:00:00.000Z"),
  };
}

function prepareTurnInput(storeId: string) {
  return {
    requestId: `prepare-${storeId}`,
    storeId,
    storeName: "Loja Ficticia Piloto",
    actorId: "subject-1",
    actorDisplayName: "Pessoa Piloto",
    actorRoleSnapshot: "lead" as const,
    request: {
      deviceId: "aparelho-ficticio-001",
      requestedAt: "2030-01-10T09:00:00.000Z",
      localSnapshot: {
        knownProductCount: 0,
        knownLotCount: 0,
        pendingCommandCount: 0,
      },
    },
  };
}

function productDraftInput(storeId: string, overrides: Partial<ProductDraftCreateRequest> = {}) {
  return {
    requestId: `draft-${storeId}-${overrides.displayName ?? "default"}`,
    storeId,
    storeName: "Loja Ficticia Piloto",
    actorId: "subject-1",
    actorDisplayName: "Pessoa Piloto",
    actorRoleSnapshot: "lead" as const,
    request: {
      displayName: "Ovos Caipiras FICTICIOS",
      categoryId: "categoria-ficticia-ovos",
      categoryName: "Ovos ficticios",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-ovos",
        mode: "formal_validity" as const,
      },
      requestedAt: "2030-01-10T09:00:00.000Z",
      ...overrides,
    },
  };
}

function centralLotCreateInput(
  storeId: string,
  overrides: {
    request?: CentralLotCreateRequest;
    lot?: CentralLotCreateRequest["lot"];
  } = {},
) {
  const request = overrides.request ?? {
    ...centralLotCreateRequest(),
    ...(overrides.lot === undefined ? {} : { lot: overrides.lot }),
  };

  return {
    requestId: `lot-${storeId}-${request.idempotencyKey ?? "default"}`,
    storeId,
    storeName: "Loja Ficticia Piloto",
    actorId: "subject-1",
    actorDisplayName: "Pessoa Piloto",
    actorRoleSnapshot: "lead" as const,
    request,
  };
}

function centralLotCreateRequest(): CentralLotCreateRequest {
  return {
    lot: {
      productId: "produto-store-1",
      identity: {
        identitySource: "printed",
        value: "LOTE-EXPIRADO-FICTICIO",
      },
      approximateQuantity: 7,
      initialLocation: { kind: "area_de_venda" },
      mode: "formal_validity",
      expiresAt: "2030-01-09",
      receivedAt: "2030-01-08",
    },
    actorLabel: "Pessoa Piloto",
    occurredAt: "2030-01-10T09:00:00.000Z",
    idempotencyKey: "lote-idem-default",
  };
}

function centralProduct(storeId: string, centralProductId: string) {
  return {
    storeId,
    centralProductId,
    displayName: "Ovos Brancos FICTICIOS",
    categoryId: "categoria-ficticia-ovos",
    categoryName: "Ovos ficticios",
    status: "validated" as const,
    state: "synchronized" as const,
    source: "central" as const,
    updatedAt: "2030-01-10T09:00:00.000Z",
    categoryRuleProfile: {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity" as const,
    },
  };
}

function centralLot(storeId: string, centralLotId: string) {
  return {
    storeId,
    centralLotId,
    centralProductId: `produto-${storeId}`,
    productDisplayName: "Ovos Brancos FICTICIOS",
    lotIdentity: {
      identitySource: "printed" as const,
      value: "OVOS-FICTICIOS-001",
    },
    mode: "formal_validity" as const,
    currentLocation: { kind: "area_de_venda" as const },
    state: "synchronized" as const,
    source: "central" as const,
    riskState: "critical" as const,
    expiresAt: "2030-01-12",
    approximateQuantity: 12,
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

function centralTask(storeId: string, centralTaskId: string) {
  return {
    storeId,
    centralTaskId,
    activeKey: `${storeId}:lote:critical:check_presence`,
    centralLotId: `lote-${storeId}`,
    productDisplayName: "Ovos Brancos FICTICIOS",
    currentLocation: { kind: "area_de_venda" as const },
    riskState: "critical" as const,
    severity: "high" as const,
    requiredResolution: "check_presence" as const,
    state: "synchronized" as const,
    source: "central" as const,
    ownerLabel: "Equipe do turno",
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

function syncCommandForTask(input: {
  taskId: string;
  activeKey: string;
  lotId: string;
  action: "withdraw";
  requiredResolution: SyncCommandRecord["requiredResolution"];
  riskState: SyncCommandRecord["riskState"];
  idempotencyKey: string;
}): SyncCommandRecord {
  return SyncCommandRecordSchema.parse({
    id: `command-${input.idempotencyKey}`,
    idempotencyKey: input.idempotencyKey,
    kind: "resolve_task",
    state: "syncing",
    urgency: input.riskState === "expired" ? "critical" : "high",
    payload: {
      kind: "resolve_task",
      payload: {
        taskId: input.taskId,
        action: input.action,
        actorLabel: "Pessoa Piloto",
        occurredAt: "2030-01-10T09:15:00.000Z",
        destination: { kind: "retirada_perda" },
        evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
      },
    },
    taskId: input.taskId,
    taskActiveKey: input.activeKey,
    lotId: input.lotId,
    productDisplayName: "Ovos Brancos FICTICIOS",
    lotIdentity: {
      identitySource: "printed",
      value: "OVOS-FICTICIOS-001",
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: input.riskState,
    requiredResolution: input.requiredResolution,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:15:00.000Z",
    savedAt: "2030-01-10T09:10:00.000Z",
    firstAttemptedAt: "2030-01-10T09:15:00.000Z",
    lastAttemptedAt: "2030-01-10T09:15:00.000Z",
    attemptCount: 1,
  });
}

function syncApplyInput(storeId: string, command: SyncCommandRecord) {
  return {
    storeId,
    storeName: "Loja Ficticia Piloto",
    actorId: "device:aparelho-ficticio-001",
    actorDisplayName: "Aparelho ficticio",
    actorRoleSnapshot: "collaborator" as const,
    deviceId: "aparelho-ficticio-001",
    command,
    receivedAt: "2030-01-10T09:16:00.000Z",
  };
}

function centralProductRow() {
  return {
    central_product_id: "produto-store-1",
    display_name: "Ovos Brancos FICTICIOS",
    normalized_key: "ovos brancos ficticios",
    category_id: "categoria-ficticia-ovos",
    category_name: "Ovos ficticios",
    status: "validated",
    state: "synchronized",
    gtin: null,
    category_rule_profile: {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity",
    },
    updated_at: "2030-01-10T09:00:00.000Z",
  };
}

function createAuditRow() {
  return {
    event_id: "event-1",
    idempotency_key: "idem-1",
    type: "access.denied",
    store_id: "loja-piloto",
    store_name: "Loja Ficticia Piloto",
    actor_id: "actor-1",
    actor_display_name: "Pessoa Piloto",
    actor_role_snapshot: "lead",
    occurred_at: "2026-06-22T10:00:00.000Z",
    received_at: "2026-06-22T10:00:01.000Z",
    target_type: "access_request",
    target_id: "task-ficticia",
    target_label: "Tentativa bloqueada",
    summary: "Acesso negado sanitizado.",
    reason: "outside_store_scope",
    status: "denied",
    linked_event_id: null,
    metadata: { requestedCapability: "task.act" },
  };
}
