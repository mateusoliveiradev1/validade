import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  LotIdentitySchema,
  OperationalLocationSchema,
  PhysicalObservationInputSchema,
} from "@validade-zero/contracts";
import { describe, expect, it } from "vitest";

const categoryRuleProfile = {
  categoryId: "categoria-ficticia-ovos",
  mode: "formal_validity" as const,
  windows: {
    radarDays: 60,
    markdownDays: 15,
    criticalDays: 3,
    expiredDays: 0,
  },
};

const product = {
  displayName: "Ovos Brancos Exemplo FICTICIO",
  categoryId: "categoria-ficticia-ovos",
  categoryRuleProfile,
};

const printedIdentity = {
  identitySource: "printed" as const,
  value: "LOTE-FICTICIO-OVOS-001",
};

const initialLocation = {
  kind: "area_de_venda" as const,
};

describe("capture contracts", () => {
  it("accepts the required product, lot, location, and observation facts", () => {
    expect(CaptureProductInputSchema.safeParse(product).success).toBe(true);
    expect(
      CaptureLotInputSchema.safeParse({
        productId: "produto-ficticio-ovos-001",
        identity: printedIdentity,
        mode: "formal_validity",
        expiresAt: "2030-01-15",
        approximateQuantity: 12,
        initialLocation,
      }).success,
    ).toBe(true);
    expect(
      PhysicalObservationInputSchema.safeParse({
        status: "present",
        actorLabel: "Colaboradora Exemplo FICTICIA",
        occurredAt: "2030-01-10T10:30:00.000Z",
        location: initialLocation,
        quantityState: "estimated",
        approximateQuantity: 11,
        isCorrection: false,
      }).success,
    ).toBe(true);
  });

  it("rejects incomplete products and mode-specific lots", () => {
    expect(CaptureProductInputSchema.safeParse({ categoryId: product.categoryId }).success).toBe(
      false,
    );
    expect(
      CaptureLotInputSchema.safeParse({
        productId: "produto-ficticio-ovos-001",
        identity: printedIdentity,
        mode: "formal_validity",
        approximateQuantity: 12,
        initialLocation,
      }).success,
    ).toBe(false);
    expect(
      CaptureLotInputSchema.safeParse({
        productId: "produto-ficticio-maca-001",
        identity: printedIdentity,
        mode: "flv_inspection",
        receivedAt: "2030-01-10",
        approximateQuantity: 8,
        initialLocation,
      }).success,
    ).toBe(false);
    expect(
      CaptureLotInputSchema.safeParse({
        productId: "produto-ficticio-cebola-001",
        identity: printedIdentity,
        mode: "receiving_monitored",
        approximateQuantity: 5,
        initialLocation,
      }).success,
    ).toBe(false);
  });

  it("requires a name for another location and an unambiguous lot identity", () => {
    expect(OperationalLocationSchema.safeParse({ kind: "other" }).success).toBe(false);
    expect(
      LotIdentitySchema.safeParse({
        identitySource: "printed",
        value: "LOTE-FICTICIO-001",
        generatedInternalId: "INTERNO-FICTICIO-001",
      }).success,
    ).toBe(false);
    expect(
      LotIdentitySchema.safeParse({
        identitySource: "generated_internal",
        value: "INTERNO-FICTICIO-001",
      }).success,
    ).toBe(true);
  });

  it("preserves quantity uncertainty and requires a reason for corrections", () => {
    const uncertainObservation = {
      status: "not_found" as const,
      actorLabel: "Colaboradora Exemplo FICTICIA",
      occurredAt: "2030-01-10T10:35:00.000Z",
      location: { kind: "estoque" as const },
      quantityState: "not_estimable" as const,
      isCorrection: false,
    };

    expect(PhysicalObservationInputSchema.safeParse(uncertainObservation).success).toBe(true);
    expect(
      PhysicalObservationInputSchema.safeParse({
        ...uncertainObservation,
        isCorrection: true,
      }).success,
    ).toBe(false);
    expect(
      PhysicalObservationInputSchema.safeParse({
        ...uncertainObservation,
        isCorrection: true,
        correctionReason: "Quantidade registrada incorretamente na conferencia FICTICIA.",
      }).success,
    ).toBe(true);
  });
});
