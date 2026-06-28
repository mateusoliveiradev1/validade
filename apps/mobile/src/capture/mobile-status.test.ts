import type { ReactNode } from "react";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import {
  mobileStatusDescriptors,
  mobileStatusPriorityOrder,
  sortMobileStatusesByPriority,
} from "./mobile-status";
import { StatusNotice } from "./capture-ui";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: host("Text"),
    TextInput: host("TextInput"),
    View: host("View"),
    Pressable: host("Pressable"),
  };
});

describe("mobile status vocabulary", () => {
  it("keeps safety proof separate from sync transport", () => {
    expect(mobileStatusDescriptors.synced_transport).toMatchObject({
      label: "Sincronizado com a central",
      isProvenSafe: false,
      tone: "neutral",
    });
    expect(mobileStatusDescriptors.resolved_central).toMatchObject({
      label: "Resolvido com criterio operacional e confirmacao central",
      isProvenSafe: true,
      tone: "success",
    });
  });

  it("orders blockers and conflicts above pending central, local, degraded, and history states", () => {
    expect(mobileStatusPriorityOrder.slice(0, 4)).toEqual([
      "prepare_blocker",
      "conflict",
      "pending_central",
      "critical",
    ]);
    expect(
      sortMobileStatusesByPriority([
        "resolved_central",
        "local_only",
        "provider_degraded",
        "conflict",
        "synced_transport",
        "pending_central",
      ]),
    ).toEqual([
      "conflict",
      "pending_central",
      "local_only",
      "provider_degraded",
      "synced_transport",
      "resolved_central",
    ]);
  });

  it("uses the required Portuguese labels for operational states", () => {
    expect(mobileStatusDescriptors.local_only.label).toBe("Local");
    expect(mobileStatusDescriptors.pending_central.label).toBe("Pendente central");
    expect(mobileStatusDescriptors.synced_transport.label).toBe("Sincronizado com a central");
    expect(mobileStatusDescriptors.resolved_central.label).toBe(
      "Resolvido com criterio operacional e confirmacao central",
    );
    expect(mobileStatusDescriptors.conflict.label).toBe("Conflito de sincronizacao");
  });

  it("renders warning and critical notices without accent-green success treatment", () => {
    let warning: ReactTestRenderer | undefined;
    let critical: ReactTestRenderer | undefined;

    act(() => {
      warning = create(
        React.createElement(
          StatusNotice,
          { title: "Pendente central", tone: "warning" },
          "Ainda nao use como confirmacao da loja.",
        ),
      );
      critical = create(
        React.createElement(
          StatusNotice,
          { title: "Conflito de sincronizacao", tone: "critical" },
          "Revise antes de confirmar esta acao.",
        ),
      );
    });

    expect(JSON.stringify(warning?.toJSON())).toContain("#FFF7E2");
    expect(JSON.stringify(critical?.toJSON())).toContain("#FFF0EE");
    expect(JSON.stringify(warning?.toJSON())).not.toContain("#166534");
    expect(JSON.stringify(critical?.toJSON())).not.toContain("#166534");
  });
});
