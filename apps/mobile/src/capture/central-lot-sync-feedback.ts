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
  if (blocker === "central_lot_auth_required") {
    return "A central recusou o envio do lote por sessao ou permissao. Entre de novo e confirme que a conta esta na loja correta.";
  }
  if (blocker === "central_lot_network_unavailable") {
    return "Nao foi possivel falar com a central para enviar o lote. A pendencia continua salva neste aparelho; tente novamente com conexao estavel.";
  }
  if (blocker === "central_lot_local_replay_failed") {
    return "Este lote ficou salvo com dados locais incompativeis para envio central. Abra Recentes, confira os campos do lote e cadastre novamente se necessario.";
  }
  return "A central ainda nao confirmou o envio do lote. A pendencia continua salva neste aparelho; atualize a leitura central e tente novamente.";
}
