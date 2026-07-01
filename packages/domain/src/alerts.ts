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
  "local_only",
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
  allowOffShiftCriticalAlerts?: boolean;
  cadenceProfile?: AlertCadenceProfile;
}

export const STORE_WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type StoreWeekday = (typeof STORE_WEEKDAYS)[number];

export interface StoreOperatingWindow {
  opensAt: string;
  closesAt: string;
}

export interface StoreOperatingHours {
  timezone: string;
  preOpenLeadMinutes: number;
  allowAfterHoursCriticalAlerts?: boolean;
  weekly: Record<StoreWeekday, readonly StoreOperatingWindow[]>;
}

export type OperationalAlertWindowState = "open" | "pre_open" | "closed";

export interface OperationalAlertWindow {
  state: OperationalAlertWindowState;
  isWithinAlertWindow: boolean;
  allowAfterHoursCriticalAlerts: boolean;
}

const DEFAULT_DAILY_WINDOW = [{ opensAt: "08:00", closesAt: "20:00" }] as const;

export const DEFAULT_STORE_OPERATING_HOURS = {
  timezone: "America/Sao_Paulo",
  preOpenLeadMinutes: 30,
  weekly: {
    sun: DEFAULT_DAILY_WINDOW,
    mon: DEFAULT_DAILY_WINDOW,
    tue: DEFAULT_DAILY_WINDOW,
    wed: DEFAULT_DAILY_WINDOW,
    thu: DEFAULT_DAILY_WINDOW,
    fri: DEFAULT_DAILY_WINDOW,
    sat: DEFAULT_DAILY_WINDOW,
  },
} as const satisfies StoreOperatingHours;

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

  if (
    state.isWithinShift === false &&
    (state.allowOffShiftCriticalAlerts !== true || !isTaskEligibleForOffShiftAlert(task, state))
  ) {
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

export function operationalAlertWindowFor(
  referenceTime: Date | string,
  operatingHours: StoreOperatingHours = DEFAULT_STORE_OPERATING_HOURS,
): OperationalAlertWindow {
  const zoned = zonedWeekdayAndMinute(referenceTime, operatingHours.timezone);
  const currentDayWindows = operatingHours.weekly[zoned.weekday] ?? [];
  const previousDayWindows = operatingHours.weekly[previousWeekday(zoned.weekday)] ?? [];
  const preOpenLeadMinutes = Math.max(0, operatingHours.preOpenLeadMinutes);

  if (currentDayWindows.some((window) => windowStateFor(zoned.minuteOfDay, window) === "open")) {
    return operationalAlertWindow("open", operatingHours);
  }

  if (
    previousDayWindows.some((window) => {
      const opensAt = parseMinuteOfDay(window.opensAt);
      const closesAt = parseMinuteOfDay(window.closesAt);
      return opensAt > closesAt && zoned.minuteOfDay < closesAt;
    })
  ) {
    return operationalAlertWindow("open", operatingHours);
  }

  if (
    currentDayWindows.some(
      (window) => windowStateFor(zoned.minuteOfDay, window, preOpenLeadMinutes) === "pre_open",
    )
  ) {
    return operationalAlertWindow("pre_open", operatingHours);
  }

  return operationalAlertWindow("closed", operatingHours);
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

  if (requiredResolution === "repack_or_loss") {
    return "Reembalar ou avariar";
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

function operationalAlertWindow(
  state: OperationalAlertWindowState,
  operatingHours: StoreOperatingHours,
): OperationalAlertWindow {
  return {
    state,
    isWithinAlertWindow: state !== "closed",
    allowAfterHoursCriticalAlerts: operatingHours.allowAfterHoursCriticalAlerts === true,
  };
}

function windowStateFor(
  minuteOfDay: number,
  window: StoreOperatingWindow,
  preOpenLeadMinutes = 0,
): OperationalAlertWindowState | undefined {
  const opensAt = parseMinuteOfDay(window.opensAt);
  const closesAt = parseMinuteOfDay(window.closesAt);

  if (opensAt === closesAt) {
    return "open";
  }

  if (opensAt < closesAt && minuteOfDay >= opensAt && minuteOfDay < closesAt) {
    return "open";
  }

  if (opensAt > closesAt && (minuteOfDay >= opensAt || minuteOfDay < closesAt)) {
    return "open";
  }

  const preOpenStart = Math.max(0, opensAt - preOpenLeadMinutes);
  if (minuteOfDay >= preOpenStart && minuteOfDay < opensAt) {
    return "pre_open";
  }

  return undefined;
}

function parseMinuteOfDay(value: string): number {
  const match = /^([01]\d|2[0-3]|24):([0-5]\d)$/.exec(value);

  if (match === null) {
    throw new Error(`Invalid store operating time: ${value}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour === 24 && minute !== 0) {
    throw new Error(`Invalid store operating time: ${value}`);
  }

  return hour * 60 + minute;
}

function zonedWeekdayAndMinute(
  referenceTime: Date | string,
  timezone: string,
): { weekday: StoreWeekday; minuteOfDay: number } {
  const date = typeof referenceTime === "string" ? new Date(referenceTime) : referenceTime;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = weekdayFromPart(partValue(parts, "weekday"));
  const hour = Number(partValue(parts, "hour"));
  const minute = Number(partValue(parts, "minute"));

  return { weekday, minuteOfDay: (hour % 24) * 60 + minute };
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: string): string {
  const part = parts.find((candidate) => candidate.type === type);

  if (part === undefined) {
    throw new Error(`Could not read ${type} from zoned date.`);
  }

  return part.value;
}

function weekdayFromPart(value: string): StoreWeekday {
  if (value === "Sun") return "sun";
  if (value === "Mon") return "mon";
  if (value === "Tue") return "tue";
  if (value === "Wed") return "wed";
  if (value === "Thu") return "thu";
  if (value === "Fri") return "fri";
  if (value === "Sat") return "sat";

  throw new Error(`Unsupported weekday value: ${value}`);
}

function previousWeekday(weekday: StoreWeekday): StoreWeekday {
  const index = STORE_WEEKDAYS.indexOf(weekday);
  const previous = STORE_WEEKDAYS[(index + STORE_WEEKDAYS.length - 1) % STORE_WEEKDAYS.length];

  if (previous === undefined) {
    throw new Error(`Unsupported store weekday: ${weekday}`);
  }

  return previous;
}
