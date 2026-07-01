import {
  ShiftCloseSafeRequestSchema,
  ShiftCloseUnsafeRequestSchema,
  type ShiftCloseSafeRequest,
  type ShiftCloseUnsafeRequest,
} from "@validade-zero/contracts";

export type ShiftCloseCompletion =
  | {
      verdict: "safe";
      occurredAt: string;
    }
  | {
      verdict: "unsafe";
      occurredAt: string;
      continuityOwner: string;
      continuityDeadline: string;
      pendingSync: boolean;
    };

export function createUnsafeShiftCloseRequest(
  input: ShiftCloseUnsafeRequest,
): ShiftCloseUnsafeRequest {
  return ShiftCloseUnsafeRequestSchema.parse(input);
}

export function createSafeShiftCloseRequest(input: ShiftCloseSafeRequest): ShiftCloseSafeRequest {
  return ShiftCloseSafeRequestSchema.parse(input);
}
