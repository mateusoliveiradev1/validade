import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { SyncCommandSummary, SyncConflictRecord, SyncQueueSummary } from "@validade-zero/contracts";
import { SyncConflictPanel, SyncQueueSummary as SyncQueueSummaryView } from "./offline-sync-ui";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(name, props, children);

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: host("Text"),
    View: host("View"),
    TextInput: host("TextInput"),
    Pressable: host("Pressable"),
  };
});

const pendingCommand: SyncCommandSummary = {
  id: "sync-command-pending-ficticio",
  kind: "resolve_task",
  state: "pending_sync",
  urgency: "high",
  productDisplayName: "Banana FICTICIA",
  lotIdentity: { identitySource: "printed", value: "LOTE-BANANA-FICTICIO" },
  currentLocation: { kind: "area_de_venda" },
  savedAt: "2030-01-10T12:00:00.000Z",
};

const conflictCommand: SyncCommandSummary = {
  ...pendingCommand,
  id: "sync-command-conflict-ficticio",
  state: "sync_conflict",
  urgency: "critical",
  conflictId: "conflict-ficticio",
};

function conflictRecord(): SyncConflictRecord {
  return {
    id: "conflict-ficticio",
    commandId: conflictCommand.id,
    severity: "critical",
    reason: "A tarefa mudou em outro aparelho.",
    localAction: {
      commandId: conflictCommand.id,
      kind: "resolve_task",
      label: "Retirar agora",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T12:00:00.000Z",
      productDisplayName: conflictCommand.productDisplayName,
      lotIdentity: conflictCommand.lotIdentity,
      currentLocation: conflictCommand.currentLocation,
    },
    remoteChange: {
      kind: "task_changed",
      summary: "A tarefa atual exige nova revisao.",
      changedAt: "2030-01-10T12:01:00.000Z",
    },
    allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
    createdAt: "2030-01-10T12:01:00.000Z",
  };
}

describe("offline sync UI", () => {
  it("renders conflict review before ordinary pending rows", () => {
    const queue: SyncQueueSummary = {
      state: "has_conflict",
      totalCount: 2,
      conflictCount: 1,
      hasCriticalConflict: true,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      oldestPendingCritical: conflictCommand,
      commands: [pendingCommand, conflictCommand],
      updatedAt: "2030-01-10T12:02:00.000Z",
    };
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <SyncQueueSummaryView
          queue={queue}
          onRetry={() => undefined}
          onReviewConflict={() => undefined}
        />,
      );
    });

    const rendered = JSON.stringify(tree!.toJSON());

    expect(rendered.indexOf("Conflito de sincronizacao")).toBeLessThan(
      rendered.indexOf("Pendente central"),
    );
    expect(rendered).toContain("Revisar conflito");
  });

  it("requires a discard reason and sends it through the destructive path", () => {
    const resolved: unknown[] = [];
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <SyncConflictPanel
          conflict={conflictRecord()}
          onResolve={(input) => resolved.push(input)}
          onClose={() => undefined}
        />,
      );
    });

    const discard = tree!.root.findByProps({ accessibilityLabel: "Descartar acao offline" });
    expect(discard.props.accessibilityState.disabled).toBe(true);
    expect(JSON.stringify(tree!.toJSON())).toContain("deixara de ser enviada");

    act(() => {
      tree!.root
        .findByProps({ accessibilityLabel: "Motivo para descartar a acao offline" })
        .props.onChangeText("Duplicada apos revisao central");
    });

    const enabledDiscard = tree!.root.findByProps({
      accessibilityLabel: "Descartar acao offline",
    });

    act(() => {
      enabledDiscard.props.onPress();
    });

    expect(resolved).toEqual([
      {
        action: "discard_offline_action",
        reason: "Duplicada apos revisao central",
      },
    ]);
  });
});
