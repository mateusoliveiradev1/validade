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
  sections: {
    overdue: "Atrasadas",
    withdraw_now: "Retirar agora",
    check_sales_area: "Conferir na area de venda",
    request_markdown: "Pedir rebaixa",
    follow_up: "Acompanhar",
    future_attention: "Atencao futura",
  },
  incompatibleAction:
    "Esta acao nao resolve este risco. Escolha a acao indicada para manter a area de venda segura.",
  expiredAction:
    "Este lote esta vencido. Para proteger a area de venda, retire ou registre perda.",
  localActor: "Colaborador local",
  destinationLoss: "Destino: Retirada/perda",
  confirmationTitle: "Confirme antes de registrar",
  recheckConsequence:
    "A area de venda continuara bloqueada ate a reconferencia ser concluida.",
  recheckFeedback:
    "Retirada registrada. Reconferir a area de venda antes de marcar como segura.",
  evidenceRequired:
    "Registre foto da area ou informe por que a foto nao foi feita antes de concluir.",
  photoEvidence: "Registrar foto da area",
  noPhotoReasonsTitle: "Sem foto",
  noPhotoReasons: {
    camera_unavailable: "Camera indisponivel",
    no_photo_authorization: "Sem autorizacao de foto",
    environment_not_allowed: "Ambiente sem permissao",
    other: "Outro motivo",
  },
  customNoPhotoReason: "Descreva o motivo sem foto",
  confirmLabels: {
    withdraw: "Confirmar retirada",
    record_loss: "Confirmar perda",
    confirm_presence: "Confirmar presenca",
    request_markdown: "Confirmar rebaixa",
    mark_not_found: "Confirmar nao encontrado",
    mark_probably_sold_out: "Confirmar provavelmente esgotado",
    move_lot: "Confirmar movimentacao",
    complete_recheck: "Confirmar reconferencia",
  },
  resolutionOptions: {
    withdraw: "Retirar agora",
    record_loss: "Registrar perda",
    confirm_presence: "Conferir presenca",
    request_markdown: "Pedir rebaixa",
    mark_not_found: "Marcar como nao encontrado",
    mark_probably_sold_out: "Registrar como provavelmente esgotado",
    move_lot: "Mover lote",
    complete_recheck: "Confirmar reconferencia",
  },
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

  return "Reconferir area de venda";
}

export function dueLabel(task: TodayTaskRecord, referenceTime = new Date()): string {
  if (isOverdueTask(task, referenceTime)) {
    return "Atrasada";
  }

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

export function severityLabel(task: TodayTaskRecord): string {
  if (task.severity === "critical") {
    return "Critica";
  }

  if (task.severity === "high") {
    return "Alta";
  }

  if (task.severity === "medium") {
    return "Media";
  }

  return "Acompanhamento";
}

export function isOverdueTask(task: TodayTaskRecord, referenceTime = new Date()): boolean {
  const createdAt = Date.parse(task.createdAt);

  if (Number.isNaN(createdAt)) {
    return false;
  }

  return task.status === "active" && createdAt < startOfLocalDay(referenceTime).getTime();
}

function startOfLocalDay(referenceTime: Date): Date {
  return new Date(
    referenceTime.getFullYear(),
    referenceTime.getMonth(),
    referenceTime.getDate(),
  );
}
