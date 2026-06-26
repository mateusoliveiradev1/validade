import { describe, expect, it } from "vitest";
import { CaptureLotInputSchema, CaptureProductInputSchema } from "./capture";

describe("capture runtime contracts", () => {
  it("accepts processed lots only with a validity date for repack-or-loss handling", () => {
    expect(
      CaptureLotInputSchema.parse({
        productId: "produto-processado-ficticio-001",
        mode: "processed_repack_loss",
        identity: {
          identitySource: "printed",
          value: "MELANCIA-PROC-FICTICIA-001",
        },
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
        expiresAt: "2030-01-10",
        receivedAt: "2030-01-09",
      }),
    ).toMatchObject({
      mode: "processed_repack_loss",
      expiresAt: "2030-01-10",
    });

    expect(() =>
      CaptureLotInputSchema.parse({
        productId: "produto-processado-ficticio-001",
        mode: "processed_repack_loss",
        identity: {
          identitySource: "printed",
          value: "MELANCIA-PROC-FICTICIA-001",
        },
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
        receivedAt: "2030-01-09",
      }),
    ).toThrow();
  });

  it("allows processed category rule profiles without reusing the FLV inspection mode", () => {
    expect(
      CaptureProductInputSchema.parse({
        displayName: "Melancia processada FICTICIA",
        categoryId: "processados-ficticios",
        categoryRuleProfile: {
          categoryId: "processados-ficticios",
          mode: "processed_repack_loss",
          windows: {
            radarDays: 7,
            markdownDays: 0,
            criticalDays: 1,
            expiredDays: 0,
          },
        },
      }),
    ).toMatchObject({
      categoryRuleProfile: {
        mode: "processed_repack_loss",
      },
    });
  });
});
