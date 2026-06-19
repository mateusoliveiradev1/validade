import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: ({ children }: { children: React.ReactNode }) =>
      React.createElement("Text", null, children),
    View: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", null, children),
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", null, children),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: () =>
    Promise.resolve({
      execAsync: () => Promise.resolve(undefined),
      getAllAsync: () => Promise.resolve([]),
      getFirstAsync: () => Promise.resolve(null),
      runAsync: () => Promise.resolve(undefined),
      withTransactionAsync: (task: () => Promise<void>) => task(),
    }),
}));

describe("Validade Zero mobile smoke", () => {
  it("renders the manual product-discovery entry point", async () => {
    const { default: App } = await import("../App");
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(<App />);
    });

    expect(tree).toBeDefined();
    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain("Localizar produto");
    expect(rendered).toContain("Buscar produto por nome ou código");
    expect(rendered).toContain("Buscar manualmente");
  });
});
