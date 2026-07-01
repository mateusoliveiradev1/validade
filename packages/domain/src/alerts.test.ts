import { describe, expect, it } from "vitest";
import {
  cadenceForTask,
  createPrivacySafeNotificationContent,
  getNextAlertAction,
  isTaskEligibleForOffShiftAlert,
  operationalAlertWindowFor,
  selectAlertAudience,
  type AlertableTaskSnapshot,
} from "./alerts";

const createdAt = "2030-01-10T09:00:00.000Z";
const salesArea = { kind: "area_de_venda" } as const;
const stock = { kind: "estoque" } as const;

function task(overrides: Partial<AlertableTaskSnapshot> = {}): AlertableTaskSnapshot {
  return {
    id: "tarefa-ficticia-001",
    activeKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
    productDisplayName: "Ovos Brancos FICTICIOS",
    lotIdentity: "LOTE-FICTICIO-001",
    currentLocation: salesArea,
    severity: "critical",
    dueBucket: "now",
    requiredResolution: "withdraw_or_loss",
    status: "active",
    ownerLabel: "Equipe do turno",
    ...overrides,
  };
}

describe("alert cadence policy", () => {
  it("uses exact now and shift cadence thresholds", () => {
    expect(cadenceForTask(task({ dueBucket: "now" }))).toEqual({
      notifyOnCreation: true,
      repeatAfterMinutes: 15,
      escalateAfterMinutes: 30,
    });
    expect(cadenceForTask(task({ dueBucket: "shift" }))).toEqual({
      notifyOnCreation: true,
      repeatAfterMinutes: 60,
      escalateAfterMinutes: 120,
    });
  });

  it("keeps product/category override hooks without requiring admin UI", () => {
    expect(
      cadenceForTask(task({ dueBucket: "shift" }), {
        shift: {
          notifyOnCreation: true,
          repeatAfterMinutes: 45,
          escalateAfterMinutes: 90,
        },
      }),
    ).toEqual({
      notifyOnCreation: true,
      repeatAfterMinutes: 45,
      escalateAfterMinutes: 90,
    });
  });

  it("selects the responsible person first, shift team fallback, and leadership after escalation", () => {
    expect(selectAlertAudience(task({ responsibleActorLabel: "Ana FICTICIA" }))).toBe(
      "responsible",
    );
    expect(selectAlertAudience(task({ responsibleActorLabel: undefined }))).toBe("shift_team");
    expect(selectAlertAudience(task({ responsibleActorLabel: "Ana FICTICIA" }), "escalated")).toBe(
      "responsible_and_leadership",
    );
    expect(
      selectAlertAudience(
        task({ responsibleActorLabel: "Ana FICTICIA" }),
        "leadership_acknowledged",
      ),
    ).toBe("responsible_and_leadership");
  });

  it("keeps ordinary off-shift work active while suppressing only alert sending", () => {
    const ordinaryTask = task({
      severity: "medium",
      dueBucket: "today",
      currentLocation: stock,
      requiredResolution: "request_markdown",
    });

    expect(isTaskEligibleForOffShiftAlert(ordinaryTask)).toBe(false);
    expect(
      getNextAlertAction(ordinaryTask, {
        createdAt,
        referenceTime: "2030-01-10T09:05:00.000Z",
        isWithinShift: false,
      }),
    ).toEqual({
      kind: "suppress_out_of_shift",
      audience: "shift_team",
      attemptState: "suppressed_out_of_shift",
      escalationState: "not_escalated",
    });
    expect(ordinaryTask.status).toBe("active");
  });

  it("classifies which tasks may use a configured plantao exception", () => {
    expect(isTaskEligibleForOffShiftAlert(task({ dueBucket: "today" }), { isOverdue: true })).toBe(
      true,
    );
    expect(isTaskEligibleForOffShiftAlert(task({ severity: "critical", dueBucket: "shift" }))).toBe(
      true,
    );
    expect(isTaskEligibleForOffShiftAlert(task({ severity: "high", dueBucket: "shift" }))).toBe(
      true,
    );
    expect(
      isTaskEligibleForOffShiftAlert(
        task({
          severity: "medium",
          dueBucket: "shift",
          currentLocation: stock,
          requiredResolution: "sales_area_recheck",
        }),
      ),
    ).toBe(true);
  });

  it("suppresses even critical work outside store hours unless plantao is explicitly configured", () => {
    expect(
      getNextAlertAction(task({ dueBucket: "now", severity: "critical" }), {
        createdAt,
        referenceTime: "2030-01-10T03:05:00.000Z",
        isWithinShift: false,
      }),
    ).toEqual({
      kind: "suppress_out_of_shift",
      audience: "shift_team",
      attemptState: "suppressed_out_of_shift",
      escalationState: "not_escalated",
    });

    expect(
      getNextAlertAction(task({ dueBucket: "now", severity: "critical" }), {
        createdAt,
        referenceTime: "2030-01-10T03:05:00.000Z",
        isWithinShift: false,
        allowOffShiftCriticalAlerts: true,
      }),
    ).toMatchObject({
      kind: "send_initial",
      attemptState: "pending",
    });
  });

  it("starts recheck cadence immediately and escalates unresolved critical risk", () => {
    const recheckTask = task({
      activeKey: "recheck:tarefa-vencida-ficticia",
      requiredResolution: "sales_area_recheck",
      severity: "high",
      dueBucket: "now",
    });

    expect(
      getNextAlertAction(recheckTask, {
        createdAt,
        referenceTime: createdAt,
      }),
    ).toMatchObject({
      kind: "send_initial",
      audience: "shift_team",
      attemptState: "pending",
    });
    expect(
      getNextAlertAction(recheckTask, {
        createdAt,
        referenceTime: "2030-01-10T09:30:00.000Z",
      }),
    ).toMatchObject({
      kind: "escalate",
      audience: "responsible_and_leadership",
      escalationState: "escalated",
    });
  });

  it("continues reminders after leadership acknowledgement and never resolves the task", () => {
    const acknowledgedTask = task({ responsibleActorLabel: "Ana FICTICIA" });

    expect(
      getNextAlertAction(acknowledgedTask, {
        createdAt,
        referenceTime: "2030-01-10T09:20:00.000Z",
        lastReminderAt: createdAt,
        escalatedAt: "2030-01-10T09:30:00.000Z",
        escalationState: "leadership_acknowledged",
      }),
    ).toMatchObject({
      kind: "send_reminder",
      audience: "responsible_and_leadership",
      attemptState: "pending",
      escalationState: "leadership_acknowledged",
    });
    expect(acknowledgedTask.status).toBe("active");
  });
});

describe("store operating alert windows", () => {
  it("keeps midnight quiet, releases pre-opening charge, and treats opening hours as active", () => {
    expect(operationalAlertWindowFor("2030-01-10T03:00:00.000Z")).toMatchObject({
      state: "closed",
      isWithinAlertWindow: false,
    });
    expect(operationalAlertWindowFor("2030-01-10T10:45:00.000Z")).toMatchObject({
      state: "pre_open",
      isWithinAlertWindow: true,
    });
    expect(operationalAlertWindowFor("2030-01-10T12:00:00.000Z")).toMatchObject({
      state: "open",
      isWithinAlertWindow: true,
    });
  });
});

describe("privacy-safe notification content", () => {
  it("uses only action, product, location, and Abrir tarefa on the lock screen", () => {
    const content = createPrivacySafeNotificationContent(task());
    const serialized = JSON.stringify(content).toLowerCase();

    expect(content).toEqual({
      title: "Retirar agora: Ovos Brancos FICTICIOS",
      body: "area de venda - Abrir tarefa",
      actionLabel: "Abrir tarefa",
      action: "Retirar agora",
      productDisplayName: "Ovos Brancos FICTICIOS",
      locationLabel: "area de venda",
    });
    expect(serialized).not.toContain("lote-ficticio-001");
    expect(serialized).not.toContain("lotidentity");
  });

  it.each([
    ["approve_markdown", "Aprovar rebaixa"],
    ["apply_markdown", "Aplicar rebaixa"],
    ["confirm_markdown_on_shelf", "Conferir etiqueta"],
  ] as const)("uses privacy-safe markdown label for %s", (requiredResolution, action) => {
    const content = createPrivacySafeNotificationContent(
      task({
        requiredResolution,
        lotIdentity: "LOTE-SIGILOSO-FICTICIO",
      }),
    );
    const serialized = JSON.stringify(content).toLowerCase();

    expect(content.action).toBe(action);
    expect(content.title).toBe(`${action}: Ovos Brancos FICTICIOS`);
    expect(serialized).not.toContain("lote-sigiloso-ficticio");
  });
});
