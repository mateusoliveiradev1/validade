export const INVITE_MAX_TTL_MS = 30 * 86_400_000;
export const INVITE_DEFAULT_TTL_MS = 7 * 86_400_000;

export function formatDateTimeLocal(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultInviteExpiryLocal(now = Date.now()): string {
  return formatDateTimeLocal(new Date(now + INVITE_DEFAULT_TTL_MS));
}

export function inviteExpiryBoundsLocal(now = Date.now()): { min: string; max: string } {
  return {
    min: formatDateTimeLocal(new Date(now + 60_000)),
    max: formatDateTimeLocal(new Date(now + INVITE_MAX_TTL_MS)),
  };
}

export function parseInviteExpiryLocal(value: string): Date | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function validateInviteExpiryLocal(value: string, now = Date.now()): string | undefined {
  const expiresAt = parseInviteExpiryLocal(value);
  if (expiresAt === undefined) {
    return "Escolha uma data e hora validas para o convite.";
  }
  if (expiresAt.getTime() <= now) {
    return "A validade do convite precisa ser no futuro.";
  }
  if (expiresAt.getTime() - now > INVITE_MAX_TTL_MS) {
    return "O convite pode valer no maximo 30 dias. Escolha uma data mais proxima.";
  }
  return undefined;
}
