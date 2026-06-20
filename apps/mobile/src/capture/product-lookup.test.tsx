import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCaptureRepository } from "./memory-repository";
import { ProductDiscoveryScreen } from "./ProductDiscoveryScreen";
import { ProductFormScreen } from "./ProductFormScreen";

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

    act(() => {
      getInput(tree!, "Buscar produto por nome ou código").props.onChangeText("OVOS");
    });

    await act(async () => {
      press(tree!, "Buscar manualmente");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Ovos Brancos Exemplo FICTICIA");

    act(() => {
      press(tree!, "Ovos Brancos Exemplo FICTICIA");
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Perfil operacional");
    expect(JSON.stringify(tree!.toJSON())).toContain("formal_validity");
    expect(confirmed).toEqual([]);

    act(() => {
      press(tree!, "Confirmar produto");
    });

    expect(confirmed).toHaveLength(1);
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Permitir câmera");
  });

  it("uses an unknown code only as an optional GTIN prefill", async () => {
    const repository = createRepository();
    let openProductFormWith: string | undefined;
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <ProductDiscoveryScreen
          repository={repository}
          onConfirmProduct={() => undefined}
          onCreateProduct={(gtin) => {
            openProductFormWith = gtin;
          }}
        />,
      );
    });

    act(() => {
      getInput(tree!, "Buscar produto por nome ou código").props.onChangeText("7890000000001");
    });

    await act(async () => {
      press(tree!, "Buscar manualmente");
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      press(tree!, "Cadastrar produto");
    });

    expect(openProductFormWith).toBe("7890000000001");

    act(() => {
      tree = create(
        <ProductFormScreen
          repository={repository}
          initialGtin={openProductFormWith}
          onCreated={() => undefined}
          onBack={() => undefined}
        />,
      );
    });

    expect(getInput(tree!, "GTIN opcional").props.value).toBe("7890000000001");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Quantidade aproximada");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Data de validade");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("Local inicial");
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
});
