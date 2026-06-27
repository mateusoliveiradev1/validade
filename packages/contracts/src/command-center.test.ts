import { describe, expect, it } from "vitest";
import { CommandCenterProjectionSchema } from "./command-center";

describe("Command Center contracts", () => {
  it("requires structured cause data for critical lots", () => {
    const parsed = CommandCenterProjectionSchema.parse({
      storeId: "loja-ficticia",
      storeName: "Loja Ficticia Piloto",
      refreshedAt: "2030-01-10T12:00:00.000Z",
      freshness: "current",
      verdict: {
        state: "blocked",
        title: "Area de venda com bloqueio",
        detail: "Ha risco vencido ainda sem confirmacao fisica.",
      },
      criticalLots: [
        {
          lotId: "lot-ficticio-001",
          label: "Folhas FICTICIAS - lote FOL-001",
          locationLabel: "Area de venda",
          reason: "Lote vencido precisa de retirada.",
          cause: {
            code: "formal_expiry_passed",
            label: "Prazo formal ja passou",
            detail: "Lote vencido ainda nao tem confirmacao central de retirada.",
            actionLabel: "Retirar, registrar destino e reconferir a gondola",
            riskState: "expired",
            requiredResolution: "withdraw_or_loss",
            responsibleLabel: "Colaborador FICTICIO",
            sourceEventId: "audit-sync-ficticio-001",
            sourceEventSummary: "Sync de tarefa vencida falhou.",
            firstDetectedAt: "2030-01-10T10:00:00.000Z",
            lastObservedAt: "2030-01-10T10:05:00.000Z",
            lastAttemptedAt: "2030-01-10T10:10:00.000Z",
          },
        },
      ],
      overdueTasks: [],
      pendingMarkdowns: [],
      pendingProductDrafts: [],
      pendingEvidence: [],
      syncConflicts: [],
      pendingShiftCloses: [],
      shiftHistory: [],
    });

    expect(parsed.criticalLots[0]?.cause).toMatchObject({
      code: "formal_expiry_passed",
      riskState: "expired",
      sourceEventId: "audit-sync-ficticio-001",
    });
  });
});
