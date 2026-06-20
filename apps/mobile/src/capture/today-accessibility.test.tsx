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
    requestMarkdown: () => Promise.reject(new Error("not used")),
    decideMarkdown: () => Promise.reject(new Error("not used")),
    recordMarkdownApplication: () => Promise.reject(new Error("not used")),
    confirmMarkdownOnShelf: () => Promise.reject(new Error("not used")),
    loadMarkdownWorkflowForLot: () => Promise.resolve(null),
    listActiveMarkdownWorkflows: () => Promise.resolve([]),
    loadMarkdownEntryState: () =>
      Promise.resolve({
        status: "presence_required",
        label: "Conferir presenca antes da rebaixa",
        lotId: "lote-ficticio",
      }),
    registerAlertDevice: (input) => Promise.resolve(input),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (input) => Promise.resolve({ ...input, result: "task_missing" }),
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

function markdownStageTask(
  requiredResolution: Extract<
    TodayTaskRecord["requiredResolution"],
    "approve_markdown" | "apply_markdown" | "confirm_markdown_on_shelf"
  >,
): TodayTaskRecord {
  const stage =
    requiredResolution === "approve_markdown"
      ? "requested"
      : requiredResolution === "apply_markdown"
        ? "approved"
        : "applied";

  return {
    id: `tarefa-${requiredResolution}`,
    activeKey: `markdown:workflow-${requiredResolution}:${stage}`,
    lotId: `lote-${requiredResolution}`,
    productDisplayName: "Queijo Rebaixa FICTICIO",
    lotIdentity: {
      identitySource: "printed",
      value: `REB-${stage}`,
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: "markdown_due",
    severity: requiredResolution === "approve_markdown" ? "medium" : "high",
    dueBucket: requiredResolution === "approve_markdown" ? "today" : "shift",
    requiredResolution,
    section: "request_markdown",
    ownerLabel: requiredResolution === "approve_markdown" ? "Lideranca local" : "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "markdown_due",
      reasons: [{ code: "expires_in_15_days", field: "markdownWorkflow" }],
    },
    priority: requiredResolution === "confirm_markdown_on_shelf" ? 1 : 2,
    createdAt: "2030-01-09T18:00:00.000Z",
    updatedAt: "2030-01-09T18:00:00.000Z",
    markdownWorkflowId: `workflow-${requiredResolution}`,
    markdownStage: stage,
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

  it("uses explicit overdue markdown text with warning and critical stage distinctions", async () => {
    const tree = await renderTodayScreen(
      createRepository(() =>
        Promise.resolve(
          refreshWith([
            markdownStageTask("approve_markdown"),
            markdownStageTask("apply_markdown"),
            markdownStageTask("confirm_markdown_on_shelf"),
          ]),
        ),
      ),
    );
    const rendered = JSON.stringify(tree.toJSON());
    const todayPath = fileURLToPath(new URL("./TodayScreen.tsx", import.meta.url));
    const todaySource = readFileSync(todayPath, "utf8");

    expect(rendered).toContain("Aprovar rebaixa");
    expect(rendered).toContain("Aprovacao de rebaixa atrasada");
    expect(rendered).toContain("Aguardando lideranca");
    expect(rendered).toContain("Aplicar rebaixa");
    expect(rendered).toContain("Aplicacao de rebaixa atrasada");
    expect(rendered).toContain("Etiqueta ainda nao aplicada");
    expect(rendered).toContain("Conferir etiqueta na area de venda");
    expect(rendered).toContain("Conferencia da etiqueta atrasada");
    expect(rendered).toContain("Etiqueta precisa ser conferida");
    expect(todaySource).toContain("taskRowWarning");
    expect(todaySource).toContain("taskRowCritical");
  });

  it("keeps markdown action and evidence controls text-labeled through existing primitives", () => {
    const panelPath = fileURLToPath(new URL("./TaskResolutionPanel.tsx", import.meta.url));
    const panelSource = readFileSync(panelPath, "utf8");

    expect(panelSource).toContain("<SelectionRow");
    expect(panelSource).toContain("<PrimaryAction");
    expect(panelSource).toContain("<SecondaryAction");
    expect(panelSource).toContain("todayCopy.markdown.approve");
    expect(panelSource).toContain("todayCopy.markdown.reject");
    expect(panelSource).toContain("todayCopy.markdown.rejectionReason");
    expect(panelSource).toContain("todayCopy.markdown.applicationPhoto");
    expect(panelSource).toContain("todayCopy.markdown.finalPhoto");
    expect(panelSource).toContain("todayCopy.markdown.noPhotoGroup");
    expect(panelSource).not.toContain("Pressable");
    expect(panelSource).not.toContain("accessibilityLabel={undefined}");
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
