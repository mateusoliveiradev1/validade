import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { GppClient } from "./gpp-client";
import { GppPurchaseFlow } from "./GppPurchaseFlow";
import { createMemoryCaptureRepository } from "./memory-repository";

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

describe("GppPurchaseFlow", () => {
  it("keeps product code optional but requires description, quantity, unit, and finality", async () => {
    const tree = await renderFlow();

    expect(renderedText(tree)).toContain("Codigo do produto (opcional)");
    await press(tree, "Continuar compra");
    expect(renderedText(tree)).toContain(
      "Descreva o produto para o GPP localizar ou confirmar o codigo.",
    );

    await fill(tree, "Nome ou descricao do produto", "Banana prata FICTICIA");
    await press(tree, "Continuar compra");
    expect(renderedText(tree)).toContain("Informe quantidade e unidade antes de continuar.");

    await fill(tree, "Quantidade", "3");
    await press(tree, "caixa");
    await press(tree, "Continuar compra");
    expect(renderedText(tree)).toContain("Informe a finalidade da compra interna antes de enviar.");

    await fill(tree, "Finalidade da compra interna", "Reposicao da avaria");
    await press(tree, "Continuar compra");
    expect(renderedText(tree)).toContain("Enviar compra para central");
    expect(renderedText(tree)).toContain("Codigo: opcional nao informado");
    expect(renderedText(tree)).toContain("Setor solicitante: FLV");
  });

  it("shows central success, replay, offline pending, and central failure truthfully", async () => {
    const confirmed = await renderFlow({
      client: clientReturning({
        state: "central_success",
        copy: "Confirmado no Controle GPP.",
        response: {
          state: "central_confirmed",
          requestId: "req-purchase",
          confirmedAt: "2030-01-10T09:00:00.000Z",
        },
      }),
    });
    await submitValid(confirmed);
    expect(renderedText(confirmed)).toContain("Solicitacao enviada para central");

    const replayed = await renderFlow({
      client: clientReturning({
        state: "central_success",
        copy: "Ja confirmado no Controle GPP.",
        response: {
          state: "replayed",
          requestId: "req-purchase",
          replayedAt: "2030-01-10T09:00:00.000Z",
        },
      }),
    });
    await submitValid(replayed);
    expect(renderedText(replayed)).toContain("Registro ja confirmado na central");

    const repository = createRepository();
    const offline = await renderFlow({
      repository,
      client: clientReturning({
        state: "offline_pending_candidate",
        kind: "purchase",
        request: {
          storeId: "loja-18",
          sector: "FLV",
          product: { name: "Banana prata FICTICIA" },
          requestedQuantity: { value: 3, unit: "caixa" },
          finality: "Reposicao da avaria",
          requestedAt: "2030-01-10T09:00:00.000Z",
          idempotencyKey: "idem-purchase-001",
        },
        idempotencyKey: "idem-purchase-001",
        message: "Pendente neste aparelho",
        error: new Error("network"),
      }),
    });
    await submitValid(offline);
    expect(renderedText(offline)).toContain("Pendente neste aparelho");
    await expect(repository.listGppPending()).resolves.toMatchObject([
      { kind: "purchase", idempotencyKey: "idem-purchase-001" },
    ]);

    const centralFailureRepository = createRepository();
    const failed = await renderFlow({
      repository: centralFailureRepository,
      client: clientReturning({
        state: "central_failure",
        reason: "authorization",
        message: "Seu acesso nao permite registrar esta acao no Controle GPP.",
        retryable: false,
      }),
    });
    await submitValid(failed);
    expect(renderedText(failed)).toContain(
      "Seu acesso nao permite registrar esta acao no Controle GPP.",
    );
    await expect(centralFailureRepository.listGppPending()).resolves.toHaveLength(0);
  });
});

function createRepository() {
  let nextId = 1;
  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => `gpp-purchase-local-${nextId++}`,
  });
}

async function renderFlow(input: Partial<Parameters<typeof GppPurchaseFlow>[0]> = {}) {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <GppPurchaseFlow
        repository={input.repository ?? createRepository()}
        client={input.client}
        storeId="loja-18"
        sector="FLV"
        now={() => "2030-01-10T09:00:00.000Z"}
        createIdempotencyKey={() => "idem-purchase-001"}
        onBack={input.onBack ?? (() => undefined)}
      />,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("GppPurchaseFlow did not render.");
  return tree;
}

function clientReturning(
  result: Awaited<ReturnType<GppClient["createGppPurchaseRequest"]>>,
): GppClient {
  return {
    createGppAvaria: vi.fn(() => Promise.reject(new Error("not used"))),
    createGppPurchaseRequest: vi.fn(() => Promise.resolve(result)),
  };
}

async function submitValid(tree: ReactTestRenderer): Promise<void> {
  await fill(tree, "Nome ou descricao do produto", "Banana prata FICTICIA");
  await fill(tree, "Quantidade", "3");
  await press(tree, "caixa");
  await fill(tree, "Finalidade da compra interna", "Reposicao da avaria");
  await press(tree, "Continuar compra");
  await press(tree, "Enviar compra para central");
}

async function fill(tree: ReactTestRenderer, label: string, value: string): Promise<void> {
  const input = tree.root
    .findAllByType("TextInput")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (input === undefined || typeof input.props.onChangeText !== "function") {
    throw new Error(`Expected input ${label}.`);
  }
  await act(async () => {
    input.props.onChangeText(value);
    await Promise.resolve();
  });
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = tree.root.findAllByType("Pressable").find((candidate) =>
    String(candidate.props.accessibilityLabel ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(label.toLocaleLowerCase("pt-BR")),
  );
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected action ${label}.`);
  }
  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
  });
}

function renderedText(tree: ReactTestRenderer): string {
  return flattenText(tree.toJSON());
}

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value !== null && typeof value === "object" && "children" in value) {
    return flattenText((value as { children?: unknown }).children);
  }
  return "";
}
