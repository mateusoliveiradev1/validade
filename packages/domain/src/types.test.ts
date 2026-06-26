import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_COMMANDS,
  PRODUCT_MODES,
  RISK_REASON_CODES,
  RISK_STATES,
  type FlvInspectionLotInput,
  type FormalValidityLotInput,
  type LotInput,
  type ProcessedRepackLossLotInput,
  type ProductDefinition,
} from "./types";

function modeForLot(lot: LotInput) {
  return lot.mode;
}

describe("domain product and risk vocabulary", () => {
  it("exports the locked product modes, risk states, commands, and reason codes", () => {
    expect(PRODUCT_MODES).toEqual([
      "formal_validity",
      "flv_inspection",
      "processed_repack_loss",
      "receiving_monitored",
    ]);
    expect(RISK_STATES).toEqual([
      "safe",
      "radar",
      "markdown_due",
      "critical",
      "expired",
      "uncertain",
    ]);
    expect(OPERATIONAL_COMMANDS).toEqual([
      "check_presence",
      "repack_or_loss",
      "request_markdown",
      "withdraw_now",
      "monitor",
      "correct_data",
    ]);
    expect(RISK_REASON_CODES).toEqual([
      "missing_required_date",
      "missing_received_date",
      "missing_quality_window",
      "presence_conditionally_resolved",
      "presence_missing",
      "presence_stale",
      "expired",
      "expires_in_60_days",
      "expires_in_15_days",
      "expires_in_3_days",
    ]);
  });

  it("separates formal-validity lots from FLV quality-inspection lots", () => {
    const formalValidityLot: FormalValidityLotInput = {
      mode: "formal_validity",
      productId: "produto-ficticio-ovos-001",
      lotCode: "LOTE-FICTICIO-OVOS-001",
      expiresAt: "2030-01-15",
    };
    const flvInspectionLot: FlvInspectionLotInput = {
      mode: "flv_inspection",
      productId: "produto-ficticio-maca-001",
      lotCode: "LOTE-FICTICIO-FLV-001",
      receivedAt: "2030-01-10",
      qualityWindowDays: 4,
    };
    const processedLot: ProcessedRepackLossLotInput = {
      mode: "processed_repack_loss",
      productId: "produto-ficticio-melancia-processada-001",
      lotCode: "LOTE-FICTICIO-MELANCIA-001",
      expiresAt: "2030-01-11",
    };

    expect(modeForLot(formalValidityLot)).toBe("formal_validity");
    expect(modeForLot(flvInspectionLot)).toBe("flv_inspection");
    expect(modeForLot(processedLot)).toBe("processed_repack_loss");
    expect(formalValidityLot).toHaveProperty("expiresAt");
    expect(flvInspectionLot).not.toHaveProperty("expiresAt");
    expect(flvInspectionLot).toHaveProperty("qualityWindowDays");
  });

  it("uses discriminated product definitions instead of one optional-date bag", () => {
    const products: ProductDefinition[] = [
      {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        categoryId: "categoria-ficticia-ovos",
        displayName: "Ovos Ficticios Granja Exemplo",
        lotRequirements: {
          expiresAt: true,
        },
      },
      {
        mode: "processed_repack_loss",
        productId: "produto-ficticio-melancia-processada-001",
        categoryId: "categoria-ficticia-processados",
        displayName: "Melancia Processada Ficticia",
        lotRequirements: {
          expiresAt: true,
        },
      },
      {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        categoryId: "categoria-ficticia-flv",
        displayName: "Maca Ficticia de Teste",
        lotRequirements: {
          receivedAt: true,
          qualityWindowDays: true,
        },
      },
    ];

    expect(products.map((product) => product.mode)).toEqual([
      "formal_validity",
      "processed_repack_loss",
      "flv_inspection",
    ]);
    expect(products[0]?.lotRequirements).toEqual({ expiresAt: true });
    expect(products[1]?.lotRequirements).toEqual({ expiresAt: true });
    expect(products[2]?.lotRequirements).toEqual({
      receivedAt: true,
      qualityWindowDays: true,
    });
  });
});
