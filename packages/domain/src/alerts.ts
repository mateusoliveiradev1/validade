import type {
  RequiredResolution,
  TodayDueBucket,
  TodayTaskLocation,
  TodayTaskSeverity,
} from "./tasks";

export const ALERT_AUDIENCES = [
  "responsible",
  "shift_team",
  "leadership",
  "responsible_and_leadership",
] as const;

export type AlertAudience = (typeof ALERT_AUDIENCES)[number];

export const ALERT_ATTEMPT_STATES = [
  "pending",
  "sent",
  "retry_pending",
  "failed",
  "exhausted",
  "suppressed_out_of_shift",
] as const;

export type AlertAttemptState = (typeof ALERT_ATTEMPT_STATES)[number];

export const ALERT_CHANNEL_STATES = [
  "not_requested",
  "requesting",
  "active",
  "denied",
  "unavailable",
  "failed",
] as const;

export type AlertChannelState = (typeof ALERT_CHANNEL_STATES)[number];

export const ESCALATION_STATES = ["not_escalated", "escalated", "leadership_acknowledged"] as const;

export type EscalationState = (typeof ESCALATION_STATES)[number];

export interface AlertCadence {
  notifyOnCreation: true;
  repeatAfterMinutes: number;
  escalateAfterMinutes: number;
}

export type AlertCadenceProfile = Partial<Record<TodayDueBucket, AlertCadence>>;

export const DEFAULT_ALERT_CADENCE_PROFILE = {
  now: {
    notifyOnCreation: true,
    repeatAfterMinutes: 15,
    escalateAfterMinutes: 30,
  },
  shift: {
    notifyOnCreation: true,
    repeatAfterMinutes: 60,
    escalateAfterMinutes: 120,
  },
  today: {
    notifyOnCreation: true,
    repeatAfterMinutes: 60,
    escalateAfterMinutes: 120,
  },
  follow_up: {
    notifyOnCreation: true,
    repeatAfterMinutes: 60,
    escalateAfterMinutes: 120,
  },
} as const satisfies Record<TodayDueBucket, AlertCadence>;

export interface AlertableTaskSnapshot {
  id?: string;
  activeKey?: string;
  productDisplayName: string;
  lotIdentity?: string | { value: string };
  currentLocation: TodayTaskLocation;
  severity: TodayTaskSeverity;
  dueBucket: TodayDueBucket;
  requiredResolution: RequiredResolution;
  status?: "active" | "resolved" | "blocked";
  ownerLabel?: string;
  responsibleActorLabel?: string;
}

export interface AlertTimingState {
  createdAt: string;
  referenceTime: string;
  lastReminderAt?: string;
  escalatedAt?: string;
  escalationState?: EscalationState;
  isWithinShift?: boolean;
  isOverdue?: boolean;
  cadenceProfile?: AlertCadenceProfile;
}

export type NextAlertAction =
  | {
      kind: "send_initial";
      audience: AlertAudience;
      attemptState: "pending";
      escalationState: EscalationState;
      nextReminderAt: string;
    }
  | {
      kind: "send_reminder";
      audience: AlertAudience;
      attemptState: "pending";
      escalationState: EscalationState;
      nextReminderAt: string;
    }
  | {
      kind: "escalate";
      audience: "responsible_and_leadership";
      attemptState: "pending";
      escalationState: "escalated";
      escalatedAt: string;
      nextReminderAt: string;
    }
  | {
      kind: "wait";
      audience: AlertAudience;
      attemptState: "sent";
      escalationState: EscalationState;
      nextReminderAt: string;
    }
  | {
      kind: "suppress_out_of_shift";
      audience: AlertAudience;
      attemptState: "suppressed_out_of_shift";
      escalationState: EscalationState;
    }
  | {
      kind: "none";
      reason: "task_not_active";
      attemptState: "exhausted";
      escalationState: EscalationState;
    };

export interface PrivacySafeNotificationContent {
  title: string;
  body: string;
  actionLabel: "Abrir tarefa";
  action: string;
  productDisplayName: string;
  locationLabel: string;
}

export function cadenceForTask(
  task: Pick<AlertableTaskSnapshot, "dueBucket">,
  cadenceProfile: AlertCadenceProfile = DEFAULT_ALERT_CADENCE_PROFILE,
): AlertCadence {
  return cadenceProfile[task.dueBucket] ?? DEFAULT_ALERT_CADENCE_PROFILE.shift;
}

export function isTaskEligibleForOffShiftAlert(
  task: AlertableTaskSnapshot,
  options: { isOverdue?: boolean } = {},
): boolean {
  if (task.status !== undefined && task.status !== "active") {
    return false;
  }

  if (options.isOverdue === true || task.dueBucket === "now") {
    return true;
  }

  if (task.severity === "critical") {
    return true;
  }

  if (task.severity === "high" && task.currentLocation.kind === "area_de_venda") {
    return true;
  }

  return task.requiredResolution === "sales_area_recheck";
}

export function selectAlertAudience(
  task: Pick<AlertableTaskSnapshot, "responsibleActorLabel" | "ownerLabel">,
  escalationState: EscalationState = "not_escalated",
): AlertAudience {
  if (escalationState === "escalated" || escalationState === "leadership_acknowledged") {
    return "responsible_and_leadership";
  }

  return task.responsibleActorLabel === undefined ? "shift_team" : "responsible";
}

export function getNextAlertAction(
  task: AlertableTaskSnapshot,
  state: AlertTimingState,
): NextAlertAction {
  const escalationState = state.escalationState ?? "not_escalated";

  if (task.status !== undefined && task.status !== "active") {
    return {
      kind: "none",
      reason: "task_not_active",
      attemptState: "exhausted",
      escalationState,
    };
  }

  const audience = selectAlertAudience(task, escalationState);
  const cadence = cadenceForTask(task, state.cadenceProfile);

  if (state.isWithinShift === false && !isTaskEligibleForOffShiftAlert(task, state)) {
    return {
      kind: "suppress_out_of_shift",
      audience,
      attemptState: "suppressed_out_of_shift",
      escalationState,
    };
  }

  const referenceTime = new Date(state.referenceTime);
  const createdAt = new Date(state.createdAt);
  const minutesSinceCreated = differenceInMinutes(referenceTime, createdAt);
  const lastReminderAt =
    state.lastReminderAt === undefined ? undefined : new Date(state.lastReminderAt);

  if (escalationState === "not_escalated" && minutesSinceCreated >= cadence.escalateAfterMinutes) {
    return {
      kind: "escalate",
      audience: "responsible_and_leadership",
      attemptState: "pending",
      escalationState: "escalated",
      escalatedAt: state.referenceTime,
      nextReminderAt: addMinutes(referenceTime, cadence.repeatAfterMinutes),
    };
  }

  if (lastReminderAt === undefined) {
    return {
      kind: "send_initial",
      audience,
      attemptState: "pending",
      escalationState,
      nextReminderAt: addMinutes(referenceTime, cadence.repeatAfterMinutes),
    };
  }

  const nextReminderAt = new Date(addMinutes(lastReminderAt, cadence.repeatAfterMinutes));

  if (referenceTime >= nextReminderAt) {
    return {
      kind: "send_reminder",
      audience,
      attemptState: "pending",
      escalationState,
      nextReminderAt: addMinutes(referenceTime, cadence.repeatAfterMinutes),
    };
  }

  return {
    kind: "wait",
    audience,
    attemptState: "sent",
    escalationState,
    nextReminderAt: nextReminderAt.toISOString(),
  };
}

export function createPrivacySafeNotificationContent(
  task: Pick<
    AlertableTaskSnapshot,
    "productDisplayName" | "currentLocation" | "requiredResolution" | "lotIdentity"
  >,
): PrivacySafeNotificationContent {
  const action = actionLabelForResolution(task.requiredResolution);
  const locationLabel = formatTaskLocation(task.currentLocation);

  return {
    title: `${action}: ${task.productDisplayName}`,
    body: `${locationLabel} - Abrir tarefa`,
    actionLabel: "Abrir tarefa",
    action,
    productDisplayName: task.productDisplayName,
    locationLabel,
  };
}

export function formatTaskLocation(location: TodayTaskLocation): string {
  if (location.kind === "area_de_venda") {
    return "area de venda";
  }

  if (location.kind === "camara_fria") {
    return "camara fria";
  }

  if (location.kind === "ilha_promocional") {
    return "ilha promocional";
  }

  if (location.kind === "retirada_perda") {
    return "retirada/perda";
  }

  if (location.kind === "other") {
    return location.customName;
  }

  return "estoque";
}

function actionLabelForResolution(requiredResolution: RequiredResolution): string {
  if (requiredResolution === "withdraw_or_loss") {
    return "Retirar agora";
  }

  if (requiredResolution === "request_markdown") {
    return "Solicitar rebaixa";
  }

  if (requiredResolution === "approve_markdown") {
    return "Aprovar rebaixa";
  }

  if (requiredResolution === "apply_markdown") {
    return "Aplicar rebaixa";
  }

  if (requiredResolution === "confirm_markdown_on_shelf") {
    return "Conferir etiqueta";
  }

  if (requiredResolution === "sales_area_recheck") {
    return "Conferir area de venda";
  }

  return "Conferir presenca";
}

function differenceInMinutes(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 60_000);
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}
