export const PHYSICAL_CONFIRMATION_STATUSES = [
  "present",
  "moved",
  "withdrawn",
  "loss",
  "not_found",
  "probably_sold_out",
] as const;

export type PhysicalConfirmationStatus = (typeof PHYSICAL_CONFIRMATION_STATUSES)[number];

export interface PhysicalConfirmation {
  status: PhysicalConfirmationStatus;
  confirmedAt: string;
  approximateQuantity?: number;
}

export type PhysicalConfirmationFreshness =
  | {
      status: "missing";
    }
  | {
      status: "fresh";
      ageHours: number;
      confirmation: PhysicalConfirmation;
    }
  | {
      status: "stale";
      ageHours: number;
      confirmation: PhysicalConfirmation;
    };

export interface PhysicalConfirmationFreshnessInput {
  confirmation?: PhysicalConfirmation;
  currentTimestamp: string;
  maxPhysicalConfirmationAgeHours: number;
}

export function classifyPhysicalConfirmationFreshness(
  input: PhysicalConfirmationFreshnessInput,
): PhysicalConfirmationFreshness {
  if (!input.confirmation) {
    return { status: "missing" };
  }

  const ageHours =
    (Date.parse(input.currentTimestamp) - Date.parse(input.confirmation.confirmedAt)) /
    (60 * 60 * 1000);

  if (ageHours > input.maxPhysicalConfirmationAgeHours) {
    return {
      status: "stale",
      ageHours,
      confirmation: input.confirmation,
    };
  }

  return {
    status: "fresh",
    ageHours,
    confirmation: input.confirmation,
  };
}
