import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { PrivacyCenterScreen } from "./PrivacyCenterScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    StyleSheet: { create: <T extends Record<string, unknown>>(styles: T) => styles },
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    ScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", props, children),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

function input(tree: ReactTestRenderer, label: string) {
  const field = tree.root
    .findAllByType("TextInput")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (field === undefined || typeof field.props.onChangeText !== "function") {
    throw new Error(`Expected field ${label}.`);
  }
  return field;
}

describe("PrivacyCenterScreen", () => {
  it("explains every required LGPD topic and submits a bounded rights request", async () => {
    const submit = vi.fn(() => Promise.resolve());
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = create(
        <PrivacyCenterScreen onBack={() => undefined} onSubmitRightsRequest={submit} />,
      );
      await Promise.resolve();
    });
    if (tree === undefined) throw new Error("Privacy center did not render.");

    const rendered = JSON.stringify(tree.toJSON());
    for (const heading of [
      "Politica de Privacidade",
      "Termos de Uso",
      "Seguranca da conta",
      "Permissoes do aparelho",
      "Dados usados pelo app",
      "Canal/encarregado",
      "Solicitacao de direitos LGPD",
    ]) {
      expect(rendered).toContain(heading);
    }

    await act(async () => {
      input(tree, "Canal para responder ao pedido").props.onChangeText(
        "worker-ficticio@example.test",
      );
      input(tree, "Descreva seu pedido de direitos").props.onChangeText(
        "Quero acesso aos meus dados operacionais usados pela loja piloto.",
      );
      await Promise.resolve();
    });
    const action = tree.root
      .findAllByType("Pressable")
      .find(
        (candidate) => candidate.props.accessibilityLabel === "Enviar solicitacao de direitos LGPD",
      );
    if (action === undefined || typeof action.props.onPress !== "function") {
      throw new Error("Expected LGPD request action.");
    }
    await act(async () => {
      action.props.onPress();
      await Promise.resolve();
    });

    expect(submit).toHaveBeenCalledOnce();
    expect(JSON.stringify(tree.toJSON())).toContain("Solicitacao recebida");
  });
});
