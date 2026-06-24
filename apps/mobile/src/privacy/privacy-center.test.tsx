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
    ScrollView: React.forwardRef(function ScrollView(
      { children, ...props }: { children: React.ReactNode },
      ref: React.Ref<{ scrollToEnd: () => void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        scrollToEnd: vi.fn(),
      }));
      return React.createElement("ScrollView", props, children);
    }),
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

function pressable(tree: ReactTestRenderer, label: string) {
  const action = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected pressable ${label}.`);
  }
  return action;
}

describe("PrivacyCenterScreen", () => {
  it("explains every required LGPD topic and submits a bounded rights request", async () => {
    const submit = vi.fn(() => Promise.resolve());
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = create(
        <PrivacyCenterScreen
          activeTopic={null}
          onSelectTopic={() => undefined}
          onBack={() => undefined}
          onSubmitRightsRequest={submit}
        />,
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
    const action = pressable(tree, "Enviar solicitacao de direitos LGPD");
    await act(async () => {
      action.props.onPress();
      await Promise.resolve();
    });

    expect(submit).toHaveBeenCalledOnce();
    expect(JSON.stringify(tree.toJSON())).toContain("Solicitacao recebida");
  });

  it("opens a topic detail screen and returns to the hub", async () => {
    const onSelectTopic = vi.fn();
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = create(
        <PrivacyCenterScreen
          activeTopic={null}
          onSelectTopic={onSelectTopic}
          onBack={() => undefined}
          onSubmitRightsRequest={() => Promise.resolve()}
        />,
      );
      await Promise.resolve();
    });
    if (tree === undefined) throw new Error("Privacy center did not render.");

    await act(async () => {
      pressable(tree, "Abrir Politica de Privacidade").props.onPress();
      await Promise.resolve();
    });
    expect(onSelectTopic).toHaveBeenCalledWith("privacy_policy");

    await act(async () => {
      tree = create(
        <PrivacyCenterScreen
          activeTopic="privacy_policy"
          onSelectTopic={onSelectTopic}
          onBack={() => undefined}
          onSubmitRightsRequest={() => Promise.resolve()}
        />,
      );
      await Promise.resolve();
    });
    if (tree === undefined) throw new Error("Privacy detail did not render.");

    const detail = JSON.stringify(tree.toJSON());
    expect(detail).toContain("Politica de Privacidade");
    expect(detail).toContain("Nao coletamos dados de venda");

    await act(async () => {
      pressable(tree, "Voltar ao centro de privacidade").props.onPress();
      await Promise.resolve();
    });
    expect(onSelectTopic).toHaveBeenCalledWith(null);
  });
});
