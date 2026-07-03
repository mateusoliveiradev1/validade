import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { GppClient } from "./gpp-client";
import { GppAvariaFlow } from "./GppAvariaFlow";
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

describe("GppAvariaFlow", () => {
  it("asks product code first and blocks incomplete avaria data", async () => {
    const tree = await renderFlow();

    expect(renderedText(tree)).toContain("Codigo do produto");
    await press(tree, "Continuar avaria");
    expect(renderedText(tree)).toContain(
      "Informe o codigo do produto para enviar a avaria ao GPP.",
    );

    await fill(tree, "Codigo do produto", "789000000001");
    await press(tree, "Continuar avaria");
    expect(renderedText(tree)).toContain("Informe quantidade e unidade antes de continuar.");

    await fill(tree, "Quantidade", "texto livre");
    await press(tree, "kg");
    await press(tree, "Continuar avaria");
    expect(renderedText(tree)).toContain("Informe quantidade e unidade antes de continuar.");

    await fill(tree, "Quantidade", "2");
    await press(tree, "Continuar avaria");
    expect(renderedText(tree)).toContain("Escolha a finalidade e o destino antes de enviar.");
  });

  it("shows approved finality options and review before central submission", async () => {
    const tree = await renderFlow();

    expect(renderedText(tree)).toContain("Baixa GPP");
    expect(renderedText(tree)).toContain("Reaproveitamento");
    expect(renderedText(tree)).toContain("Producao interna");
    expect(renderedText(tree)).toContain("Transferencia");

    await fillValidAvaria(tree);
    await press(tree, "Continuar avaria");

    const text = renderedText(tree);
    expect(text).toContain("Enviar avaria para central");
    expect(text).toContain("Codigo: 789000000001");
    expect(text).toContain("Produto: Maca FICTICIA");
    expect(text).toContain("Quantidade: 2 kg");
    expect(text).toContain("Finalidade: Baixa GPP");
    expect(text).toContain("Destino: Controle GPP");
    expect(text).toContain("Sucesso aparece somente depois que o Controle GPP central confirmar");
  });

  it("shows central confirmed and replayed success only after client acknowledgement", async () => {
    const confirmed = await renderFlow({
      client: clientReturning({
        state: "central_success",
        copy: "Confirmado no Controle GPP.",
        response: {
          state: "central_confirmed",
          requestId: "req-1",
          confirmedAt: "2030-01-10T09:00:00.000Z",
        },
      }),
    });
    await fillValidAvaria(confirmed);
    await press(confirmed, "Continuar avaria");
    await press(confirmed, "Enviar avaria para central");
    expect(renderedText(confirmed)).toContain("Registrado na central");

    const replayed = await renderFlow({
      client: clientReturning({
        state: "central_success",
        copy: "Ja confirmado no Controle GPP.",
        response: {
          state: "replayed",
          requestId: "req-1",
          replayedAt: "2030-01-10T09:00:00.000Z",
        },
      }),
    });
    await fillValidAvaria(replayed);
    await press(replayed, "Continuar avaria");
    await press(replayed, "Enviar avaria para central");
    expect(renderedText(replayed)).toContain("Registro ja confirmado na central");
  });

  it("saves local pending only for offline transport failures", async () => {
    const repository = createRepository();
    const tree = await renderFlow({
      repository,
      client: clientReturning({
        state: "offline_pending_candidate",
        kind: "avaria",
        request: {
          storeId: "loja-18",
          sector: "FLV",
          product: { code: "789000000001", name: "Maca FICTICIA" },
          quantity: { value: 2, unit: "kg" },
          finality: "baixa_gpp",
          destination: "Controle GPP",
          occurredAt: "2030-01-10T09:00:00.000Z",
          idempotencyKey: "idem-avaria-001",
        },
        idempotencyKey: "idem-avaria-001",
        message: "Pendente neste aparelho",
        error: new Error("network"),
      }),
    });

    await fillValidAvaria(tree);
    await press(tree, "Continuar avaria");
    await press(tree, "Enviar avaria para central");

    expect(renderedText(tree)).toContain("Pendente neste aparelho");
    await expect(repository.listGppPending()).resolves.toMatchObject([
      { kind: "avaria", idempotencyKey: "idem-avaria-001" },
    ]);
  });

  it("does not create local pending records for central failures", async () => {
    const repository = createRepository();
    const tree = await renderFlow({
      repository,
      client: clientReturning({
        state: "central_failure",
        reason: "authorization",
        message: "Seu acesso nao permite registrar esta acao no Controle GPP.",
        retryable: false,
      }),
    });

    await fillValidAvaria(tree);
    await press(tree, "Continuar avaria");
    await press(tree, "Enviar avaria para central");

    expect(renderedText(tree)).toContain(
      "Seu acesso nao permite registrar esta acao no Controle GPP.",
    );
    await expect(repository.listGppPending()).resolves.toHaveLength(0);
  });
});

function createRepository() {
  let nextId = 1;
  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => `gpp-avaria-local-${nextId++}`,
  });
}

async function renderFlow(input: Partial<Parameters<typeof GppAvariaFlow>[0]> = {}) {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <GppAvariaFlow
        repository={input.repository ?? createRepository()}
        client={input.client}
        storeId="loja-18"
        sector="FLV"
        now={() => "2030-01-10T09:00:00.000Z"}
        createIdempotencyKey={() => "idem-avaria-001"}
        onBack={input.onBack ?? (() => undefined)}
      />,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("GppAvariaFlow did not render.");
  return tree;
}

function clientReturning(result: Awaited<ReturnType<GppClient["createGppAvaria"]>>): GppClient {
  return {
    createGppAvaria: vi.fn(() => Promise.resolve(result)),
    createGppPurchaseRequest: vi.fn(() => Promise.reject(new Error("not used"))),
  };
}

async function fillValidAvaria(tree: ReactTestRenderer): Promise<void> {
  await fill(tree, "Codigo do produto", "789000000001");
  await fill(tree, "Nome ou descricao", "Maca FICTICIA");
  await fill(tree, "Quantidade", "2");
  await press(tree, "kg");
  await press(tree, "Baixa GPP");
  await fill(tree, "Destino", "Controle GPP");
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
  const action = findButton(tree, label);
  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
  });
}

function findButton(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const action = tree.root.findAllByType("Pressable").find((candidate) =>
    String(candidate.props.accessibilityLabel ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(label.toLocaleLowerCase("pt-BR")),
  );
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected action ${label}.`);
  }
  return action;
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
