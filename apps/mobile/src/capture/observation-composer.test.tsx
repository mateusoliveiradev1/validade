import type { ReactNode } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ObservationComposer } from "./ObservationComposer";
import { createMemoryCaptureRepository } from "./memory-repository";

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

function getInput(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const input = tree.root
    .findAllByType("TextInput")
    .find((candidate) => candidate.props.accessibilityLabel === label);

  if (input === undefined) {
    throw new Error(`Expected an input named ${label}.`);
  }

  return input;
}

async function renderObservationComposer(
  input: {
    onAfterSave?: () => Promise<void> | void;
    onDone?: () => void;
  } = {},
): Promise<ReactTestRenderer> {
  const repository = createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => "identificador-ficticio",
  });
  const product = await repository.createProduct({
    displayName: "Produto Exemplo FICTICIO",
    categoryId: "categoria-ficticia",
    categoryRuleProfile: { categoryId: "categoria-ficticia", mode: "formal_validity" },
  });
  const lot = await repository.saveLot({
    lot: {
      productId: product.id,
      identity: { identitySource: "printed", value: "LOTE-FICTICIO-001" },
      mode: "formal_validity",
      expiresAt: "2030-01-15",
      approximateQuantity: 20,
      initialLocation: { kind: "area_de_venda" },
    },
    actorLabel: "Colaborador FICTICIO",
  });
  const detail = await repository.loadLotDetail(lot.id);

  if (detail === null) {
    throw new Error("Expected the saved lot detail to be available.");
  }

  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <ObservationComposer
        repository={repository}
        detail={detail}
        onBack={() => undefined}
        {...(input.onAfterSave === undefined ? {} : { onAfterSave: input.onAfterSave })}
        onDone={input.onDone ?? (() => undefined)}
      />,
    );
  });

  return tree!;
}

describe("presence observation composer", () => {
  it("keeps a valid prefilled quantity neutral until the operator explicitly confirms it", async () => {
    const tree = await renderObservationComposer();

    act(() => {
      press(tree, "Confirmar presença");
    });

    expect(getInput(tree, "Quantidade confirmada").props.value).toBe("20");
    expect(JSON.stringify(tree.toJSON())).not.toContain(
      "Informe a quantidade confirmada para registrar este lote.",
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Confira a quantidade e toque em");
    expect(
      tree.root
        .findAllByType("Pressable")
        .find((candidate) => candidate.props.accessibilityLabel === "Registrar observação")?.props
        .disabled,
    ).toBe(true);

    act(() => {
      press(tree, "Confirmar quantidade informada");
    });

    expect(
      tree.root
        .findAllByType("Pressable")
        .find((candidate) => candidate.props.accessibilityLabel === "Registrar observação")?.props
        .disabled,
    ).toBe(false);
  });

  it("runs the post-save sync hook before closing the observation flow", async () => {
    const events: string[] = [];
    const tree = await renderObservationComposer({
      onAfterSave: () => {
        events.push("sync");
      },
      onDone: () => {
        events.push("done");
      },
    });

    act(() => {
      press(tree, "Registrar perda");
    });
    act(() => {
      press(tree, "Registrar observação");
    });
    await act(async () => {
      press(tree, "Confirmar registro");
      await Promise.resolve();
    });

    expect(events).toEqual(["sync", "done"]);
  });
});
