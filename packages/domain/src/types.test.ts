import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_COMMANDS,
  PRODUCT_MODES,
  RISK_REASON_CODES,
  RISK_STATES,
  type FlvInspectionLotInput,
  type FormalValidityLotInput,
  type LotInput,
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
      "request_markdown",
      "withdraw_now",
      "monitor",
      "correct_data",
    ]);
    expect(RISK_REASON_CODES).toEqual([
      "missing_required_date",
      "missing_received_date",
      "missing_quality_window",
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
      receivedOn: "2030-01-10",
      qualityWindowDays: 4,
    };

    expect(modeForLot(formalValidityLot)).toBe("formal_validity");
    expect(modeForLot(flvInspectionLot)).toBe("flv_inspection");
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
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        categoryId: "categoria-ficticia-flv",
        displayName: "Maca Ficticia de Teste",
        lotRequirements: {
          receivedOn: true,
          qualityWindowDays: true,
        },
      },
    ];

    expect(products.map((product) => product.mode)).toEqual([
      "formal_validity",
      "flv_inspection",
    ]);
    expect(products[0]?.lotRequirements).toEqual({ expiresAt: true });
    expect(products[1]?.lotRequirements).toEqual({
      receivedOn: true,
      qualityWindowDays: true,
    });
  });
});
