import {
  ShiftCloseSafeRequestSchema,
  ShiftCloseUnsafeRequestSchema,
  type ShiftCloseSafeRequest,
  type ShiftCloseUnsafeRequest,
} from "@validade-zero/contracts";

export function createUnsafeShiftCloseRequest(
  input: ShiftCloseUnsafeRequest,
): ShiftCloseUnsafeRequest {
  return ShiftCloseUnsafeRequestSchema.parse(input);
}

export function createSafeShiftCloseRequest(input: ShiftCloseSafeRequest): ShiftCloseSafeRequest {
  return ShiftCloseSafeRequestSchema.parse(input);
}
