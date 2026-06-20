import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
  const [candidate, setCandidate] = useState<CaptureProductRecord | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  async function searchManually(): Promise<void> {
    const results = await repository.findProducts(query);
    setMatches(results);
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

  function showShortcut(label: string): void {
    setMessage(`${label} é um atalho de apoio. Use a busca manual para confirmar o produto.`);
  }

  const resolvedMode =
    candidate?.productRuleOverride?.mode ??
    candidate?.categoryRuleProfile.mode ??
    "formal_validity";

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={captureCopy.discoveryTitle} body={captureCopy.discoveryBody} />
      <Field
        label="Buscar produto por nome ou código"
        value={query}
        onChangeText={setQuery}
        placeholder="Ex.: alface ou 7890000000001"
      />
      <PrimaryAction label={captureCopy.manualSearch} onPress={() => void searchManually()} />
      {onScanCode === undefined ? null : (
        <SecondaryAction label="Ler código" onPress={onScanCode} />
      )}
      <View style={styles.shortcuts}>
        <SecondaryAction
          label={captureCopy.recent}
          onPress={onOpenRecent ?? (() => showShortcut(captureCopy.recent))}
        />
        <SecondaryAction
          label={captureCopy.frequent}
          onPress={() => showShortcut(captureCopy.frequent)}
        />
        <SecondaryAction
          label={captureCopy.byCategory}
          onPress={() => showShortcut(captureCopy.byCategory)}
        />
      </View>
      {message === undefined ? null : <StatusNotice>{message}</StatusNotice>}
      {matches.map((product) => (
        <SelectionRow
          key={product.id}
          label={product.displayName}
          detail={product.categoryId}
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
          <Text style={styles.metadata}>Categoria: {candidate.categoryId}</Text>
          <Text style={styles.metadata}>Perfil operacional: {resolvedMode}</Text>
          <Text style={styles.metadata}>Modo de trabalho: {productModeLabels[resolvedMode]}</Text>
          <PrimaryAction
            label={captureCopy.confirmProduct}
            onPress={() => onConfirmProduct(candidate)}
          />
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
