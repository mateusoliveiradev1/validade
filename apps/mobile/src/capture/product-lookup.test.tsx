import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCaptureRepository } from "./memory-repository";
import { ProductDiscoveryScreen } from "./ProductDiscoveryScreen";
import { ProductFormScreen } from "./ProductFormScreen";
import type { CaptureProductRecord } from "./repository";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: host("Text"),
    View: host("View"),
    ScrollView: host("ScrollView"),
    TextInput: host("TextInput"),
    Pressable: host("Pressable"),
  };
});

function createRepository() {
  let nextIdentifier = 1;

  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => `identificador-ficticio-${nextIdentifier++}`,
  });
}

function getInput(tree: ReactTestRenderer, label: string): ReactTestInstance {
  return tree.root
    .findAllByType("TextInput")
    .find((input) => input.props.accessibilityLabel === label)!;
}

function press(tree: ReactTestRenderer, label: string): void {
  const button = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  const onPress = button?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`Expected a pressable action named ${label}.`);
  }

  onPress();
}

describe("manual product discovery", () => {
  it("keeps manual lookup usable and requires explicit product confirmation", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.createProduct({
      displayName: "Ovos Brancos Exemplo FICTICIA",
      categoryId: "categoria-ficticia-ovos",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-ovos",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    const confirmed: string[] = [];
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={(product) => confirmed.push(product.id)}
          onCreateProduct={() => undefined}
        />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).not.toContain("Cadastrar produto novo");

    act(() => {
      getInput(tree!, "Buscar produto por nome, codigo ou categoria").props.onChangeText("OVOS");
    });

    await act(async () => {
      press(tree!, "Buscar manualmente");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Ovos Brancos Exemplo FICTICIA");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Cadastrar produto novo");

    act(() => {
      press(tree!, "Ovos Brancos Exemplo FICTICIA");
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Perfil operacional");
    expect(JSON.stringify(tree!.toJSON())).toContain("formal_validity");
    expect(confirmed).toEqual([]);

    act(() => {
      press(tree!, "Usar este produto");
    });

    expect(confirmed).toHaveLength(1);
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Permitir câmera");
  });

  it("uses an unknown code only as an optional GTIN prefill", async () => {
    const repository = createRepository();
    let openProductFormWith: { gtin?: string } | undefined;
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={() => undefined}
          onCreateProduct={(initial) => {
            openProductFormWith = initial;
          }}
        />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).not.toContain("Cadastrar produto novo");

    act(() => {
      getInput(tree!, "Buscar produto por nome, codigo ou categoria").props.onChangeText(
        "7890000000001",
      );
    });

    await act(async () => {
      press(tree!, "Buscar manualmente");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      press(tree!, "Cadastrar produto novo");
    });

    expect(openProductFormWith?.gtin).toBe("7890000000001");

    await act(async () => {
      tree = create(
        <ProductFormScreen
          repository={repository}
          initialGtin={openProductFormWith?.gtin}
          onCreated={() => undefined}
          onBack={() => undefined}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getInput(tree!, "GTIN opcional").props.value).toBe("7890000000001");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Quantidade aproximada");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Data de validade");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Local inicial");
  });

  it("asks how the product is in the store before showing category rows", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.createProduct({
      displayName: "Banana Prata Exemplo FICTICIA",
      categoryId: "categoria-ficticia-frutas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <ProductFormScreen
          repository={repository}
          onCreated={() => undefined}
          onBack={() => undefined}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const initialRender = JSON.stringify(tree!.toJSON());
    expect(initialRender).toContain("Como esse produto esta na loja?");
    expect(initialRender).toContain("Inteiro solto");
    expect(initialRender).toContain("Embalado pelo fornecedor");
    expect(initialRender).toContain("Cortado/PED");
    expect(initialRender).toContain("Fracionado ou reembalado na loja");
    expect(initialRender).toContain("Preparado pronto");
    expect(initialRender).toContain("Ovos");
    expect(initialRender).toContain("Industrial/refrigerado com validade");
    expect(initialRender).toContain("Outro/nao sei");
    expect(initialRender).not.toContain("categoria-ficticia-frutas");

    act(() => {
      press(tree!, "Outro/nao sei");
    });

    const afterClassifier = JSON.stringify(tree!.toJSON());
    expect(afterClassifier).toContain("categoria-ficticia-frutas");
    expect(afterClassifier).toContain("Politica conservadora");
    expect(afterClassifier).toContain("Sem rebaixa automatica");
    expect(afterClassifier).not.toContain("pedir rebaixa");
  });

  it("requires similar central candidates to be reviewed before continuing creation", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.createProduct({
      displayName: "Banana Prata Exemplo FICTICIA",
      categoryId: "categoria-ficticia-frutas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    let openedCreation = false;
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={() => undefined}
          onCreateProduct={() => {
            openedCreation = true;
          }}
        />,
      );
    });

    act(() => {
      getInput(tree!, "Buscar produto por nome, codigo ou categoria").props.onChangeText(
        "Banana Nanica Exemplo FICTICIA",
      );
    });

    await act(async () => {
      press(tree!, "Buscar manualmente");
      await Promise.resolve();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain("Produtos parecidos encontrados");
    expect(rendered).toContain("Banana Prata Exemplo FICTICIA");
    expect(rendered).not.toContain("Cadastrar produto novo");
    expect(rendered).toContain("Continuar cadastro apos revisar");
    expect(openedCreation).toBe(false);

    act(() => {
      press(tree!, "Continuar cadastro apos revisar");
    });

    expect(openedCreation).toBe(true);
  });

  it("shows similar central products before creating an operational draft", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.createProduct({
      displayName: "Banana Prata Exemplo FICTICIA",
      categoryId: "categoria-ficticia-frutas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    const created: CaptureProductRecord[] = [];
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <ProductFormScreen
          repository={repository}
          onCreated={(product) => created.push(product)}
          onBack={() => undefined}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      getInput(tree!, "Nome do produto").props.onChangeText("Banana Nanica Exemplo FICTICIA");
      press(tree!, "Embalado pelo fornecedor");
    });

    act(() => {
      press(tree!, "categoria-ficticia-frutas");
    });

    await act(async () => {
      press(tree!, "Cadastrar produto novo");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Produtos parecidos encontrados");
    expect(JSON.stringify(tree!.toJSON())).toContain("Banana Prata Exemplo FICTICIA");
    expect(created).toEqual([]);

    await act(async () => {
      press(tree!, "Cadastrar produto novo");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(created).toHaveLength(1);
    expect(created[0]?.reviewStatus).toBe("pending_review");
    expect(created[0]?.draftReviewMessage).toContain("risco conservador");
  });

  it("opens existing lots from the Recents shortcut instead of only showing a hint", () => {
    const repository = createRepository();
    let recentOpened = false;
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={() => undefined}
          onCreateProduct={() => undefined}
          onOpenRecent={() => {
            recentOpened = true;
          }}
        />,
      );
    });

    act(() => {
      press(tree!, "Recentes");
    });

    expect(recentOpened).toBe(true);
    expect(JSON.stringify(tree!.toJSON())).not.toContain("atalho de apoio");
  });

  it("uses frequent products and category selection as real lookup paths", async () => {
    const repository = createRepository();
    await repository.initialize();
    const frequentProduct = await repository.createProduct({
      displayName: "Banana Prata Exemplo FICTICIA",
      categoryId: "categoria-ficticia-frutas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    await repository.createProduct({
      displayName: "Alface Crespa Exemplo FICTICIA",
      categoryId: "categoria-ficticia-folhas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-folhas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });
    await repository.saveLot({
      lot: {
        productId: frequentProduct.id,
        identity: { identitySource: "generated_internal", value: "LOTE-FICTICIO-BANANA-001" },
        mode: "formal_validity",
        expiresAt: "2030-02-10",
        receivedAt: "2030-01-10",
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora Exemplo FICTICIA",
    });

    const confirmed: string[] = [];
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={(product) => confirmed.push(product.id)}
          onCreateProduct={() => undefined}
        />,
      );
    });

    await act(async () => {
      press(tree!, "Frequentes");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Produtos mais registrados");
    act(() => {
      press(tree!, "Banana Prata Exemplo FICTICIA");
    });
    act(() => {
      press(tree!, "Usar este produto");
    });
    expect(confirmed).toEqual([frequentProduct.id]);

    await act(async () => {
      press(tree!, "Por categoria");
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("Escolha uma categoria");

    await act(async () => {
      press(tree!, "categoria-ficticia-frutas");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Banana Prata Exemplo FICTICIA");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Alface Crespa Exemplo FICTICIA");
  });
});
