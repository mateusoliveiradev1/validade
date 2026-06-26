import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { ProductMode } from "@validade-zero/domain";
import type { CaptureProductRecord, CaptureRepository } from "./repository";
import { captureCopy, productModeLabels } from "./capture-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";

const categoryWindows: Record<
  ProductMode,
  {
    radarDays: number;
    markdownDays: number;
    criticalDays: number;
    expiredDays: number;
    qualityWindowDays?: number;
  }
> = {
  formal_validity: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
  processed_repack_loss: { radarDays: 7, markdownDays: 0, criticalDays: 1, expiredDays: 0 },
  flv_inspection: {
    radarDays: 7,
    markdownDays: 3,
    criticalDays: 1,
    expiredDays: 0,
    qualityWindowDays: 2,
  },
  receiving_monitored: { radarDays: 2, markdownDays: 1, criticalDays: 1, expiredDays: 0 },
};

export function ProductFormScreen({
  repository,
  initialGtin,
  onCreated,
  onBack,
}: {
  repository: CaptureRepository;
  initialGtin?: string;
  onCreated: (product: CaptureProductRecord) => void;
  onBack: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [gtin, setGtin] = useState(initialGtin ?? "");
  const [categoryMode, setCategoryMode] = useState<ProductMode>("formal_validity");
  const [overrideMode, setOverrideMode] = useState<ProductMode | undefined>();
  const [error, setError] = useState<string | undefined>();

  const canCreate = displayName.trim().length > 0 && categoryId.trim().length > 0;

  async function createProduct(): Promise<void> {
    if (!canCreate) {
      setError("Informe nome e categoria para cadastrar o produto.");
      return;
    }

    try {
      const product = await repository.createProduct({
        displayName,
        categoryId,
        categoryRuleProfile: {
          categoryId,
          mode: categoryMode,
          windows: categoryWindows[categoryMode],
        },
        ...(supplierName.trim().length === 0 ? {} : { supplierName }),
        ...(gtin.trim().length === 0 ? {} : { gtin }),
        ...(overrideMode === undefined ? {} : { productRuleOverride: { mode: overrideMode } }),
      });

      onCreated(product);
    } catch {
      setError(
        "Não foi possível cadastrar este produto neste aparelho. Revise os campos e tente novamente.",
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Cadastrar produto"
        body="Cadastre somente o necessário para confirmar o lote."
      />
      <Field label="Nome do produto" value={displayName} onChangeText={setDisplayName} />
      <Field label="Categoria" value={categoryId} onChangeText={setCategoryId} />
      <Text style={styles.sectionLabel}>Perfil da categoria</Text>
      {Object.entries(productModeLabels).map(([mode, label]) => (
        <SelectionRow
          key={mode}
          label={label}
          selected={categoryMode === mode}
          onPress={() => setCategoryMode(mode as ProductMode)}
        />
      ))}
      <SecondaryAction
        label="Definir exceção de perfil"
        onPress={() =>
          setOverrideMode(
            overrideMode === undefined ? firstAlternativeMode(categoryMode) : undefined,
          )
        }
      />
      {overrideMode === undefined ? null : (
        <>
          <StatusNotice>
            Exceção explícita do produto: {productModeLabels[overrideMode]}.
          </StatusNotice>
          <Text style={styles.sectionLabel}>Perfil específico deste produto</Text>
          {Object.entries(productModeLabels).map(([mode, label]) => (
            <SelectionRow
              key={`override-${mode}`}
              label={`Usar ${label} como exceção`}
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
    backgroundColor: "#F5F7EF",
    gap: 16,
    padding: 16,
  },
  sectionLabel: {
    color: "#112016",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  pending: {
    color: "#3F5546",
    fontSize: 14,
    lineHeight: 20,
    marginTop: -12,
  },
});

function firstAlternativeMode(mode: ProductMode): ProductMode {
  if (mode === "formal_validity") {
    return "flv_inspection";
  }

  if (mode === "flv_inspection") {
    return "processed_repack_loss";
  }

  return "formal_validity";
}
