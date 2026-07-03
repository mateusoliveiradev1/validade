export const GPP_COPY = {
  sending: "Enviando para o Controle GPP...",
  sendingCentral: "Enviando para central...",
  avariaCentralSuccess: "Registrado na central",
  avariaReplayedSuccess: "Registro ja confirmado na central",
  centralSuccess: "Confirmado no Controle GPP.",
  replayedSuccess: "Ja confirmado no Controle GPP.",
  centralFailure: "Controle GPP recusou esta acao. Revise os dados antes de tentar de novo.",
  permissionFailure: "Seu acesso nao permite registrar esta acao no Controle GPP.",
  featureDisabled: "Controle GPP indisponivel para esta loja.",
  localPending: "Pendente neste aparelho",
  retry: "Tentar enviar novamente",
  conflict: "Conflito no Controle GPP",
  discard: "Descartar pendencia",
} as const;

export type GppCopyKey = keyof typeof GPP_COPY;
