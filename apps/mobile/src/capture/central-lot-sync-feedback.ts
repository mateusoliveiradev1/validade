import { isPendingCentralLotSyncError, type PendingCentralLotSyncBlocker } from "./repository";

export function pendingCentralLotSyncFeedback(error: unknown): string | undefined {
  if (!isPendingCentralLotSyncError(error)) return undefined;
  return centralLotSyncBlockerFeedback(error.blocker);
}

function centralLotSyncBlockerFeedback(blocker: PendingCentralLotSyncBlocker): string {
  if (blocker === "central_write_unavailable") {
    return "Este APK ainda nao tem envio central de lote habilitado. Instale o APK aprovado mais recente.";
  }
  if (blocker === "central_read_required") {
    return "A leitura central ainda nao esta pronta neste aparelho. Prepare o turno pela central e tente sincronizar de novo.";
  }
  if (blocker === "central_product_not_ready") {
    return "O lote ficou salvo neste aparelho porque o produto ainda nao apareceu como validado ou reutilizavel na central. Atualize a leitura central depois da validacao.";
  }
  return "A central recusou o envio do lote. Entre de novo se a sessao venceu ou use uma conta operacional com permissao de turno.";
}
