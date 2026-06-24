import type { TodayTaskRecord } from "@validade-zero/contracts";

export const todayCopy = {
  title: "Hoje",
  safeHeader: "Area de venda segura",
  safeWithWorkHeader: "Area de venda segura, ainda ha tarefas do turno",
  criticalHeader: (count: number) => `Area de venda com ${count} risco(s) agora`,
  refresh: "Atualizar tarefas",
  refreshSuccess: (activeTaskCount: number) =>
    activeTaskCount === 0
      ? "Atualizacao concluida. Nenhuma tarefa ativa."
      : `Atualizacao concluida. ${activeTaskCount} ${activeTaskCount === 1 ? "tarefa ativa" : "tarefas ativas"}.`,
  emptyHeading: "Area de venda segura agora",
  emptyBody:
    "Nenhum lote exige acao neste momento. Registre um lote novo ou confira os recentes para manter a operacao atualizada.",
  registerLot: "Registrar lote",
  recentLots: "Conferir lotes recentes",
  refreshError: "Nao foi possivel atualizar agora. Confira a conexao e tente novamente.",
  openTask: "Abrir tarefa",
  navigation: {
    alreadyHome: "Voce ja esta em Hoje. Use Sair para encerrar a sessao com seguranca.",
  },
  sync: {
    primary: "Sincronizar pendencias",
    offlineReady: "Pronto para operar sem internet",
    offlineMode: "Sem internet agora. Usando tarefas salvas neste aparelho.",
    localSaved: "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
    pending: "Pendente de sincronizacao",
    syncing: "Sincronizando pendencias",
    syncedAt: (label: string) => `Sincronizado as ${label}.`,
    retry: "Tentar sincronizar novamente",
    reviewConflict: "Revisar conflito",
    keepLocal: "Manter acao local e reenviar",
    useCurrent: "Atualizar pela tarefa atual",
    discardOffline: "Descartar acao offline",
    allSynced: "Tudo sincronizado neste aparelho",
    allSyncedBody: "Nenhuma acao esta pendente. Continue conferindo as tarefas em Hoje.",
    unavailable: "Conecte uma vez para preparar o trabalho offline",
    unavailableBody:
      "Ainda nao ha tarefas salvas neste aparelho. Conecte para baixar as tarefas do turno e os dados essenciais dos lotes.",
    failed:
      "Nao foi possivel sincronizar. As acoes continuam salvas neste aparelho; confira a conexao e tente novamente.",
    conflict: "Conflito de sincronizacao. Revise antes de confirmar esta acao.",
    stale:
      "Tarefas salvas podem estar desatualizadas. Sincronize antes de marcar a area como segura.",
    retryHelper: "Tentaremos novamente sem duplicar a acao.",
    discardReason: "Motivo para descartar a acao offline",
    discardConfirmation:
      "Descartar acao offline: informe o motivo. Esta acao deixara de ser enviada e a tarefa atual precisara ser revisada.",
  },
  push: {
    activate: "Ativar alertas do turno",
    notNow: "Voce pode ativar depois.",
    retry: "Tentar novamente",
    openSettings: "Abrir configuracoes do aparelho",
    openTask: "Abrir tarefa",
    educationTitle: "Alertas ajudam a cobrar, mas Hoje continua sendo a fonte da verdade",
    educationBody:
      "Ative alertas para receber lembretes de tarefas criticas. Nenhuma tarefa sera resolvida pela notificacao; a confirmacao fisica continua no app.",
    active: "Alertas do turno ativos neste aparelho.",
    denied: "Alertas desativados neste aparelho. As tarefas continuam ativas em Hoje.",
    unavailable:
      "Alertas remotos ainda nao estao prontos neste aparelho. As tarefas continuam ativas em Hoje.",
    nativeSetupRequired:
      "Alertas remotos precisam da configuracao Android do Firebase neste APK. Hoje continua sendo a fonte da verdade ate o novo build.",
    failed:
      "Alerta falhou. A tarefa continua ativa em Hoje e precisa ser cobrada manualmente se necessario.",
    retryPending: "Alerta pendente. Vamos tentar novamente sem esconder a tarefa.",
    alertActive: "Alerta ativo",
    nextReminder: (label: string) => `Novo lembrete em ${label}`,
    pending: "Push pendente",
    failedStatus: "Push falhou",
    escalatedAt: (label: string) => `Lideranca avisada as ${label}`,
    escalatedAudience: "Cobrando responsavel e lideranca",
    acknowledge: "Confirmar recebimento da cobranca",
    acknowledged: (label: string) =>
      `Recebimento confirmado pela lideranca as ${label}. A tarefa continua aberta ate a resolucao fisica.`,
    staleUpdated: "Esta pendencia foi atualizada. Abra a tarefa atual em Hoje.",
    staleResolved: "Esta pendencia ja foi resolvida fisicamente. Confira as tarefas restantes.",
    staleMissing: "Nao foi possivel abrir esta notificacao. Confira as tarefas ativas em Hoje.",
  },
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
  expiredAction: "Este lote esta vencido. Para proteger a area de venda, retire ou registre perda.",
  fallbackActor: "Pessoa da operacao",
  destinationLoss: "Destino: Retirada/perda",
  confirmationTitle: "Confirme antes de registrar",
  recheckConsequence: "A area de venda continuara bloqueada ate a reconferencia ser concluida.",
  recheckFeedback: "Retirada registrada. Reconferir a area de venda antes de marcar como segura.",
  markdown: {
    primaryRequest: "Solicitar rebaixa",
    earlyRequest: "Solicitar rebaixa antecipada",
    presenceGate: "Conferir presenca antes da rebaixa",
    approve: "Aprovar rebaixa",
    reject: "Reprovar rebaixa",
    application: "Registrar etiqueta aplicada",
    finalConfirmation: "Confirmar etiqueta na area de venda",
    delayedApproval: "Aprovacao de rebaixa atrasada",
    delayedApplication: "Aplicacao de rebaixa atrasada",
    delayedFinalConfirmation: "Conferencia da etiqueta atrasada",
    rejectionReason: "Motivo da reprovacao",
    rejectionWarning: "Reprovar rebaixa encerra este fluxo e o lote volta ao monitoramento.",
    applicationEvidenceTitle: "Comprove a etiqueta aplicada",
    applicationPhoto: "Registrar foto da etiqueta/preco",
    finalEvidenceTitle: "Comprove na area de venda",
    finalPhoto: "Registrar foto da etiqueta na area de venda",
    noPhotoGroup: "Sem foto",
    noPhotoCustomField: "Descreva o motivo sem foto",
    earlyReasonLabel: "Por que esta rebaixa esta sendo pedida antes da janela?",
    missingWorkflow:
      "Nao foi possivel avancar a rebaixa. Confira a presenca fisica do lote e tente novamente.",
    requestCreated: "Rebaixa solicitada. Acompanhe a proxima etapa em Hoje.",
    alreadyActivePrefix: "Rebaixa em andamento",
    stageReasons: {
      approve_markdown: "Aguardando lideranca",
      apply_markdown: "Etiqueta ainda nao aplicada",
      confirm_markdown_on_shelf: "Etiqueta precisa ser conferida",
    },
  },
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
    request_markdown: "Solicitar rebaixa",
    approve_markdown: "Aprovar rebaixa",
    reject_markdown: "Reprovar rebaixa",
    apply_markdown: "Registrar etiqueta aplicada",
    confirm_markdown_on_shelf: "Confirmar etiqueta na area de venda",
    mark_not_found: "Confirmar nao encontrado",
    mark_probably_sold_out: "Confirmar provavelmente esgotado",
    move_lot: "Confirmar movimentacao",
    complete_recheck: "Confirmar reconferencia",
  },
  resolutionOptions: {
    withdraw: "Retirar agora",
    record_loss: "Registrar perda",
    confirm_presence: "Conferir presenca",
    request_markdown: "Solicitar rebaixa",
    approve_markdown: "Aprovar rebaixa",
    reject_markdown: "Reprovar rebaixa",
    apply_markdown: "Aplicar rebaixa",
    confirm_markdown_on_shelf: "Conferir etiqueta na area de venda",
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
    return "Solicitar rebaixa";
  }

  if (task.requiredResolution === "approve_markdown") {
    return "Aprovar rebaixa";
  }

  if (task.requiredResolution === "apply_markdown") {
    return "Aplicar rebaixa";
  }

  if (task.requiredResolution === "confirm_markdown_on_shelf") {
    return "Conferir etiqueta na area de venda";
  }

  return "Reconferir area de venda";
}

export function dueLabel(task: TodayTaskRecord, referenceTime = new Date()): string {
  if (isOverdueTask(task, referenceTime)) {
    if (task.requiredResolution === "approve_markdown") {
      return todayCopy.markdown.delayedApproval;
    }

    if (task.requiredResolution === "apply_markdown") {
      return todayCopy.markdown.delayedApplication;
    }

    if (task.requiredResolution === "confirm_markdown_on_shelf") {
      return todayCopy.markdown.delayedFinalConfirmation;
    }

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
  if (task.requiredResolution === "approve_markdown") {
    return todayCopy.markdown.stageReasons.approve_markdown;
  }

  if (task.requiredResolution === "apply_markdown") {
    return todayCopy.markdown.stageReasons.apply_markdown;
  }

  if (task.requiredResolution === "confirm_markdown_on_shelf") {
    return todayCopy.markdown.stageReasons.confirm_markdown_on_shelf;
  }

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

export function formatAlertTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeReminderLabel(value: string, referenceTime = new Date()): string {
  const reminderAt = Date.parse(value);

  if (Number.isNaN(reminderAt)) {
    return "alguns minutos";
  }

  const diffMinutes = Math.max(0, Math.ceil((reminderAt - referenceTime.getTime()) / 60_000));

  if (diffMinutes <= 1) {
    return "1 min";
  }

  return `${diffMinutes} min`;
}

function startOfLocalDay(referenceTime: Date): Date {
  return new Date(referenceTime.getFullYear(), referenceTime.getMonth(), referenceTime.getDate());
}
