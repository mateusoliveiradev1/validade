import { describe, expect, it } from "vitest";
import { createInMemoryCaptureRepository } from "@validade-zero/database/capture-repository";
import { createInMemoryAuditRepository } from "./audit";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import {
  createInMemoryShiftCloseRepository,
  createStaticShiftCloseRevalidator,
} from "./shift-close";
import { createApiApp } from "./index";

const NOW = new Date("2030-01-10T18:01:00.000Z");

function createShiftCloseApp(input?: { eligibility?: "safe" | "unsafe" }) {
  const auditRepository = createInMemoryAuditRepository();
  const shiftCloseRepository = createInMemoryShiftCloseRepository();
  const app = createApiApp({
    auditRepository,
    shiftCloseRepository,
    shiftCloseRevalidator: createStaticShiftCloseRevalidator(
      input?.eligibility === "safe"
        ? {
            cacheState: "offline_ready",
            tasks: [],
            syncCommands: [],
            evidence: [],
            checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
          }
        : {
            cacheState: "offline_ready",
            tasks: [
              {
                id: "task-expired-ficticia",
                status: "active",
                riskState: "expired",
                severity: "critical",
                requiredResolution: "withdraw_or_loss",
              },
            ],
            checklist: [],
          },
    ),
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "collaborator-local",
        role: "collaborator",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "lead-outra",
        role: "lead",
        storeId: "loja-outra",
        storeName: "Loja Ficticia Outra",
        status: "active",
      },
    ]),
    now: () => NOW,
  });

  return { app, auditRepository, shiftCloseRepository };
}

async function closeUnsafe(app: ReturnType<typeof createApiApp>) {
  const response = await app.request("/shift-closes", {
    method: "POST",
    headers: {
      authorization: "Bearer fake:lead-local",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      storeId: "loja-piloto",
      verdict: "unsafe",
      reason: "Risco vencido ainda em conferência.",
      continuityOwner: "Lideranca Ficticia Noturna",
      continuityDeadline: "2030-01-10T19:00:00.000Z",
      note: "Retomar a retirada antes de declarar área segura.",
      checklist: [],
      occurredAt: "2030-01-10T18:00:00.000Z",
      idempotencyKey: "shift-close-ficticia-001",
    }),
  });
  return { response, body: (await response.json()) as { closure: { closureId: string } } };
}

describe("shift close API seam", () => {
  it("records an unsafe immutable handoff snapshot without resolving pending work", async () => {
    const { app, auditRepository, shiftCloseRepository } = createShiftCloseApp();
    const result = await closeUnsafe(app);

    expect(result.response.status).toBe(200);
    expect(result.body).toMatchObject({
      replayed: false,
      closure: {
        verdict: "unsafe",
        eligibility: "cannot_evaluate",
        continuityOwner: "Lideranca Ficticia Noturna",
      },
    });
    expect(shiftCloseRepository.readClosures()).toHaveLength(1);
    expect(auditRepository.readEvents().at(-1)).toMatchObject({
      type: "shift.changed",
      summary: "Turno encerrado com pendências e continuidade definida.",
    });

    const replay = await closeUnsafe(app);
    expect(replay.body).toMatchObject({ replayed: true });
    expect(shiftCloseRepository.readClosures()).toHaveLength(1);
  });

  it("rejects safe close when central revalidation finds blockers", async () => {
    const { app } = createShiftCloseApp();
    const response = await app.request("/shift-closes", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        verdict: "safe",
        checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
        occurredAt: "2030-01-10T18:00:00.000Z",
        idempotencyKey: "shift-close-safe-blocked-ficticia",
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "shift_close_rejected" });
  });

  it("uses the central capture repository by default before accepting a safe close", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [
        {
          storeId: "loja-piloto",
          centralProductId: "product-draft-central-001",
          displayName: "Banana Nanica FICTICIA",
          categoryId: "cat-flv",
          categoryName: "FLV",
          status: "draft",
          state: "pending_central",
          source: "pending_central",
          updatedAt: "2030-01-10T11:00:00.000Z",
          categoryRuleProfile: { categoryId: "cat-flv", mode: "formal_validity" },
        },
      ],
      lots: [
        {
          storeId: "loja-piloto",
          centralLotId: "lot-central-001",
          centralProductId: "product-draft-central-001",
          productDisplayName: "Banana Nanica FICTICIA",
          lotIdentity: { identitySource: "printed", value: "BAN-CENTRAL-001" },
          mode: "formal_validity",
          currentLocation: { kind: "area_de_venda" },
          state: "synchronized",
          source: "central",
          riskState: "expired",
          expiresAt: "2030-01-09",
          approximateQuantity: 4,
          updatedAt: "2030-01-10T10:00:00.000Z",
        },
      ],
      tasks: [
        {
          storeId: "loja-piloto",
          centralTaskId: "task-central-001",
          activeKey: "active-central-001",
          centralLotId: "lot-central-001",
          productDisplayName: "Banana Nanica FICTICIA",
          currentLocation: { kind: "area_de_venda" },
          riskState: "expired",
          severity: "critical",
          requiredResolution: "withdraw_or_loss",
          state: "synchronized",
          source: "central",
          ownerLabel: "Equipe do turno",
          dueAt: "2030-01-10T10:30:00.000Z",
          updatedAt: "2030-01-10T10:00:00.000Z",
        },
      ],
      conflicts: [
        {
          storeId: "loja-piloto",
          conflictId: "discarded-central-001",
          commandId: "command-discarded-central-001",
          productDisplayName: "Banana Nanica FICTICIA",
          lotIdentity: { identitySource: "printed", value: "BAN-CENTRAL-001" },
          currentLocation: { kind: "area_de_venda" },
          reason: "Acao local descartada porque a tarefa mudou na central.",
          createdAt: "2030-01-10T11:50:00.000Z",
          state: "discarded",
          source: "central",
        },
      ],
    });
    const app = createApiApp({
      captureRepository,
      auditRepository: createInMemoryAuditRepository(),
      shiftCloseRepository: createInMemoryShiftCloseRepository(),
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([
        {
          subjectId: "lead-local",
          role: "lead",
          storeId: "loja-piloto",
          storeName: "Loja Ficticia Piloto",
          status: "active",
        },
      ]),
      now: () => NOW,
    });

    const response = await app.request("/shift-closes", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        verdict: "safe",
        checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
        occurredAt: "2030-01-10T18:00:00.000Z",
        idempotencyKey: "shift-close-central-blocked-ficticia",
      }),
    });

    expect(response.status).toBe(409);
    expect(captureRepository.readDeviceSnapshots()).toEqual([
      expect.objectContaining({
        deviceId: "shift-close-api",
        storeId: "loja-piloto",
        source: "central",
      }),
    ]);
  });

  it("allows independent lead handoff acknowledgement and linked reopen", async () => {
    const { app, shiftCloseRepository } = createShiftCloseApp();
    const closed = await closeUnsafe(app);
    const closureId = closed.body.closure.closureId;
    const handoff = await app.request(`/shift-closes/${closureId}/handoff-acknowledgements`, {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        occurredAt: "2030-01-10T18:02:00.000Z",
        idempotencyKey: "shift-handoff-ficticia-001",
      }),
    });
    expect(handoff.status).toBe(200);
    expect(shiftCloseRepository.readHandoffs()).toHaveLength(1);

    const reopened = await app.request(`/shift-closes/${closureId}/reopen`, {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        reason: "Nova observação física exige revisão.",
        summary: "Retomar conferência antes de aceitar outro fechamento.",
        occurredAt: "2030-01-10T18:03:00.000Z",
        idempotencyKey: "shift-reopen-ficticia-001",
      }),
    });
    const reopenBody = (await reopened.json()) as { closure: { revisionOfClosureId?: string } };
    expect(reopened.status).toBe(200);
    expect(reopenBody.closure.revisionOfClosureId).toBe(closureId);
    expect(shiftCloseRepository.readClosures()).toHaveLength(2);
  });

  it("denies collaborator and cross-store close attempts", async () => {
    const { app } = createShiftCloseApp();
    const collaborator = await app.request("/shift-closes", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:collaborator-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        verdict: "unsafe",
        reason: "Risco vencido ainda em conferência.",
        continuityOwner: "Lideranca Ficticia Noturna",
        continuityDeadline: "2030-01-10T19:00:00.000Z",
        note: "Retomar a retirada antes de declarar área segura.",
        checklist: [],
        occurredAt: "2030-01-10T18:00:00.000Z",
        idempotencyKey: "shift-close-collaborator-ficticia",
      }),
    });
    expect(collaborator.status).toBe(403);

    const crossStore = await app.request("/shift-closes", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-outra",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        verdict: "unsafe",
        reason: "Risco vencido ainda em conferência.",
        continuityOwner: "Lideranca Ficticia Noturna",
        continuityDeadline: "2030-01-10T19:00:00.000Z",
        note: "Retomar a retirada antes de declarar área segura.",
        checklist: [],
        occurredAt: "2030-01-10T18:00:00.000Z",
        idempotencyKey: "shift-close-cross-store-ficticia",
      }),
    });
    expect(crossStore.status).toBe(403);
  });
});
