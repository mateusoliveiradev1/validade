import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { PrepareTurnCacheStatus, ShiftClosureSnapshot } from "@validade-zero/contracts";
import type { CaptureRepository } from "./repository";
import { ShiftCloseScreen } from "./ShiftCloseScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    ScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
    StyleSheet: { create: <T extends Record<string, unknown>>(styles: T) => styles },
  };
});

const queueUnsafeShiftClose = vi.fn((input: unknown) =>
  Promise.resolve({
    ...(input as { localCloseId: string; request: unknown }),
    state: "pending_sync",
    createdAt: "2030-01-10T18:00:00.000Z",
    updatedAt: "2030-01-10T18:00:00.000Z",
    attemptCount: 0,
  }),
);

const repository = {
  listActiveTodayTasks: () =>
    Promise.resolve([
      {
        id: "task-expired-ficticia",
        status: "active",
        riskState: "expired",
        severity: "critical",
        requiredResolution: "withdraw_or_loss",
      },
    ]),
  loadOfflineCacheStatus: () => Promise.resolve({ state: "offline_ready" }),
  listSyncQueue: () => Promise.resolve({ commands: [] }),
  listEvidenceUploads: () => Promise.resolve([]),
  listShiftCloseOutbox: () => Promise.resolve([]),
  queueUnsafeShiftClose,
} as unknown as CaptureRepository;

function normalized(value: unknown): string {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function actionByLabel(tree: ReactTestRenderer, label: string) {
  const action = tree.root
    .findAllByType("Pressable")
    .find((candidate) =>
      normalized(candidate.props.accessibilityLabel).includes(normalized(label)),
    );

  if (action === undefined) {
    throw new Error(`Expected action ${label}.`);
  }

  return action;
}

async function pressAction(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = actionByLabel(tree, label);
  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
  });
}

function readyCentralCache(): PrepareTurnCacheStatus {
  return {
    state: "ready",
    source: "central",
    updatedAt: "2030-01-10T18:00:00.000Z",
    lastCentralReadAt: "2030-01-10T18:00:00.000Z",
    staleAfterHours: 4,
    productCount: 1,
    lotCount: 1,
    activeTaskCount: 0,
    conflictCount: 0,
    resolvedHistoryCount: 0,
  };
}

function emptyCentralCache(): PrepareTurnCacheStatus {
  return {
    state: "needs_first_central_read",
    source: "central",
    updatedAt: "2030-01-10T18:00:00.000Z",
    staleAfterHours: 4,
    productCount: 0,
    lotCount: 0,
    activeTaskCount: 0,
    conflictCount: 0,
    resolvedHistoryCount: 0,
  };
}

function safeClosure(): ShiftClosureSnapshot {
  return {
    closureId: "shift-close-safe-001",
    idempotencyKey: "safe-shift-close:2030-01-10T18:00:00.000Z",
    storeId: "loja-local",
    storeName: "Loja Local",
    verdict: "safe",
    eligibility: "eligible_safe",
    blockers: [],
    checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
    actor: {
      actorId: "lideranca-local",
      displayName: "Lideranca Local",
      roleSnapshot: "lead",
    },
    occurredAt: "2030-01-10T18:00:00.000Z",
    receivedAt: "2030-01-10T18:00:01.000Z",
    ruleVersion: "phase-10-central-v1",
  };
}

describe("ShiftCloseScreen", () => {
  it("keeps safe close blocked and saves a required unsafe handoff locally", async () => {
    let tree: ReactTestRenderer;
    await act(() => {
      tree = create(
        <ShiftCloseScreen
          repository={repository}
          canCloseShift
          onBack={() => undefined}
          now={() => new Date("2030-01-10T18:00:00.000Z")}
        />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("passagem insegura continua disponível");
    expect(
      tree!.root.findByProps({ accessibilityLabel: "Encerrar turno com area segura" }).props
        .disabled,
    ).toBe(true);

    await act(() => {
      tree!.root
        .findByProps({ accessibilityLabel: "Motivo" })
        .props.onChangeText("Risco vencido ainda em conferência.");
      tree!.root
        .findByProps({ accessibilityLabel: "Responsável pela continuidade" })
        .props.onChangeText("Lideranca Ficticia Noturna");
      tree!.root
        .findByProps({ accessibilityLabel: "Prazo (ISO)" })
        .props.onChangeText("2030-01-10T19:00:00.000Z");
      tree!.root
        .findByProps({ accessibilityLabel: "Nota para a passagem" })
        .props.onChangeText("Retomar retirada física.");
    });

    await act(() => {
      tree!.root
        .findByProps({ accessibilityLabel: "Encerrar turno com pendencias" })
        .props.onPress();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain(
      "Fechamento inseguro pendente de sincronizacao",
    );
    expect(queueUnsafeShiftClose).toHaveBeenCalledTimes(1);
  });

  it("keeps safe close blocked when the central turn read is still empty", async () => {
    let tree: ReactTestRenderer;
    await act(() => {
      tree = create(
        <ShiftCloseScreen
          repository={{
            ...repository,
            listActiveTodayTasks: () => Promise.resolve([]),
          }}
          canCloseShift
          onBack={() => undefined}
          onSafeClose={() => Promise.resolve(safeClosure())}
          prepareTurnCacheStatus={emptyCentralCache()}
          prepareTurnSource="central"
          now={() => new Date("2030-01-10T18:00:00.000Z")}
        />,
      );
    });

    await pressAction(tree!, "Conferi fisicamente");
    await pressAction(tree!, "Expliquei as pendencias");
    await pressAction(tree!, "A passagem esta pronta");

    expect(JSON.stringify(tree!.toJSON())).toContain(
      "A leitura central ainda nao confirma a seguranca da area de venda.",
    );
    expect(actionByLabel(tree!, "Encerrar turno com area segura").props.disabled).toBe(true);
  });

  it("submits a safe close to the central validator when local and central checks are ready", async () => {
    const onSafeClose = vi.fn(() => Promise.resolve(safeClosure()));
    let tree: ReactTestRenderer;
    await act(() => {
      tree = create(
        <ShiftCloseScreen
          repository={{
            ...repository,
            listActiveTodayTasks: () => Promise.resolve([]),
          }}
          canCloseShift
          onBack={() => undefined}
          onSafeClose={onSafeClose}
          prepareTurnCacheStatus={readyCentralCache()}
          prepareTurnSource="central"
          now={() => new Date("2030-01-10T18:00:00.000Z")}
        />,
      );
    });

    await pressAction(tree!, "Conferi fisicamente");
    await pressAction(tree!, "Expliquei as pendencias");
    await pressAction(tree!, "A passagem esta pronta");

    expect(actionByLabel(tree!, "Encerrar turno com area segura").props.disabled).toBe(false);
    await pressAction(tree!, "Encerrar turno com area segura");

    expect(onSafeClose).toHaveBeenCalledWith({
      storeId: "loja-local",
      verdict: "safe",
      checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
      occurredAt: "2030-01-10T18:00:00.000Z",
      idempotencyKey: "safe-shift-close:2030-01-10T18:00:00.000Z",
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("Turno aceito pela central");
  });

  it("explains neutral permission denial to collaborators", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <ShiftCloseScreen repository={repository} canCloseShift={false} onBack={() => undefined} />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("exige liderança autorizada");
  });
});
