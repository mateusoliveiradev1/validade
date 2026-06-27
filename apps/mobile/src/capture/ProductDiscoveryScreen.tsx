import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  productCatalogItemToLocalRecord,
  productDraftToLocalRecord,
  type CaptureProductCategory,
  type CaptureProductRecord,
  type CaptureRepository,
} from "./repository";
import { captureCopy, productModeLabels } from "./capture-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";

export function ProductDiscoveryScreen({
  repository,
  onConfirmProduct,
  onCreateProduct,
  onScanCode,
  onOpenRecent,
  initialLookup,
}: {
  repository: CaptureRepository;
  onConfirmProduct: (product: CaptureProductRecord) => void;
  onCreateProduct: (initialGtin?: string) => void;
  onScanCode?: (() => void) | undefined;
  onOpenRecent?: (() => void) | undefined;
  initialLookup?: string | undefined;
}) {
  const [query, setQuery] = useState(initialLookup ?? "");
  const [matches, setMatches] = useState<readonly CaptureProductRecord[]>([]);
  const [categories, setCategories] = useState<readonly CaptureProductCategory[]>([]);
  const [candidate, setCandidate] = useState<CaptureProductRecord | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  async function searchManually(): Promise<void> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      setMatches([]);
      setCategories([]);
      setCandidate(undefined);
      setMessage(captureCopy.noMatch);
      return;
    }

    if (repository.searchCentralProducts !== undefined) {
      const response = await repository.searchCentralProducts({
        requestedAt: new Date().toISOString(),
        ...(/^\d{8,14}$/.test(trimmedQuery) ? { gtin: trimmedQuery } : { query: trimmedQuery }),
      });
      const results = [
        ...response.reusableProducts.map(productCatalogItemToLocalRecord),
        ...response.similarCandidates.map(productCatalogItemToLocalRecord),
        ...(response.draft === undefined ? [] : [productDraftToLocalRecord(response.draft)]),
      ];

      setMatches(results);
      setCategories([]);
      setCandidate(undefined);
      setMessage(searchResultMessage(response.resultState));
      return;
    }

    const results = await repository.findProducts(query);
    setMatches(results);
    setCategories([]);
    setCandidate(undefined);
    setMessage(
      results.length === 0
        ? captureCopy.noMatch
        : "Selecione o produto e confirme antes de informar o lote.",
    );
  }

  function openCreateProduct(): void {
    const code = /^\d{8,}$/.test(query.trim()) ? query.trim() : undefined;

    onCreateProduct(code);
  }

  async function showFrequentProducts(): Promise<void> {
    if (repository.listFrequentProducts === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    const results = await repository.listFrequentProducts();
    setMatches(results);
    setCategories([]);
    setCandidate(undefined);
    setMessage(results.length === 0 ? captureCopy.frequentEmpty : captureCopy.frequentResults);
  }

  async function chooseCategory(): Promise<void> {
    if (repository.listProductCategories === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    const nextCategories = await repository.listProductCategories();
    setCategories(nextCategories);
    setMatches([]);
    setCandidate(undefined);
    setMessage(
      nextCategories.length === 0 ? captureCopy.categoryEmpty : captureCopy.categoryPrompt,
    );
  }

  async function showProductsByCategory(categoryId: string): Promise<void> {
    if (repository.findProductsByCategory === undefined) {
      setMessage(captureCopy.shortcutUnavailable);
      return;
    }

    const results = await repository.findProductsByCategory(categoryId);
    setCategories([]);
    setMatches(results);
    setCandidate(undefined);
    setMessage(results.length === 0 ? captureCopy.noMatch : captureCopy.categoryResults);
  }

  const resolvedMode =
    candidate?.productRuleOverride?.mode ??
    candidate?.categoryRuleProfile.mode ??
    "formal_validity";

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={captureCopy.discoveryTitle} body={captureCopy.discoveryBody} />
      <Field
        label="Buscar produto por nome, codigo ou categoria"
        value={query}
        onChangeText={setQuery}
        placeholder="Ex.: alface ou 7890000000001"
      />
      <PrimaryAction label={captureCopy.manualSearch} onPress={() => void searchManually()} />
      {onScanCode === undefined ? null : (
        <SecondaryAction label="Ler código" onPress={onScanCode} />
      )}
      <View style={styles.shortcuts}>
        <SecondaryAction label={captureCopy.recent} onPress={onOpenRecent ?? (() => undefined)} />
        <SecondaryAction label={captureCopy.frequent} onPress={() => void showFrequentProducts()} />
        <SecondaryAction label={captureCopy.byCategory} onPress={() => void chooseCategory()} />
      </View>
      {message === undefined ? null : <StatusNotice>{message}</StatusNotice>}
      {categories.map((category) => (
        <SelectionRow
          key={category.categoryId}
          label={category.categoryId}
          detail={`${category.productCount} ${category.productCount === 1 ? "produto" : "produtos"}`}
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
      {matches.length === 0 && message === captureCopy.noMatch ? (
        <PrimaryAction label={captureCopy.createProduct} onPress={openCreateProduct} />
      ) : null}
      {candidate === undefined ? null : (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationTitle}>{candidate.displayName}</Text>
          <Text style={styles.metadata}>
            Categoria: {candidate.categoryName ?? candidate.categoryId}
          </Text>
          <Text style={styles.metadata}>Perfil operacional: {resolvedMode}</Text>
          <Text style={styles.metadata}>Modo de trabalho: {productModeLabels[resolvedMode]}</Text>
          {candidate.reviewStatus === "pending_review" ? (
            <StatusNotice>
              Produto em rascunho. O lote entra com risco conservador ate a validacao.
            </StatusNotice>
          ) : null}
          <PrimaryAction label="Usar este produto" onPress={() => onConfirmProduct(candidate)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F5F7EF",
    gap: 16,
    padding: 16,
  },
  shortcuts: {
    gap: 8,
  },
  confirmation: {
    backgroundColor: "#E6EEE4",
    gap: 8,
    padding: 16,
  },
  confirmationTitle: {
    color: "#112016",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  metadata: {
    color: "#3F5546",
    fontSize: 14,
    lineHeight: 20,
  },
});

function searchResultMessage(
  state: "reuse_available" | "similar_requires_review" | "draft_pending_review" | "no_safe_reuse",
): string {
  if (state === "reuse_available") {
    return "Produto central encontrado. Use este produto antes de cadastrar outro.";
  }

  if (state === "similar_requires_review") {
    return "Produtos parecidos encontrados. Confira antes de criar rascunho operacional.";
  }

  if (state === "draft_pending_review") {
    return "Produto em rascunho. O lote entra com risco conservador ate a validacao.";
  }

  return captureCopy.noMatch;
}

function productDetail(product: CaptureProductRecord): string {
  const category = product.categoryName ?? product.categoryId;

  if (product.reviewStatus === "pending_review") {
    return `${category} - rascunho em revisao`;
  }

  if (product.catalogSource === "central") {
    return `${category} - catalogo central`;
  }

  return category;
}
