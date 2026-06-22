import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { AuditTimelineItem } from "@validade-zero/contracts";
import { AuditTimeline } from "./AuditTimeline";

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
  };
});

const baseEvent = {
  eventId: "audit-mobile-001",
  type: "task.changed",
  store: { storeId: "loja-piloto", storeName: "Loja Piloto" },
  actor: {
    actorId: "ana-ficticia",
    displayName: "Ana FICTICIA",
    roleSnapshot: "collaborator",
  },
  target: {
    type: "task",
    id: "task-001",
    label: "Ovos FICTICIOS - lote OVOS-001",
  },
  occurredAt: "2030-01-10T12:00:00.000Z",
  summary: "Retirada salva neste aparelho.",
  status: "pending_ack",
  metadata: {
    producerKind: "task.action",
    action: "withdraw",
  },
} as const satisfies AuditTimelineItem;

describe("AuditTimeline", () => {
  it("shows pending local time separately from central receipt", () => {
    let tree: ReturnType<typeof create> | undefined;

    act(() => {
      tree = create(<AuditTimeline events={[baseEvent]} />);
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Retirada salva neste aparelho.");
    expect(rendered).toContain("Realizada no aparelho as");
    expect(rendered).toContain("Ainda nao recebida pelo sistema");
    expect(rendered).not.toMatch(/payload|objectKey|signedUrl|base64|uri/i);
  });

  it("keeps reverse chronology and linked corrections append-only", () => {
    const corrected = {
      ...baseEvent,
      eventId: "audit-mobile-002",
      occurredAt: "2030-01-10T12:05:00.000Z",
      receivedAt: "2030-01-10T12:06:00.000Z",
      summary: "Acao offline descartada com motivo.",
      reason: "Erro de selecao",
      status: "invalidated",
      linkedEventId: "audit-mobile-001",
      metadata: { producerKind: "sync.discard" },
    } as const satisfies AuditTimelineItem;
    let tree: ReturnType<typeof create> | undefined;

    act(() => {
      tree = create(<AuditTimeline events={[baseEvent, corrected]} />);
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered.indexOf("Acao offline descartada")).toBeLessThan(
      rendered.indexOf("Retirada salva"),
    );
    expect(rendered).toContain("Registro vinculado ao evento anterior preservado.");
    expect(rendered).toContain("Recebida pelo sistema as");
  });

  it("shows conflict state without replacing the original event", () => {
    const conflict = {
      ...baseEvent,
      eventId: "audit-mobile-003",
      status: "conflict",
      summary: "Conflito de sincronizacao recebido.",
      reason: "A tarefa mudou em outro aparelho.",
    } as const satisfies AuditTimelineItem;
    let tree: ReturnType<typeof create> | undefined;

    act(() => {
      tree = create(<AuditTimeline events={[baseEvent, conflict]} />);
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Conflito pendente de revisao.");
    expect(rendered).toContain("Retirada salva neste aparelho.");
  });
});
