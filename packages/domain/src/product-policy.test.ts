import { describe, expect, it } from "vitest";
import { calculateLotRisk } from "./risk";
import {
  resolveProductOperationalPolicy,
  STORE_PRESENTATION_KINDS,
  type StorePresentationKind,
} from "./product-policy";
import { PRODUCT_MODES, type CategoryRuleProfile, type ProductMode } from "./types";

const formalCategory: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-validade",
  mode: "formal_validity",
  windows: {
    radarDays: 20,
    markdownDays: 7,
    criticalDays: 1,
    expiredDays: 0,
  },
};

describe("product operational policy", () => {
  it.each(STORE_PRESENTATION_KINDS)("maps %s to one existing ProductMode", (storePresentation) => {
    const policy = resolveProductOperationalPolicy({
      storePresentation,
      categoryRuleProfile: formalCategory,
    });

    expect(PRODUCT_MODES).toContain(policy.mode);
  });

  it.each([
    ["loose_whole", "flv_inspection", false, "quality_inspection"],
    ["supplier_packaged", "formal_validity", true, "printed_validity"],
    ["store_cut_ped", "processed_repack_loss", false, "internal_repack_loss"],
    ["store_fractioned_repacked", "processed_repack_loss", false, "internal_repack_loss"],
    ["prepared_ready_to_eat", "processed_repack_loss", false, "internal_repack_loss"],
    ["eggs", "formal_validity", true, "printed_validity"],
    ["industrial_chilled_validity", "formal_validity", true, "printed_validity"],
    ["unknown_other", "receiving_monitored", false, "conservative_review"],
  ] as const)(
    "resolves %s into bounded mode and public policy",
    (storePresentation, mode, allowMarkdown, publicPolicyKey) => {
      expect(
        resolveProductOperationalPolicy({
          storePresentation,
          categoryRuleProfile: formalCategory,
        }),
      ).toMatchObject({
        mode,
        allowMarkdown,
        publicPolicyKey,
      });
    },
  );

  it("keeps unknown-other conservative and pending central review", () => {
    const policy = resolveProductOperationalPolicy({
      storePresentation: "unknown_other",
      categoryRuleProfile: formalCategory,
    });

    expect(policy).toMatchObject({
      mode: "receiving_monitored",
      allowMarkdown: false,
      requiresCentralReview: true,
      requiredLotFields: ["receivedAt"],
      defaultMarkdownDays: null,
    });
  });

  it("lets product windows override category markdown windows for formal policies", () => {
    const policy = resolveProductOperationalPolicy({
      storePresentation: "industrial_chilled_validity",
      categoryRuleProfile: formalCategory,
      productRuleOverride: {
        windows: {
          markdownDays: 30,
        },
      },
    });

    expect(policy).toMatchObject({
      mode: "formal_validity",
      allowMarkdown: true,
      defaultMarkdownDays: 30,
    });
  });

  it("allows supplier-packaged markdown before expiry but denies it for store-cut PED", () => {
    const supplierPolicy = resolveProductOperationalPolicy({
      storePresentation: "supplier_packaged",
      categoryRuleProfile: formalCategory,
    });
    const pedPolicy = resolveProductOperationalPolicy({
      storePresentation: "store_cut_ped",
      categoryRuleProfile: formalCategory,
    });

    expect(riskForPolicy(supplierPolicy.mode, "2030-01-05").state).toBe("markdown_due");
    expect(riskForPolicy(supplierPolicy.mode, "2030-01-05").command).toBe("request_markdown");
    expect(riskForPolicy(pedPolicy.mode, "2030-01-05").state).toBe("radar");
    expect(riskForPolicy(pedPolicy.mode, "2030-01-05").command).toBe("monitor");
  });

  it("does not let a product override enable automatic markdown for conservative classifiers", () => {
    const policy = resolveProductOperationalPolicy({
      storePresentation: "prepared_ready_to_eat",
      categoryRuleProfile: formalCategory,
      productRuleOverride: {
        mode: "formal_validity",
        windows: {
          markdownDays: 30,
        },
      },
    });

    expect(policy.mode).toBe("formal_validity");
    expect(policy.allowMarkdown).toBe(false);
    expect(policy.defaultMarkdownDays).toBeNull();
  });
});

function riskForPolicy(mode: ProductMode, expiresAt: string) {
  return calculateLotRisk({
    currentDate: "2030-01-01",
    categoryProfile: {
      categoryId: "categoria-ficticia-politica",
      mode,
      windows: {
        radarDays: 20,
        markdownDays: 7,
        criticalDays: 1,
        expiredDays: 0,
      },
    },
    lot: {
      mode: mode === "formal_validity" ? "formal_validity" : "processed_repack_loss",
      productId: "produto-ficticio-politica-001",
      lotCode: "LOTE-FICTICIO-POLITICA-001",
      expiresAt,
    },
  });
}

type ExhaustiveStorePresentation = StorePresentationKind;

const _storePresentationCoverage: readonly ExhaustiveStorePresentation[] = STORE_PRESENTATION_KINDS;
