import { z } from "zod";

export * from "./capture";
export * from "./tasks";
export * from "./alerts";
export * from "./markdown";
export * from "./sync";

export const HEALTH_SERVICE_NAME = "validade-zero-api" as const;

export const ActorRoleSchema = z.enum(["collaborator", "lead", "admin", "system"]);

export const ActorContextSchema = z.object({
  actorId: z.string().min(1),
  displayName: z.string().min(1).optional(),
  role: ActorRoleSchema,
});

export const StoreContextSchema = z.object({
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  locationCode: z.string().min(1).optional(),
});

export const AuditEventSchema = z.object({
  eventId: z.string().min(1),
  occurredAt: z.string().datetime({ offset: true }),
  actor: ActorContextSchema,
  store: StoreContextSchema,
  type: z.string().min(1),
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok"]),
  service: z.literal(HEALTH_SERVICE_NAME),
  checkedAt: z.string().datetime({ offset: true }),
});

export const SafeProbeWriteSchema = z.object({
  value: z.string().min(1).max(120),
  actor: ActorContextSchema.optional(),
  store: StoreContextSchema.optional(),
});

export const SafeProbePayloadSchema = z.object({
  probeId: z.string().min(1),
  value: z.string().min(1).max(120),
  updatedAt: z.string().datetime({ offset: true }),
  actor: ActorContextSchema.optional(),
  store: StoreContextSchema.optional(),
});

export const HealthContract = {
  response: HealthResponseSchema,
} as const;

export const SafeProbeContract = {
  write: SafeProbeWriteSchema,
  payload: SafeProbePayloadSchema,
} as const;

export type ActorRole = z.infer<typeof ActorRoleSchema>;
export type ActorContext = z.infer<typeof ActorContextSchema>;
export type StoreContext = z.infer<typeof StoreContextSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type SafeProbeWriteInput = z.infer<typeof SafeProbeWriteSchema>;
export type SafeProbePayload = z.infer<typeof SafeProbePayloadSchema>;
