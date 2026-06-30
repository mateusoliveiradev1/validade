import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCaptureRepository } from "./memory-repository";
import { LotRegistrationScreen } from "./LotRegistrationScreen";
import type { CaptureProductRecord } from "./repository";

const datePicker = vi.hoisted(() => ({ open: vi.fn() }));

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
    Platform: { OS: "android" },
  };
});

vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: datePicker,
}));

function createRepository() {
  let nextIdentifier = 1;

  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => `identificador-ficticio-${nextIdentifier++}`,
  });
}

async function createProduct(
  mode: "formal_validity" | "flv_inspection" | "processed_repack_loss" | "receiving_monitored",
  options: { storePresentation?: CaptureProductRecord["storePresentation"] } = {},
) {
  const repository = createRepository();
  const product = await repository.createProduct({
    displayName: "Produto Exemplo FICTICIO",
    categoryId: "categoria-ficticia",
    categoryRuleProfile: {
      categoryId: "categoria-ficticia",
      mode,
      windows: {
        radarDays: 60,
        markdownDays: 15,
        criticalDays: 3,
        expiredDays: 0,
        ...(mode === "flv_inspection" ? { qualityWindowDays: 2 } : {}),
      },
    },
    ...(options.storePresentation === undefined
      ? {}
      : { storePresentation: options.storePresentation }),
  });

  return { repository, product };
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

function renderLotScreen(
  repository: ReturnType<typeof createRepository>,
  product: CaptureProductRecord,
): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;

  act(() => {
    tree = create(
      <LotRegistrationScreen repository={repository} product={product} onBack={() => undefined} />,
    );
  });

  return tree!;
}

function selectDate(tree: ReactTestRenderer, label: string, value: Date): void {
  press(tree, label);
  const options = datePicker.open.mock.calls.at(-1)?.[0] as
    | { onValueChange: (event: object, nextDate: Date) => void }
    | undefined;

  if (options === undefined) {
    throw new Error("Expected the native date picker to open.");
  }

  options.onValueChange({ type: "set" }, value);
}

describe("mode-aware lot registration", () => {
  it("blocks incomplete formal-validity registration, calculates its operational window, and resets safely for repeat capture", async () => {
    const { repository, product } = await createProduct("formal_validity", {
      storePresentation: "supplier_packaged",
    });
    const tree = renderLotScreen(repository, product);

    expect(JSON.stringify(tree.toJSON())).toContain("Data de validade impressa");
    expect(
      tree.root
        .findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Registrar lote")?.props.disabled,
    ).toBe(true);

    act(() => {
      getInput(tree, "Identificação impressa do lote").props.onChangeText("LOTE-FICTICIO-001");
    });
    act(() => {
      getInput(tree, "Quantidade aproximada").props.onChangeText("12");
    });
    act(() => {
      press(tree, "Área de venda");
    });
    act(() => {
      selectDate(tree, "Data de validade impressa", new Date(2030, 0, 15, 12));
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Proxima acao");
    expect(JSON.stringify(tree.toJSON())).toContain("fica no radar");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
    );
    expect(
      tree.root
        .findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Registrar lote")?.props.disabled,
    ).toBe(false);

    await act(async () => {
      press(tree, "Registrar lote");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Lote registrado em");
    expect(JSON.stringify(tree.toJSON())).toContain("Área de venda");
    expect(JSON.stringify(tree.toJSON())).toContain("06:00");

    act(() => {
      press(tree, "Registrar outro lote");
    });

    expect(getInput(tree, "Identificação impressa do lote").props.value).toBe("");
    expect(getInput(tree, "Quantidade aproximada").props.value).toBe("");
    expect(JSON.stringify(tree.toJSON())).toContain("Selecionar data");
    expect(JSON.stringify(tree.toJSON())).toContain("Produto Exemplo FICTICIO");
  });

  it("shows the correct mode fields, ordered locations, custom-location requirement, and explicit internal identity", async () => {
    const flv = await createProduct("flv_inspection");
    const flvTree = renderLotScreen(flv.repository, flv.product);

    expect(JSON.stringify(flvTree.toJSON())).toContain("Data de recebimento");
    expect(JSON.stringify(flvTree.toJSON())).toContain("Janela de qualidade (dias)");
    expect(JSON.stringify(flvTree.toJSON())).not.toContain("Data de validade impressa");
    expect(
      flvTree.root
        .findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Registrar lote")?.props.disabled,
    ).toBe(true);

    const receiving = await createProduct("receiving_monitored");
    const receivingTree = renderLotScreen(receiving.repository, receiving.product);

    expect(JSON.stringify(receivingTree.toJSON())).toContain("Data de recebimento");
    expect(JSON.stringify(receivingTree.toJSON())).not.toContain("Data de validade impressa");
    expect(
      receivingTree.root
        .findAllByType("Pressable")
        .find((node) => node.props.accessibilityLabel === "Registrar lote")?.props.disabled,
    ).toBe(true);

    const formal = await createProduct("formal_validity");
    const formalTree = renderLotScreen(formal.repository, formal.product);
    const locationLabels = formalTree.root
      .findAllByType("Pressable")
      .map((node) => node.props.accessibilityLabel)
      .filter((label): label is string =>
        [
          "Área de venda",
          "Estoque",
          "Câmara fria",
          "Ilha promocional",
          "Retirada/perda",
          "Outro local",
        ].includes(label),
      );

    expect(locationLabels).toEqual([
      "Área de venda",
      "Estoque",
      "Câmara fria",
      "Ilha promocional",
      "Retirada/perda",
      "Outro local",
    ]);

    act(() => {
      press(formalTree, "Outro local");
    });
    expect(getInput(formalTree, "Nome do outro local")).toBeDefined();

    act(() => {
      press(formalTree, "Gerar identificação interna");
    });
    expect(JSON.stringify(formalTree.toJSON())).toContain("Identificação interna");
    expect(JSON.stringify(formalTree.toJSON())).not.toContain("Código do fornecedor");
  });

  it("uses store presentation policy before legacy mode fields and blocks rebaixa for unknown products", async () => {
    const loose = await createProduct("formal_validity", { storePresentation: "loose_whole" });
    const looseTree = renderLotScreen(loose.repository, loose.product);
    const looseRendered = JSON.stringify(looseTree.toJSON());

    expect(looseRendered).toContain("Data de recebimento");
    expect(looseRendered).toContain("Janela de qualidade (dias)");
    expect(looseRendered).toContain("conferir qualidade");
    expect(looseRendered).not.toContain("Data de validade impressa");

    const unknown = await createProduct("formal_validity", { storePresentation: "unknown_other" });
    const unknownTree = renderLotScreen(unknown.repository, unknown.product);
    const unknownRendered = JSON.stringify(unknownTree.toJSON());

    expect(unknownRendered).toContain("Data de recebimento");
    expect(unknownRendered).toContain("Politica conservadora");
    expect(unknownRendered).toContain("Sem rebaixa automatica");
    expect(unknownRendered).not.toContain("Solicitar rebaixa");
    expect(unknownRendered).not.toContain("pedir rebaixa");
  });

  it("renders operational next actions without offering unsafe markdown", async () => {
    const formal = await createProduct("formal_validity", {
      storePresentation: "supplier_packaged",
    });
    const formalTree = renderLotScreen(formal.repository, formal.product);

    act(() => {
      selectDate(formalTree, "Data de validade impressa", new Date(2026, 6, 10, 12));
    });
    expect(JSON.stringify(formalTree.toJSON())).toContain("pedir rebaixa");

    act(() => {
      selectDate(formalTree, "Data de validade impressa", new Date(2026, 5, 29, 12));
    });
    const expiredFormal = JSON.stringify(formalTree.toJSON());
    expect(expiredFormal).toContain("retirar/perda");
    expect(expiredFormal).not.toContain("pedir rebaixa");

    const ped = await createProduct("formal_validity", { storePresentation: "store_cut_ped" });
    const pedTree = renderLotScreen(ped.repository, ped.product);

    act(() => {
      selectDate(pedTree, "Data de preparo/validade curta", new Date(2026, 5, 29, 12));
    });
    const pedRendered = JSON.stringify(pedTree.toJSON());
    expect(pedRendered).toContain("reembalar/perda");
    expect(pedRendered).not.toContain("pedir rebaixa");
  });

  it("keeps pre-Phase-15 products saveable for every existing product mode", async () => {
    const scenarios = [
      { mode: "formal_validity", dateLabel: "Data de validade impressa" },
      { mode: "processed_repack_loss", dateLabel: "Data de preparo/validade curta" },
      { mode: "flv_inspection", dateLabel: "Data de recebimento", qualityWindowDays: "2" },
      { mode: "receiving_monitored", dateLabel: "Data de recebimento" },
    ] as const;

    for (const scenario of scenarios) {
      const { repository, product } = await createProduct(scenario.mode);
      const tree = renderLotScreen(repository, product);

      act(() => {
        tree.root.findAllByType("TextInput")[0]?.props.onChangeText(`LOTE-${scenario.mode}`);
      });
      act(() => {
        tree.root.findAllByType("TextInput")[1]?.props.onChangeText("4");
      });
      act(() => {
        tree.root.findAllByType("Pressable")[1]?.props.onPress();
      });
      act(() => {
        selectDate(tree, scenario.dateLabel, new Date(2030, 0, 15, 12));
      });
      if ("qualityWindowDays" in scenario) {
        act(() => {
          getInput(tree, "Janela de qualidade (dias)").props.onChangeText(
            scenario.qualityWindowDays,
          );
        });
      }

      await act(async () => {
        press(tree, "Registrar lote");
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(JSON.stringify(tree.toJSON())).toContain("Lote registrado em");
    }
  });
});
