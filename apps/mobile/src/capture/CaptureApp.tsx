import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { CaptureProductRecord, CaptureRepository } from "./repository";
import { captureCopy, productModeLabels } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { ProductDiscoveryScreen } from "./ProductDiscoveryScreen";
import { ProductFormScreen } from "./ProductFormScreen";
import { LotRegistrationScreen } from "./LotRegistrationScreen";

type CaptureScreen = "discovery" | "product-form" | "confirmed" | "lot-registration";

export function CaptureApp({ repository }: { repository: CaptureRepository }) {
  const [screen, setScreen] = useState<CaptureScreen>("discovery");
  const [selectedProduct, setSelectedProduct] = useState<CaptureProductRecord | undefined>();
  const [initialGtin, setInitialGtin] = useState<string | undefined>();
  const [initializationError, setInitializationError] = useState<string | undefined>();

  useEffect(() => {
    void repository.initialize().catch(() => {
      setInitializationError("Não foi possível preparar o registro local neste aparelho.");
    });
  }, [repository]);

  if (screen === "product-form") {
    return (
      <ProductFormScreen
        repository={repository}
        {...(initialGtin === undefined ? {} : { initialGtin })}
        onBack={() => setScreen("discovery")}
        onCreated={(product) => {
          setSelectedProduct(product);
          setScreen("confirmed");
        }}
      />
    );
  }

  if (screen === "confirmed" && selectedProduct !== undefined) {
    const mode =
      selectedProduct.productRuleOverride?.mode ?? selectedProduct.categoryRuleProfile.mode;

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader title="Produto confirmado" body="Revise o perfil antes de informar o lote." />
        <Text style={styles.productName}>{selectedProduct.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {selectedProduct.categoryId}</Text>
        <Text style={styles.metadata}>Perfil operacional: {productModeLabels[mode]}</Text>
        <PrimaryAction
          label={captureCopy.confirmProduct}
          onPress={() => setScreen("lot-registration")}
        />
        <SecondaryAction label={captureCopy.backAndReview} onPress={() => setScreen("discovery")} />
      </ScrollView>
    );
  }

  if (screen === "lot-registration" && selectedProduct !== undefined) {
    return (
      <LotRegistrationScreen
        repository={repository}
        product={selectedProduct}
        onBack={() => setScreen("discovery")}
      />
    );
  }

  return (
    <>
      {initializationError === undefined ? null : (
        <StatusNotice tone="error">{initializationError}</StatusNotice>
      )}
      <ProductDiscoveryScreen
        repository={repository}
        onConfirmProduct={(product) => {
          setSelectedProduct(product);
          setScreen("confirmed");
        }}
        onCreateProduct={(gtin) => {
          setInitialGtin(gtin);
          setScreen("product-form");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F5F7EF",
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  productName: {
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
