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
import { todayReadinessFactsFor } from "./ajustes-readiness";
import type { PrepareTurnCacheStatus, SyncQueueSummary } from "@validade-zero/contracts";

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

  it("classifies healthy readiness facts as compact for Today", () => {
    const facts = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: readyCache(),
        prepareTurnSource: "central",
        queue: emptyQueue(),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
      push: { channelState: "active" },
      cameraPermission: "granted",
      buildCompatibility: "atual",
      deviceAuthorization: "valid",
    });

    expect(facts.every((fact) => fact.classification === "compact")).toBe(true);
  });

  it("classifies stale or missing central read as blocking for Today", () => {
    const missing = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: null,
        queue: emptyQueue(),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
    });
    const stale = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: readyCache({ lastCentralReadAt: "2030-01-10T04:00:00.000Z" }),
        prepareTurnSource: "central",
        queue: emptyQueue(),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
    });

    expect(missing[0]).toMatchObject({
      key: "central_read",
      classification: "blocking_for_today",
    });
    expect(stale[0]).toMatchObject({
      key: "central_read",
      classification: "blocking_for_today",
    });
  });

  it("classifies critical sync conflict and critical pending command as blocking for Today", () => {
    const conflict = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: readyCache(),
        prepareTurnSource: "central",
        queue: queueWith({ state: "sync_conflict", urgency: "critical" }),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
    });
    const pending = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: readyCache(),
        prepareTurnSource: "central",
        queue: queueWith({ state: "pending_sync", urgency: "critical" }),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
    });

    expect(conflict[0]?.classification).toBe("blocking_for_today");
    expect(pending[0]?.classification).toBe("blocking_for_today");
  });

  it("keeps Today readiness labels free of private provider, build, and mode values", () => {
    const facts = todayReadinessFactsFor({
      sync: {
        prepareTurnCacheStatus: readyCache(),
        prepareTurnSource: "central",
        queue: emptyQueue(),
        now: new Date("2030-01-10T10:00:00.000Z"),
      },
      push: {
        channelState: "active",
        storedPermissionStatus: "granted",
        requireRemoteProof: true,
      },
      cameraPermission: "denied",
      cameraRequiredForValidation: true,
      buildCompatibility: "incompativel",
      buildRequiredForToday: true,
      deviceAuthorization: "invalid",
    });
    const publicText = facts
      .flatMap((fact) => [fact.label, fact.body, fact.actionLabel ?? ""])
      .join(" ");

    expect(publicText).not.toMatch(
      /ExpoPushToken|rawDeviceId|buildUrl|https:\/\/|eas:\/\/|token|secret|formal_validity|flv_inspection|processed_repack_loss|receiving_monitored/i,
    );
  });
});

function readyCache(overrides: Partial<PrepareTurnCacheStatus> = {}): PrepareTurnCacheStatus {
  return {
    state: "ready",
    source: "central",
    updatedAt: "2030-01-10T09:00:00.000Z",
    lastCentralReadAt: "2030-01-10T09:00:00.000Z",
    staleAfterHours: 4,
    productCount: 3,
    lotCount: 2,
    activeTaskCount: 1,
    conflictCount: 0,
    resolvedHistoryCount: 0,
    ...overrides,
  };
}

function emptyQueue(overrides: Partial<SyncQueueSummary> = {}): SyncQueueSummary {
  return {
    state: "empty",
    totalCount: 0,
    conflictCount: 0,
    hasCriticalConflict: false,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    commands: [],
    updatedAt: "2030-01-10T09:00:00.000Z",
    ...overrides,
  };
}

function queueWith(input: {
  state: "pending_sync" | "sync_conflict";
  urgency: "critical" | "high";
}): SyncQueueSummary {
  return emptyQueue({
    state: input.state === "sync_conflict" ? "has_conflict" : "has_pending",
    totalCount: 1,
    conflictCount: input.state === "sync_conflict" ? 1 : 0,
    hasCriticalConflict: input.state === "sync_conflict" && input.urgency === "critical",
    criticalCount: input.urgency === "critical" ? 1 : 0,
    highCount: input.urgency === "high" ? 1 : 0,
    commands: [
      {
        id: `cmd-${input.state}`,
        kind: "resolve_task",
        state: input.state,
        urgency: input.urgency,
        productDisplayName: "Produto FICTICIO",
        lotIdentity: { identitySource: "printed", value: "LOTE-FICTICIO" },
        currentLocation: { kind: "area_de_venda" },
        savedAt: "2030-01-10T09:30:00.000Z",
        ...(input.state === "sync_conflict" ? { conflictId: "conflict-ficticio" } : {}),
      },
    ],
  });
}
