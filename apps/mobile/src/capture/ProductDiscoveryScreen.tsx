import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ProductIdentifierInput } from "@validade-zero/contracts";
import {
  productCatalogItemToLocalRecord,
  productDraftToLocalRecord,
  type CaptureProductCategory,
  type CaptureProductRecord,
  type CaptureRepository,
} from "./repository";
import { captureCopy, productLotFlowCopy } from "./capture-copy";
import { productPolicyPreviewForProduct } from "./product-policy-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export function ProductDiscoveryScreen({
  repository,
  onConfirmProduct,
  onCreateProduct,
  onScanCode,
  onOpenRecent,
  initialLookup,
  initialLookupSource,
}: {
  repository: CaptureRepository;
  onConfirmProduct: (product: CaptureProductRecord) => void;
  onCreateProduct: (initial?: {
    gtin?: string | undefined;
    identifier?: ProductIdentifierInput | undefined;
  }) => void;
  onScanCode?: (() => void) | undefined;
  onOpenRecent?: (() => void) | undefined;
  initialLookup?: string | undefined;
  initialLookupSource?: "scan" | undefined;
}) {
  const [query, setQuery] = useState(initialLookup ?? "");
  const [matches, setMatches] = useState<readonly CaptureProductRecord[]>([]);
  const [categories, setCategories] = useState<readonly CaptureProductCategory[]>([]);
  const [candidate, setCandidate] = useState<CaptureProductRecord | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [createGate, setCreateGate] = useState<"hidden" | "no_safe_reuse" | "similar_reviewed">(
    "hidden",
  );

  async function searchManually(): Promise<void> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      setMatches([]);
      setCategories([]);
      setCandidate(undefined);
      setCreateGate("hidden");
      setMessage(captureCopy.noMatch);
      return;
    }

    setIsSearching(true);

    try {
      if (repository.searchCentralProducts !== undefined) {
        const response = await repository.searchCentralProducts({
          requestedAt: new Date().toISOString(),
          ...centralProductLookupPayload(trimmedQuery, initialLookupSource),
        });
        const results = [
          ...response.reusableProducts.map(productCatalogItemToLocalRecord),
          ...response.similarCandidates.map(productCatalogItemToLocalRecord),
          ...(response.draft === undefined ? [] : [productDraftToLocalRecord(response.draft)]),
        ];

        setProductResults(
          results,
          createGateForSearchState(response.resultState),
          searchResultMessage(response.resultState),
        );
        return;
      }

      const results = await repository.findProducts(trimmedQuery);
      setProductResults(
        results,
        results.length === 0 ? "no_safe_reuse" : "hidden",
        results.length === 0
          ? captureCopy.noMatch
          : "Produto encontrado. Confirme o cadastro correto antes de informar o lote fisico.",
      );
    } catch {
      const localResults = await repository.findProducts(trimmedQuery).catch(() => []);

      if (localResults.length > 0) {
        setProductResults(
          localResults,
          "hidden",
          "Nao foi possivel consultar a central agora. Use apenas produto ja salvo neste aparelho.",
        );
        return;
      }

      setMatches([]);
      setCategories([]);
      setCandidate(undefined);
      setCreateGate("hidden");
      setMessage(
        "Nao foi possivel consultar a central agora. Atualize a leitura central antes de cadastrar para evitar duplicidade.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function openCreateProduct(): void {
    onCreateProduct(createProductInitialIdentifier(query.trim(), initialLookupSource));
  }

  async function showFrequentProducts(): Promise<void> {
    if (repository.listFrequentProducts === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    try {
      const results = await repository.listFrequentProducts();
      setProductResults(
        results,
        "hidden",
        results.length === 0 ? captureCopy.frequentEmpty : captureCopy.frequentResults,
      );
    } catch {
      setMessage("Nao foi possivel carregar frequentes agora. Tente a busca manual.");
    }
  }

  async function chooseCategory(): Promise<void> {
    if (repository.listProductCategories === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    try {
      const nextCategories = await repository.listProductCategories();
      setCategories(nextCategories);
      setMatches([]);
      setCandidate(undefined);
      setCreateGate("hidden");
      setMessage(
        nextCategories.length === 0 ? captureCopy.categoryEmpty : captureCopy.categoryPrompt,
      );
    } catch {
      setMessage("Nao foi possivel carregar categorias agora. Atualize a leitura central.");
    }
  }

  async function showProductsByCategory(categoryId: string): Promise<void> {
    if (repository.findProductsByCategory === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    try {
      const results = await repository.findProductsByCategory(categoryId);
      setProductResults(
        results,
        "hidden",
        results.length === 0 ? captureCopy.noMatch : captureCopy.categoryResults,
      );
    } catch {
      setMessage("Nao foi possivel carregar produtos desta categoria agora.");
    }
  }

  function setProductResults(
    results: readonly CaptureProductRecord[],
    gate: "hidden" | "no_safe_reuse" | "similar_reviewed",
    nextMessage: string,
  ): void {
    setMatches(results);
    setCategories([]);
    setCandidate(results.length === 1 ? results[0] : undefined);
    setCreateGate(gate);
    setMessage(nextMessage);
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={captureCopy.discoveryTitle} body={captureCopy.discoveryBody} />
      <StatusNotice title={productLotFlowCopy.title}>{productLotFlowCopy.body}</StatusNotice>
      <Field
        label="Buscar produto por nome, codigo ou categoria"
        value={query}
        onChangeText={setQuery}
        placeholder="Ex.: alface ou 7890000000001"
      />
      <PrimaryAction
        disabled={isSearching}
        label={isSearching ? "Buscando produto" : captureCopy.manualSearch}
        onPress={() => void searchManually()}
      />
      {onScanCode === undefined ? null : (
        <SecondaryAction label="Ler codigo" onPress={onScanCode} />
      )}
      <View style={styles.shortcuts}>
        <SecondaryAction label={captureCopy.recent} onPress={onOpenRecent ?? (() => undefined)} />
        <SecondaryAction
          disabled={isSearching}
          label={captureCopy.frequent}
          onPress={() => void showFrequentProducts()}
        />
        <SecondaryAction
          disabled={isSearching}
          label={captureCopy.byCategory}
          onPress={() => void chooseCategory()}
        />
      </View>
      {createGate === "no_safe_reuse" ? (
        <SecondaryAction label={captureCopy.createProduct} onPress={openCreateProduct} />
      ) : null}
      {createGate === "similar_reviewed" ? (
        <SecondaryAction label="Continuar cadastro apos revisar" onPress={openCreateProduct} />
      ) : null}
      {message === undefined ? null : <StatusNotice>{message}</StatusNotice>}
      {categories.map((category) => (
        <SelectionRow
          key={category.categoryId}
          label={category.categoryName}
          detail={categoryShortcutDetail(category)}
          onPress={() => void showProductsByCategory(category.categoryId)}
        />
      ))}
      {matches.map((product) => (
        <SelectionRow
          key={product.id}
          label={product.displayName}
          detail={productDetail(product)}
          selected={candidate?.id === product.id}
          onPress={() => setCandidate(product)}
        />
      ))}
      {candidate === undefined ? null : (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationTitle}>{candidate.displayName}</Text>
          <Text style={styles.metadata}>
            Categoria: {candidate.categoryName ?? candidate.categoryId}
          </Text>
          <StatusNotice title="Politica do lote">
            {productPolicyPreviewForProduct(candidate)}
          </StatusNotice>
          {candidate.reviewStatus === "pending_review" ? (
            <StatusNotice tone="warning" title={productLotFlowCopy.draftProductTitle}>
              {productLotFlowCopy.draftProductBody}
            </StatusNotice>
          ) : (
            <StatusNotice title={productLotFlowCopy.centralProductTitle}>
              {productLotFlowCopy.centralProductBody}
            </StatusNotice>
          )}
          <PrimaryAction label="Usar este produto" onPress={() => onConfirmProduct(candidate)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  shortcuts: {
    gap: captureSpacing.small,
  },
  confirmation: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  confirmationTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});

function searchResultMessage(
  state: "reuse_available" | "similar_requires_review" | "draft_pending_review" | "no_safe_reuse",
): string {
  if (state === "reuse_available") {
    return "Produto do catalogo central encontrado. Use este cadastro antes de criar outro.";
  }

  if (state === "similar_requires_review") {
    return "Produtos parecidos encontrados. Confira antes de cadastrar um produto novo.";
  }

  if (state === "draft_pending_review") {
    return "Cadastro em revisao central. Voce pode registrar o lote, mas o produto ainda precisa de validacao.";
  }

  return captureCopy.noMatch;
}

function createGateForSearchState(
  state: "reuse_available" | "similar_requires_review" | "draft_pending_review" | "no_safe_reuse",
): "hidden" | "no_safe_reuse" | "similar_reviewed" {
  if (state === "no_safe_reuse") {
    return "no_safe_reuse";
  }

  if (state === "similar_requires_review") {
    return "similar_reviewed";
  }

  return "hidden";
}

function productDetail(product: CaptureProductRecord): string {
  const category = product.categoryName ?? product.categoryId;

  if (product.reviewStatus === "pending_review") {
    return `${category} - cadastro em revisao central`;
  }

  if (product.catalogSource === "central") {
    return `${category} - catalogo central`;
  }

  return category;
}

function centralProductLookupPayload(
  value: string,
  source: "scan" | undefined,
): { query: string } | { gtin: string } | { identifier: ProductIdentifierInput } {
  if (/^\d{8,14}$/.test(value)) {
    return { gtin: value };
  }

  if (source === "scan") {
    return { identifier: { type: "barcode", value } };
  }

  return { query: value };
}

function createProductInitialIdentifier(
  value: string,
  source: "scan" | undefined,
): { gtin?: string | undefined; identifier?: ProductIdentifierInput | undefined } | undefined {
  if (value.length === 0) return undefined;

  if (/^\d{8,14}$/.test(value)) {
    return {
      gtin: value,
      identifier: { type: "gtin", value },
    };
  }

  if (source === "scan") {
    return { identifier: { type: "barcode", value } };
  }

  return undefined;
}

function categoryShortcutDetail(category: CaptureProductCategory): string {
  if (category.productCount === 0) {
    return "catalogo geral";
  }

  return `${category.productCount} ${
    category.productCount === 1 ? "produto local" : "produtos locais"
  }`;
}
