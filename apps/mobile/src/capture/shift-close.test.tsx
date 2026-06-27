import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
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
      tree!.root.findByProps({ accessibilityLabel: "Encerrar turno com área segura" }).props
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
        .findByProps({ accessibilityLabel: "Encerrar turno com pendências" })
        .props.onPress();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain(
      "Fechamento inseguro pendente de sincronizacao",
    );
    expect(queueUnsafeShiftClose).toHaveBeenCalledTimes(1);
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
