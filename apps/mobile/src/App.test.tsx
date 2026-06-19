import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

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
  };
});

describe("Validade Zero mobile smoke", () => {
  it("renders safe smoke copy", async () => {
    const { default: App } = await import("../App");
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(<App />);
    });

    expect(tree).toBeDefined();
    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain("Validade Zero");
    expect(rendered).toContain("Nenhum dado real neste ambiente");
    expect(rendered).toContain("Checagem de base pronta");
    expect(rendered).toContain("validade-zero-api");
  });
});
