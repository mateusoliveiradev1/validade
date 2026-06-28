export type MobileStatusKey =
  | "prepare_blocker"
  | "conflict"
  | "pending_central"
  | "critical"
  | "local_only"
  | "provider_degraded"
  | "camera_degraded"
  | "syncing"
  | "synced_transport"
  | "resolved_central"
  | "safe_central";

export type MobileStatusTone = "critical" | "warning" | "info" | "neutral" | "success";

export type MobileStatusSurface = "notice" | "row" | "badge";

export interface MobileStatusDescriptor {
  key: MobileStatusKey;
  tone: MobileStatusTone;
  priority: number;
  label: string;
  body: string;
  surface: MobileStatusSurface;
  isProvenSafe: boolean;
}

export const mobileStatusDescriptors = {
  prepare_blocker: {
    key: "prepare_blocker",
    tone: "critical",
    priority: 100,
    label: "Preparar turno",
    body: "Conecte uma vez para preparar o turno neste aparelho.",
    surface: "notice",
    isProvenSafe: false,
  },
  conflict: {
    key: "conflict",
    tone: "critical",
    priority: 95,
    label: "Conflito de sincronizacao",
    body: "Revise antes de confirmar esta acao.",
    surface: "notice",
    isProvenSafe: false,
  },
  pending_central: {
    key: "pending_central",
    tone: "warning",
    priority: 85,
    label: "Pendente central",
    body: "Ainda nao use como confirmacao da loja.",
    surface: "notice",
    isProvenSafe: false,
  },
  critical: {
    key: "critical",
    tone: "critical",
    priority: 80,
    label: "Area de venda com risco agora",
    body: "Execute a primeira acao critica antes de tratar a area como segura.",
    surface: "row",
    isProvenSafe: false,
  },
  local_only: {
    key: "local_only",
    tone: "warning",
    priority: 70,
    label: "Local",
    body: "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
    surface: "notice",
    isProvenSafe: false,
  },
  provider_degraded: {
    key: "provider_degraded",
    tone: "warning",
    priority: 60,
    label: "Provedor degradado",
    body: "Alertas remotos ainda precisam do APK Android aprovado. Hoje continua sendo a fonte da verdade.",
    surface: "notice",
    isProvenSafe: false,
  },
  camera_degraded: {
    key: "camera_degraded",
    tone: "warning",
    priority: 55,
    label: "Camera indisponivel",
    body: "Nao foi possivel usar a camera. Registre sem foto ou use a busca manual quando permitido.",
    surface: "notice",
    isProvenSafe: false,
  },
  syncing: {
    key: "syncing",
    tone: "info",
    priority: 50,
    label: "Sincronizando pendencias",
    body: "Aguarde a tentativa atual sem duplicar a acao.",
    surface: "notice",
    isProvenSafe: false,
  },
  synced_transport: {
    key: "synced_transport",
    tone: "neutral",
    priority: 40,
    label: "Sincronizado com a central",
    body: "Verifique se ainda existe bloqueio operacional.",
    surface: "row",
    isProvenSafe: false,
  },
  resolved_central: {
    key: "resolved_central",
    tone: "success",
    priority: 30,
    label: "Resolvido com criterio operacional e confirmacao central",
    body: "O risco saiu da fila ativa porque a central aceitou a resolucao de negocio.",
    surface: "badge",
    isProvenSafe: true,
  },
  safe_central: {
    key: "safe_central",
    tone: "success",
    priority: 20,
    label: "Area segura com leitura central",
    body: "Leitura central atual, sem bloqueios criticos e checklist fisico concluido.",
    surface: "badge",
    isProvenSafe: true,
  },
} as const satisfies Record<MobileStatusKey, MobileStatusDescriptor>;

export const mobileStatusPriorityOrder = Object.values(mobileStatusDescriptors)
  .toSorted((left, right) => right.priority - left.priority)
  .map((descriptor) => descriptor.key);

export function mobileStatusDescriptorFor(key: MobileStatusKey): MobileStatusDescriptor {
  return mobileStatusDescriptors[key];
}

export function sortMobileStatusesByPriority(keys: readonly MobileStatusKey[]): MobileStatusKey[] {
  return [...keys].sort(
    (left, right) =>
      mobileStatusDescriptors[right].priority - mobileStatusDescriptors[left].priority,
  );
}
