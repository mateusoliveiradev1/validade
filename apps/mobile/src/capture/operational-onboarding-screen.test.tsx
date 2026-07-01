import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { PrepareTurnCacheStatus } from "@validade-zero/contracts";
import { OperationalOnboardingScreen } from "./OperationalOnboardingScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", null, children),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

describe("OperationalOnboardingScreen", () => {
  it("guides first-store operators from central read to real lot registration", () => {
    const registerLot = vi.fn();
    const openToday = vi.fn();
    const back = vi.fn();
    const tree = renderOnboarding({
      prepareTurnCacheStatus: firstStoreCache(),
      prepareTurnSource: "central",
      onRegisterLot: registerLot,
      onOpenToday: openToday,
      onBack: back,
    });
    const text = renderedText(tree);

    expect(text).toContain("Primeiros passos da loja");
    expect(text).toContain("A central voltou vazia para a primeira execucao");
    expect(text).toContain("Registrar um lote fisico");
    expect(text).toContain("Zero tarefas nao significa area de venda segura");

    act(() => {
      press(tree, "Registrar lote real");
    });
    expect(registerLot).toHaveBeenCalledTimes(1);

    act(() => {
      press(tree, "Abrir Hoje");
    });
    expect(openToday).toHaveBeenCalledTimes(1);
  });
});

function renderOnboarding(input: {
  prepareTurnCacheStatus: PrepareTurnCacheStatus;
  prepareTurnSource: "central" | "local_cache";
  onRegisterLot: () => void;
  onOpenToday: () => void;
  onBack: () => void;
}): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;

  act(() => {
    tree = create(<OperationalOnboardingScreen {...input} />);
  });

  if (tree === undefined) {
    throw new Error("OperationalOnboardingScreen did not render.");
  }

  return tree;
}

function press(tree: ReactTestRenderer, label: string): void {
  tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
}

function renderedText(tree: ReactTestRenderer): string {
  return flattenText(tree.toJSON());
}

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(flattenText).join("");
  }

  if (value !== null && typeof value === "object" && "children" in value) {
    return flattenText((value as { children?: unknown }).children);
  }

  return "";
}

function firstStoreCache(): PrepareTurnCacheStatus {
  return {
    state: "needs_first_central_read",
    source: "central",
    updatedAt: "2030-01-10T09:00:00.000Z",
    lastCentralReadAt: "2030-01-10T09:00:00.000Z",
    staleAfterHours: 4,
    productCount: 0,
    lotCount: 0,
    activeTaskCount: 0,
    conflictCount: 0,
    resolvedHistoryCount: 0,
  };
}
