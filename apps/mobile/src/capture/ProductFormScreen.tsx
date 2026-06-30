import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { ProductMode } from "@validade-zero/domain";
import type { ProductIdentifierInput, ProductSearchCandidate } from "@validade-zero/contracts";
import {
  productCatalogItemToLocalRecord,
  productDraftToLocalRecord,
  type CaptureProductCategory,
  type CaptureProductRecord,
  type CaptureRepository,
} from "./repository";
import { captureCopy, productLotFlowCopy, productModeLabels } from "./capture-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureSpacing } from "./capture-theme";

export function ProductFormScreen({
  repository,
  initialGtin,
  initialIdentifier,
  onCreated,
  onBack,
}: {
  repository: CaptureRepository;
  initialGtin?: string;
  initialIdentifier?: ProductIdentifierInput;
  onCreated: (product: CaptureProductRecord) => void;
  onBack: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [categories, setCategories] = useState<readonly CaptureProductCategory[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [supplierName, setSupplierName] = useState("");
  const [gtin, setGtin] = useState(initialGtin ?? "");
  const [categoryLoadState, setCategoryLoadState] = useState<"loading" | "ready" | "error">(
    repository.listProductCategories === undefined ? "error" : "loading",
  );
  const [overrideMode, setOverrideMode] = useState<ProductMode | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [similarCandidates, setSimilarCandidates] = useState<readonly ProductSearchCandidate[]>([]);
  const linkedIdentifier =
    initialIdentifier ??
    (initialGtin === undefined
      ? undefined
      : ({
          type: "gtin",
          value: initialGtin,
        } satisfies ProductIdentifierInput));

  useEffect(() => {
    let active = true;

    async function loadCategories(): Promise<void> {
      if (repository.listProductCategories === undefined) {
        setCategoryLoadState("error");
        return;
      }

      try {
        const nextCategories = await repository.listProductCategories();
        if (!active) return;
        setCategories(nextCategories);
        setSelectedCategoryId((current) =>
          current === undefined ||
          nextCategories.some((category) => category.categoryId === current)
            ? current
            : undefined,
        );
        setCategoryLoadState("ready");
      } catch {
        if (active) setCategoryLoadState("error");
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [repository]);

  const selectedCategory = categories.find(
    (category) => category.categoryId === selectedCategoryId,
  );
  const filteredCategories = useMemo(() => {
    const query = normalizeCategoryLookup(categoryQuery);

    if (query.length === 0) return categories;

    return categories.filter(
      (category) =>
        normalizeCategoryLookup(category.categoryName).includes(query) ||
        normalizeCategoryLookup(category.categoryId).includes(query),
    );
  }, [categories, categoryQuery]);
  const canCreate = displayName.trim().length > 0 && selectedCategory !== undefined;

  async function createProduct(): Promise<void> {
    if (selectedCategory === undefined) {
      setError("Escolha uma categoria do catalogo geral antes de criar o produto.");
      return;
    }

    if (!canCreate) {
      setError("Informe nome do produto e categoria para enviar o cadastro a revisao central.");
      return;
    }

    try {
      const categoryRuleProfile = selectedCategory.categoryRuleProfile;

      if (repository.createProductDraft !== undefined) {
        const response = await repository.createProductDraft({
          displayName,
          categoryId: selectedCategory.categoryId,
          categoryName: selectedCategory.categoryName,
          categoryRuleProfile,
          requestedAt: new Date().toISOString(),
          ...(supplierName.trim().length === 0 ? {} : { supplierName }),
          ...(gtin.trim().length === 0 ? {} : { gtin }),
          ...(linkedIdentifier === undefined ? {} : { identifiers: [linkedIdentifier] }),
          similarCandidateIds: similarCandidates.map((candidate) => candidate.centralProductId),
        });

        if (response.outcome === "reuse_existing" && response.reusableProduct !== undefined) {
          onCreated(productCatalogItemToLocalRecord(response.reusableProduct));
          return;
        }

        if (response.outcome === "similar_found") {
          setSimilarCandidates(response.similarCandidates);
          setError(undefined);
          setNotice(
            "Produtos parecidos encontrados. Use um existente ou confirme o cadastro novo.",
          );
          return;
        }

        if (response.outcome === "draft_pending_review" && response.draft !== undefined) {
          onCreated(productDraftToLocalRecord(response.draft));
          return;
        }

        setError("Nao foi possivel cadastrar este produto para revisao central.");
        return;
      }

      const product = await repository.createProduct({
        displayName,
        categoryId: selectedCategory.categoryId,
        categoryRuleProfile,
        ...(supplierName.trim().length === 0 ? {} : { supplierName }),
        ...(gtin.trim().length === 0 ? {} : { gtin }),
        ...(overrideMode === undefined ? {} : { productRuleOverride: { mode: overrideMode } }),
      });

      onCreated(product);
    } catch {
      setError(
        "Nao foi possivel cadastrar este produto neste aparelho. Revise os campos e tente novamente.",
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Cadastrar produto novo"
        body="Use esta etapa quando o produto nao existe no catalogo. Depois registre o lote fisico."
      />
      <StatusNotice title={productLotFlowCopy.draftProductTitle}>
        {productLotFlowCopy.draftProductBody}
      </StatusNotice>
      <Field label="Nome do produto" value={displayName} onChangeText={setDisplayName} />
      <Text style={styles.sectionLabel}>Categoria</Text>
      {categories.length > 8 ? (
        <Field
          label="Filtrar categorias"
          value={categoryQuery}
          onChangeText={setCategoryQuery}
          placeholder="Ex.: frutas, ovos, folhosos"
        />
      ) : null}
      {categoryLoadState === "loading" ? (
        <StatusNotice>Carregando catalogo geral de categorias.</StatusNotice>
      ) : null}
      {categoryLoadState === "error" ? (
        <StatusNotice tone="error">
          Nao foi possivel carregar o catalogo geral de categorias neste aparelho.
        </StatusNotice>
      ) : null}
      {categoryLoadState === "ready" && categories.length === 0 ? (
        <StatusNotice tone="error">
          Catalogo geral de categorias vazio. Prepare o turno online antes de criar produtos.
        </StatusNotice>
      ) : null}
      {filteredCategories.map((category) => (
        <SelectionRow
          key={category.categoryId}
          label={category.categoryName}
          detail={categoryDetail(category)}
          selected={selectedCategoryId === category.categoryId}
          onPress={() => {
            setSelectedCategoryId(category.categoryId);
            setOverrideMode(undefined);
            setError(undefined);
          }}
        />
      ))}
      {selectedCategory === undefined ? null : (
        <>
          <StatusNotice>
            Perfil operacional: {productModeLabels[selectedCategory.categoryRuleProfile.mode]}.
          </StatusNotice>
          <SecondaryAction
            label="Definir excecao de perfil"
            onPress={() =>
              setOverrideMode(
                overrideMode === undefined
                  ? firstAlternativeMode(selectedCategory.categoryRuleProfile.mode)
                  : undefined,
              )
            }
          />
        </>
      )}
      {overrideMode === undefined ? null : (
        <>
          <StatusNotice>
            Excecao explicita do produto: {productModeLabels[overrideMode]}.
          </StatusNotice>
          <Text style={styles.sectionLabel}>Perfil especifico deste produto</Text>
          {Object.entries(productModeLabels).map(([mode, label]) => (
            <SelectionRow
              key={`override-${mode}`}
              label={`Usar ${label} como excecao`}
              selected={overrideMode === mode}
              onPress={() => setOverrideMode(mode as ProductMode)}
            />
          ))}
        </>
      )}
      <Field label="Fornecedor opcional" value={supplierName} onChangeText={setSupplierName} />
      {supplierName.trim().length === 0 ? (
        <Text style={styles.pending}>{captureCopy.supplierPending}</Text>
      ) : null}
      <Field label="GTIN opcional" value={gtin} onChangeText={setGtin} keyboardType="numeric" />
      {gtin.trim().length === 0 ? (
        <Text style={styles.pending}>{captureCopy.gtinPending}</Text>
      ) : null}
      {linkedIdentifier !== undefined && linkedIdentifier.type !== "gtin" ? (
        <StatusNotice>{`Codigo lido: ${linkedIdentifier.value}. Ele sera vinculado ao produto.`}</StatusNotice>
      ) : null}
      {notice === undefined ? null : <StatusNotice>{notice}</StatusNotice>}
      {similarCandidates.map((candidate) => (
        <SelectionRow
          key={candidate.centralProductId}
          label={candidate.displayName}
          detail={`${candidate.categoryName} - produto parecido`}
          onPress={() => onCreated(productCatalogItemToLocalRecord(candidate))}
        />
      ))}
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      <PrimaryAction
        label={captureCopy.createProduct}
        disabled={!canCreate}
        onPress={() => void createProduct()}
      />
      <SecondaryAction label={captureCopy.backAndReview} onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  sectionLabel: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  pending: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -captureSpacing.medium,
  },
});

function categoryDetail(category: CaptureProductCategory): string {
  const productCountCopy =
    category.productCount === 0
      ? "catalogo geral"
      : `${category.productCount} ${category.productCount === 1 ? "produto local" : "produtos locais"}`;

  return `${productModeLabels[category.categoryRuleProfile.mode]} - ${productCountCopy}`;
}

function normalizeCategoryLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function firstAlternativeMode(mode: ProductMode): ProductMode {
  if (mode === "formal_validity") {
    return "flv_inspection";
  }

  if (mode === "flv_inspection") {
    return "processed_repack_loss";
  }

  return "formal_validity";
}
