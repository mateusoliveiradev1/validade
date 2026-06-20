import type { TodayTaskRecord } from "@validade-zero/contracts";

export const todayCopy = {
  title: "Hoje",
  safeHeader: "Area de venda segura",
  safeWithWorkHeader: "Area de venda segura, ainda ha tarefas do turno",
  criticalHeader: (count: number) => `Area de venda com ${count} risco(s) agora`,
  refresh: "Atualizar tarefas",
  emptyHeading: "Area de venda segura agora",
  emptyBody:
    "Nenhum lote exige acao neste momento. Voce pode registrar um lote novo ou conferir os recentes.",
  registerLot: "Registrar lote",
  recentLots: "Conferir lotes recentes",
  refreshError: "Nao foi possivel atualizar agora. Confira a conexao e tente novamente.",
  openTask: "Abrir tarefa",
} as const;

export function todayActionLabel(task: TodayTaskRecord): string {
  if (task.requiredResolution === "withdraw_or_loss") {
    return "Retirar agora";
  }

  if (task.requiredResolution === "check_presence") {
    return task.currentLocation.kind === "area_de_venda" ? "Conferir agora" : "Conferir presenca";
  }

  if (task.requiredResolution === "request_markdown") {
    return "Pedir rebaixa";
  }

  return "Rever em 2h";
}

export function dueLabel(task: TodayTaskRecord): string {
  if (task.dueBucket === "now") {
    return "Agora";
  }

  if (task.dueBucket === "shift") {
    return "Ainda no turno";
  }

  if (task.dueBucket === "today") {
    return "Hoje";
  }

  return "Rever em 2h";
}

export function riskReasonLabel(task: TodayTaskRecord): string {
  const firstReason = task.sourceRisk.reasons[0]?.code;

  if (firstReason === "expired") {
    return "Validade vencida";
  }

  if (firstReason === "expires_in_3_days") {
    return "Risco critico";
  }

  if (firstReason === "expires_in_15_days") {
    return "Janela de rebaixa";
  }

  if (firstReason === "presence_missing" || firstReason === "presence_stale") {
    return "Presenca precisa ser conferida";
  }

  return "Conferir informacao do lote";
}
