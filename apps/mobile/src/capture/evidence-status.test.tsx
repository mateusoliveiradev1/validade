import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { EvidenceInvalidationPanel } from "./EvidenceInvalidationPanel";
import { EvidenceStatus } from "./EvidenceStatus";
import type { EvidenceUploadQueueRecord } from "./repository";

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
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

const baseEvidence: Pick<
  EvidenceUploadQueueRecord,
  "localEvidenceId" | "state" | "updatedAt" | "lastError" | "uploadedAt"
> = {
  localEvidenceId: "local-evidence-001",
  state: "waiting_upload",
  updatedAt: "2030-01-10T12:00:00.000Z",
};

describe("EvidenceStatus", () => {
  it.each([
    ["waiting_upload", "Aguardando envio"],
    ["uploading", "Enviando evidência"],
    ["uploaded", "Evidência enviada"],
    ["failed", "Falha no envio"],
    ["invalidated", "Evidência invalidada"],
    ["expired", "Arquivo expirado"],
  ] as const)("renders lifecycle label %s", (state, label) => {
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <EvidenceStatus
          evidence={{
            ...baseEvidence,
            state,
            ...(state === "uploaded" ? { uploadedAt: "2030-01-10T12:01:00.000Z" } : {}),
          }}
        />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).toContain(label);
  });

  it("shows retry only for a persisted failed upload", () => {
    const retried: string[] = [];
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <EvidenceStatus
          evidence={{
            ...baseEvidence,
            state: "failed",
            lastError: "Sem conexão.",
          }}
          onRetry={(localEvidenceId) => retried.push(localEvidenceId)}
        />,
      );
    });

    const retry = tree!.root.findByProps({ accessibilityLabel: "Tentar enviar novamente" });

    act(() => {
      retry.props.onPress();
    });

    expect(JSON.stringify(tree!.toJSON())).toContain("Falha no envio");
    expect(JSON.stringify(tree!.toJSON())).toContain("Sem conexão.");
    expect(retried).toEqual(["local-evidence-001"]);
  });
});

describe("EvidenceInvalidationPanel", () => {
  it("requires lead capability and a non-empty reason before invalidating", () => {
    let tree: ReactTestRenderer;
    const invalidations: unknown[] = [];

    act(() => {
      tree = create(
        <EvidenceInvalidationPanel
          canInvalidate
          evidenceLabel="Foto da retirada"
          replacementAssetId="evidence-replacement"
          onInvalidate={(input) => invalidations.push(input)}
        />,
      );
    });

    const disabledButton = tree!.root.findByProps({ accessibilityLabel: "Invalidar evidência" });
    expect(disabledButton.props.accessibilityState.disabled).toBe(true);

    act(() => {
      tree!.root
        .findByProps({ accessibilityLabel: "Motivo da invalidação" })
        .props.onChangeText("Foto desfocada");
    });

    const enabledButton = tree!.root.findByProps({ accessibilityLabel: "Invalidar evidência" });

    act(() => {
      enabledButton.props.onPress();
    });

    expect(invalidations).toEqual([
      {
        reason: "Foto desfocada",
        replacementAssetId: "evidence-replacement",
      },
    ]);
    expect(JSON.stringify(tree!.toJSON())).toContain("continuará no histórico");
  });

  it("blocks non-lead invalidation without showing the destructive action", () => {
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <EvidenceInvalidationPanel
          canInvalidate={false}
          evidenceLabel="Foto da retirada"
          onInvalidate={() => undefined}
        />,
      );
    });

    expect(JSON.stringify(tree!.toJSON())).toContain(
      "Apenas liderança autorizada pode invalidar uma evidência.",
    );
    expect(() => tree!.root.findByProps({ accessibilityLabel: "Invalidar evidência" })).toThrow();
  });
});
