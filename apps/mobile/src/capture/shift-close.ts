import {
  ShiftCloseSafeRequestSchema,
  ShiftCloseUnsafeRequestSchema,
  type ShiftCloseSafeRequest,
  type ShiftCloseUnsafeRequest,
} from "@validade-zero/contracts";
import type { ShiftCloseCompletionRecord } from "./repository";

export type ShiftCloseCompletion = ShiftCloseCompletionRecord;

export function createUnsafeShiftCloseRequest(
  input: ShiftCloseUnsafeRequest,
): ShiftCloseUnsafeRequest {
  return ShiftCloseUnsafeRequestSchema.parse(input);
}

export function createSafeShiftCloseRequest(input: ShiftCloseSafeRequest): ShiftCloseSafeRequest {
  return ShiftCloseSafeRequestSchema.parse(input);
}
