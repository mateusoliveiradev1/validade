import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { GppPendingScreen } from "./GppPendingScreen";
import type { GppPendingRecord } from "./gpp-offline-queue";

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
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

describe("GppPendingScreen", () => {
  it("renders pending empty state and sector-facing purchase statuses", () => {
    const empty = render(<GppPendingScreen onBack={() => undefined} />);
    expect(renderedText(empty)).toContain("Sem pendencias do Controle GPP");

    const tree = render(
      <GppPendingScreen
        onBack={() => undefined}
        purchases={[
          purchase("p1", "solicitado"),
          purchase("p2", "atendido"),
          purchase("p3", "atendido_parcial"),
          purchase("p4", "sem_produto"),
          purchase("p5", "cancelado"),
        ]}
      />,
    );
    const text = renderedText(tree);
    expect(text).toContain("Enviada");
    expect(text).toContain("Atendida");
    expect(text).toContain("Parcial");
    expect(text).toContain("Sem produto");
    expect(text).toContain("Cancelada");
  });

  it("renders local pending and keeps it out of Enviadas hoje", () => {
    const pending = pendingRecord();
    const tree = render(<GppPendingScreen onBack={() => undefined} localPending={[pending]} />);
    expect(renderedText(tree)).toContain("Pendente neste aparelho");
    expect(renderedText(tree)).toContain("a central ainda nao recebeu");

    const sent = render(
      <GppPendingScreen
        mode="sent"
        onBack={() => undefined}
        localPending={[pending]}
        sentToday={[]}
      />,
    );
    expect(renderedText(sent)).toContain("Nenhum envio confirmado hoje");
    expect(renderedText(sent)).not.toContain("Pendente neste aparelho");
  });
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(element);
  });
  if (tree === undefined) throw new Error("GppPendingScreen did not render.");
  return tree;
}

function purchase(purchaseRequestId: string, status: string) {
  return {
    purchaseRequestId,
    store: { storeId: "loja-18", storeName: "Loja 18" },
    sector: "FLV",
    product: { name: `Produto ${purchaseRequestId}` },
    requestedQuantity: { value: 1, unit: "caixa" },
    finality: "Reposicao",
    requester: { actorId: "actor", displayName: "Operador", roleSnapshot: "collaborator" },
    status,
    requestedAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
  } as never;
}

function pendingRecord(): GppPendingRecord {
  return {
    localId: "local-pending",
    kind: "purchase",
    payload: {
      storeId: "loja-18",
      sector: "FLV",
      product: { name: "Banana prata FICTICIA" },
      requestedQuantity: { value: 3, unit: "caixa" },
      finality: "Reposicao",
      requestedAt: "2030-01-10T09:00:00.000Z",
      idempotencyKey: "idem",
    },
    idempotencyKey: "idem",
    state: "pending_retry",
    attemptCount: 0,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

function renderedText(tree: { toJSON(): unknown }): string {
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
