export function inviteCreateErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: string }).error;
    if (error === "invalid_invite_expiry") {
      return "O convite pode valer no maximo 30 dias. Escolha uma data mais proxima.";
    }
    if (error === "invalid_invite") {
      return "Confira identificador, nome, papel e validade antes de criar o convite.";
    }
    if (error === "access_denied" || status === 403) {
      return "Entre novamente para criar convites nesta loja.";
    }
  }
  return "Nao foi possivel criar o convite agora.";
}
