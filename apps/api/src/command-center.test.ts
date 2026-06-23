import { describe, expect, it } from "vitest";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import { createInMemoryCommandCenterService } from "./command-center";
import { createApiApp } from "./index";

const projection = {
  storeId: "loja-piloto",
  storeName: "Loja Ficticia Piloto",
  refreshedAt: "2030-01-10T12:00:00.000Z",
  freshness: "current",
  verdict: {
    state: "blocked",
    title: "Area de venda com bloqueios",
    detail: "Ha riscos que precisam de acao fisica antes de confirmar seguranca.",
  },
  criticalLots: [
    {
      lotId: "lot-critico-001",
      label: "Folhas FICTICIAS - lote FOL-001",
      locationLabel: "Area de venda",
      reason: "Validade vencida exige retirada.",
    },
  ],
  overdueTasks: [
    {
      taskId: "task-atrasada-001",
      label: "Retirar lote FOL-001",
      ownerLabel: "Colaborador FICTICIO",
      dueLabel: "Atrasada desde 10:00",
    },
  ],
  pendingMarkdowns: [
    { markdownId: "markdown-001", label: "Preco de FOL-001", stage: "Aguardando aplicacao" },
  ],
  pendingEvidence: [
    {
      assetId: "evidence-001",
      label: "Retirada do lote FOL-001",
      state: "failed",
      detail: "Evidencia aguardando novo envio.",
    },
  ],
  syncConflicts: [
    {
      conflictId: "conflict-001",
      label: "Acao offline para FOL-001",
      detail: "Revise a mudanca atual antes de reenviar.",
    },
  ],
  pendingShiftCloses: [
    { closureId: "shift-close-001", label: "Fechamento do turno atual", blockerCount: 2 },
  ],
  shiftHistory: [
    {
      closureId: "shift-history-001",
      label: "Fechamento anterior",
      verdict: "unsafe",
      occurredAt: "2030-01-10T08:00:00.000Z",
    },
  ],
} as const;

function createApp() {
  return createApiApp({
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
    ]),
    commandCenterService: createInMemoryCommandCenterService({ projection }),
  });
}

describe("Command Center API", () => {
  it("returns the runtime-validated operational funnel only inside the authorized store", async () => {
    const response = await createApp().request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      verdict: { state: "blocked" },
      criticalLots: [{ lotId: "lot-critico-001" }],
      pendingEvidence: [{ state: "failed" }],
      syncConflicts: [{ conflictId: "conflict-001" }],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /sales|revenue|forecast|supplier|objectKey|signedUrl|base64/i,
    );
  });

  it("denies roles without leadership audit scope", async () => {
    const response = await createApp().request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });

    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain("lot-critico-001");
  });
});
