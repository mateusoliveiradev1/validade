import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { FutureAttentionRecord, TodayTaskRecord } from "@validade-zero/contracts";
import type { CaptureRepository, TodayTaskRefreshResult } from "./repository";
import { TodayScreen } from "./TodayScreen";

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
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", null, children),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

function createRepository(
  refreshTodayTasks: CaptureRepository["refreshTodayTasks"],
): CaptureRepository {
  return {
    initialize: () => Promise.resolve(),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: () => Promise.reject(new Error("not used")),
    appendObservation: () => Promise.reject(new Error("not used")),
    listRecentLots: () => Promise.resolve([]),
    loadLotDetail: () => Promise.resolve(null),
    refreshTodayTasks,
    listActiveTodayTasks: () => Promise.resolve([]),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask: () => Promise.reject(new Error("not used")),
    loadTodayTask: () => Promise.resolve(null),
  };
}

function refreshWith(tasks: readonly TodayTaskRecord[]): TodayTaskRefreshResult {
  return {
    metadata: {
      refreshedAt: "2030-01-10T09:00:00.000Z",
      activeTaskCount: tasks.length,
      futureAttentionCount: 0,
      source: "today_open",
    },
    tasks,
    futureAttention: [] satisfies readonly FutureAttentionRecord[],
  };
}

function longCriticalTask(): TodayTaskRecord {
  return {
    id: "tarefa-produto-longo-ficticia",
    activeKey: "lote-produto-longo:expired:withdraw_or_loss:root",
    lotId: "lote-produto-longo",
    productDisplayName:
      "Produto FICTICIO com nome muito longo para validar quebra de linha no corredor",
    lotIdentity: {
      identitySource: "printed",
      value: "LOTE-FICTICIO-COM-IDENTIFICADOR-LONGO-2030-AREA-01",
    },
    currentLocation: {
      kind: "other",
      customName: "ilha promocional ficticia com descricao longa na area de venda",
    },
    riskState: "expired",
    severity: "critical",
    dueBucket: "now",
    requiredResolution: "withdraw_or_loss",
    section: "withdraw_now",
    ownerLabel: "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "expired",
      reasons: [{ code: "expired", field: "expiresAt" }],
    },
    priority: 0,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

async function renderTodayScreen(repository: CaptureRepository): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TodayScreen
        repository={repository}
        onRegisterLot={() => undefined}
        onOpenRecentLots={() => undefined}
        now={() => new Date("2030-01-10T12:00:00.000Z")}
      />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) {
    throw new Error("TodayScreen did not render.");
  }

  return tree;
}

describe("Today accessibility and copy hardening", () => {
  it("keeps the Hoje entry labels visible and avoids generic primary labels", async () => {
    const tree = await renderTodayScreen(createRepository(() => Promise.resolve(refreshWith([]))));
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain("Atualizar tarefas");
    expect(rendered).toContain("Registrar lote");
    expect(rendered).toContain("Conferir lotes recentes");
    expect(rendered).not.toContain("Salvar");
    expect(rendered).not.toContain("Enviar");
    expect(rendered).not.toContain("OK");
    expect(rendered).not.toContain("Cancelar");
  });

  it("protects 48dp touch targets and accessible names in local primitives", () => {
    const appPath = fileURLToPath(new URL("../../App.tsx", import.meta.url));
    const captureUiPath = fileURLToPath(new URL("./capture-ui.tsx", import.meta.url));
    const todayPath = fileURLToPath(new URL("./TodayScreen.tsx", import.meta.url));
    const appSource = readFileSync(appPath, "utf8");
    const captureUiSource = readFileSync(captureUiPath, "utf8");
    const todaySource = readFileSync(todayPath, "utf8");

    expect(appSource).toContain("StatusBar.currentHeight");
    expect(appSource).toContain("paddingTop");
    expect(captureUiSource.match(/minHeight:\s*48/g)?.length).toBeGreaterThanOrEqual(3);
    expect(todaySource).toContain("minHeight: 48");
    expect(captureUiSource).toContain("accessibilityLabel={label}");
    expect(todaySource).toContain("accessibilityLabel={`${action}:");
  });

  it("keeps risk meaning in text and allows long operational copy to wrap", async () => {
    const tree = await renderTodayScreen(
      createRepository(() => Promise.resolve(refreshWith([longCriticalTask()]))),
    );
    const rendered = JSON.stringify(tree.toJSON());
    const todayPath = fileURLToPath(new URL("./TodayScreen.tsx", import.meta.url));
    const panelPath = fileURLToPath(new URL("./TaskResolutionPanel.tsx", import.meta.url));
    const todaySource = readFileSync(todayPath, "utf8");
    const panelSource = readFileSync(panelPath, "utf8");

    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain(
      "Produto FICTICIO com nome muito longo para validar quebra de linha no corredor",
    );
    expect(rendered).toContain("LOTE-FICTICIO-COM-IDENTIFICADOR-LONGO-2030-AREA-01");
    expect(rendered).toContain("Severidade Critica");
    expect(rendered).toContain("Validade vencida");
    expect(`${todaySource}\n${panelSource}`).not.toContain("numberOfLines");
    expect(`${todaySource}\n${panelSource}`).not.toContain("ellipsizeMode");
  });

  it("keeps refresh state stable without a standalone spinner", () => {
    const todayPath = fileURLToPath(new URL("./TodayScreen.tsx", import.meta.url));
    const source = readFileSync(todayPath, "utf8");

    expect(source).toContain("Atualizando tarefas");
    expect(source).toContain("disabled={isRefreshing}");
    expect(source).toContain('StatusNotice tone="success"');
    expect(source).toContain("refreshError");
    expect(source).not.toContain("ActivityIndicator");
  });
});
