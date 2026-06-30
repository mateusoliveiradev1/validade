import {
  resolveProductOperationalPolicy,
  type CategoryRuleProfile,
  type ProductOperationalPolicy,
  type ProductOperationalPolicyInput,
  type RiskWindows,
} from "@validade-zero/domain";
import { productPolicyPreviewTerms, productPolicyPublicLabels } from "./capture-copy";
import type { CaptureProductRecord } from "./repository";

export function productPolicyPreview(policy: ProductOperationalPolicy): string {
  if (policy.publicPolicyKey === "conservative_review") {
    return "Politica conservadora: conferir com a lideranca. Sem rebaixa automatica.";
  }

  if (policy.publicPolicyKey === "quality_inspection") {
    return `Politica: ${productPolicyPublicLabels.quality_inspection}. Proxima acao: ${productPolicyPreviewTerms.qualityCheck}.`;
  }

  if (policy.publicPolicyKey === "internal_repack_loss") {
    return `Politica: validade curta da loja. Proxima acao: ${productPolicyPreviewTerms.repackLoss} ou ${productPolicyPreviewTerms.withdrawLoss}.`;
  }

  return `Politica: ${productPolicyPublicLabels.printed_validity}. Proxima acao: ${policy.allowMarkdown ? productPolicyPreviewTerms.requestMarkdown : productPolicyPreviewTerms.radar}.`;
}

export function productPolicyPreviewForProduct(product: CaptureProductRecord): string {
  const policy = resolveProductPolicyForProduct(product);

  if (policy === undefined) {
    return "Cadastro existente: confira validade e lote fisico antes de prosseguir.";
  }

  return productPolicyPreview(policy);
}

export function toDomainCategoryRuleProfile(
  profile: CaptureProductRecord["categoryRuleProfile"],
): CategoryRuleProfile {
  const windows = normalizeRiskWindows(profile.windows);

  return {
    categoryId: profile.categoryId,
    mode: profile.mode,
    ...(windows === undefined ? {} : { windows }),
    ...(profile.maxPhysicalConfirmationAgeHours === undefined
      ? {}
      : { maxPhysicalConfirmationAgeHours: profile.maxPhysicalConfirmationAgeHours }),
  };
}

function resolveProductPolicyForProduct(
  product: CaptureProductRecord,
): ProductOperationalPolicy | undefined {
  if (product.storePresentation === undefined) {
    return undefined;
  }

  const productRuleOverride = productRuleOverrideFor(product);

  return resolveProductOperationalPolicy({
    storePresentation: product.storePresentation,
    categoryRuleProfile: toDomainCategoryRuleProfile(product.categoryRuleProfile),
    ...(productRuleOverride === undefined ? {} : { productRuleOverride }),
  });
}

function productRuleOverrideFor(
  product: CaptureProductRecord,
): ProductOperationalPolicyInput["productRuleOverride"] | undefined {
  const override = product.productRuleOverride;

  if (override === undefined || (override.mode === undefined && override.windows === undefined)) {
    return undefined;
  }

  const windows = normalizeRiskWindows(override.windows);

  return {
    ...(override.mode === undefined ? {} : { mode: override.mode }),
    ...(windows === undefined ? {} : { windows }),
  };
}

function normalizeRiskWindows(
  windows: CaptureProductRecord["categoryRuleProfile"]["windows"] | undefined,
): Partial<RiskWindows> | undefined {
  if (windows === undefined) {
    return undefined;
  }

  const normalized: Partial<RiskWindows> = {
    ...(windows.radarDays === undefined ? {} : { radarDays: windows.radarDays }),
    ...(windows.markdownDays === undefined ? {} : { markdownDays: windows.markdownDays }),
    ...(windows.criticalDays === undefined ? {} : { criticalDays: windows.criticalDays }),
    ...(windows.expiredDays === undefined ? {} : { expiredDays: windows.expiredDays }),
    ...(windows.qualityWindowDays === undefined
      ? {}
      : { qualityWindowDays: windows.qualityWindowDays }),
  };

  return Object.keys(normalized).length === 0 ? undefined : normalized;
}
