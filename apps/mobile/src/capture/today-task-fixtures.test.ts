import { describe, expect, it } from "vitest";
import type { TodayTaskRecord } from "@validade-zero/contracts";

function todayTaskFixture(input: {
  id: string;
  lotId: string;
  lotCode: string;
  productDisplayName?: string;
}): TodayTaskRecord {
  return {
    id: input.id,
    activeKey: `${input.lotId}:critical:check_presence:root`,
    lotId: input.lotId,
    productDisplayName: input.productDisplayName ?? "Alface FICTICIA",
    lotIdentity: {
      identitySource: "printed",
      value: input.lotCode,
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: "critical",
    severity: "high",
    dueBucket: "shift",
    requiredResolution: "check_presence",
    section: "check_sales_area",
    ownerLabel: "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "critical",
      reasons: [{ code: "expires_in_3_days", field: "expiresAt" }],
    },
    priority: 1,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

describe("today task fixtures", () => {
  it("keeps repeated products visible as separate fictitious lot tasks", () => {
    const first = todayTaskFixture({
      id: "tarefa-ficticia-alface-001",
      lotId: "lote-ficticio-alface-001",
      lotCode: "ALFACE-FICTICIA-001",
    });
    const second = todayTaskFixture({
      id: "tarefa-ficticia-alface-002",
      lotId: "lote-ficticio-alface-002",
      lotCode: "ALFACE-FICTICIA-002",
    });

    expect(first.productDisplayName).toBe(second.productDisplayName);
    expect(first.lotId).not.toBe(second.lotId);
    expect(first.lotIdentity.value).not.toBe(second.lotIdentity.value);
    expect([first, second].every((task) => task.productDisplayName.includes("FICTICIA"))).toBe(
      true,
    );
  });
});
