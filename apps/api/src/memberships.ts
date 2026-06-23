import {
  AuditEventRecordSchema,
  ChangeMembershipRoleRequestSchema,
  CreateMembershipRequestSchema,
  ManagedStoreMembershipSchema,
  RevokeMembershipRequestSchema,
  type ChangeMembershipRoleRequest,
  type CreateMembershipRequest,
  type ManagedStoreMembership,
  type RevokeMembershipRequest,
} from "@validade-zero/contracts";
import type {
  ManagedMembershipRecord,
  MembershipManagementRepository,
} from "@validade-zero/database/membership-repository";
import type { AuthorizedActorContext } from "@validade-zero/domain";
import type { AuditEventRepository } from "./audit";

export interface MembershipService {
  list(input: {
    actorContext: AuthorizedActorContext;
    storeId: string;
  }): Promise<readonly ManagedStoreMembership[]>;
  grant(input: {
    actorContext: AuthorizedActorContext;
    request: CreateMembershipRequest;
  }): Promise<{ membership: ManagedStoreMembership; replayed: boolean }>;
  changeRole(input: {
    actorContext: AuthorizedActorContext;
    membershipId: string;
    request: ChangeMembershipRoleRequest;
  }): Promise<{ membership: ManagedStoreMembership; replayed: boolean }>;
  revoke(input: {
    actorContext: AuthorizedActorContext;
    membershipId: string;
    request: RevokeMembershipRequest;
  }): Promise<{ membership: ManagedStoreMembership; replayed: boolean }>;
}

export function createMembershipService(input: {
  repository: MembershipManagementRepository;
  auditRepository: AuditEventRepository;
  now?: () => Date;
  createId?: () => string;
}): MembershipService {
  const now = input.now ?? (() => new Date());
  const createId = input.createId ?? (() => crypto.randomUUID());

  return {
    async list(value) {
      assertAdminStore(value.actorContext, value.storeId);
      return (await input.repository.listStoreMemberships(value.storeId)).map(toManagedMembership);
    },
    async grant(value) {
      const request = CreateMembershipRequestSchema.parse(value.request);
      assertAdminStore(value.actorContext, request.storeId);
      const result = await input.repository.createMembership({
        membershipId: `membership-${sanitizeIdentifier(createId())}`,
        subjectId: request.subjectId,
        displayName: request.displayName,
        role: request.role,
        storeId: request.storeId,
        storeName: request.storeName,
        idempotencyKey: request.idempotencyKey,
        occurredAt: now(),
      });
      if (!result.replayed) {
        await appendMembershipAudit({
          repository: input.auditRepository,
          actorContext: value.actorContext,
          membership: result.membership,
          action: "grant",
          idempotencyKey: request.idempotencyKey,
          occurredAt: now(),
        });
      }
      return { membership: toManagedMembership(result.membership), replayed: result.replayed };
    },
    async changeRole(value) {
      const request = ChangeMembershipRoleRequestSchema.parse(value.request);
      assertAdminStore(value.actorContext, request.storeId);
      const result = await input.repository.changeRole({
        membershipId: value.membershipId,
        storeId: request.storeId,
        role: request.role,
        expectedVersion: request.expectedVersion,
        idempotencyKey: request.idempotencyKey,
        occurredAt: now(),
      });
      if (!result.replayed) {
        await appendMembershipAudit({
          repository: input.auditRepository,
          actorContext: value.actorContext,
          membership: result.membership,
          action: "change_role",
          idempotencyKey: request.idempotencyKey,
          occurredAt: now(),
        });
      }
      return { membership: toManagedMembership(result.membership), replayed: result.replayed };
    },
    async revoke(value) {
      const request = RevokeMembershipRequestSchema.parse(value.request);
      assertAdminStore(value.actorContext, request.storeId);
      const result = await input.repository.revokeMembership({
        membershipId: value.membershipId,
        storeId: request.storeId,
        expectedVersion: request.expectedVersion,
        idempotencyKey: request.idempotencyKey,
        occurredAt: now(),
      });
      if (!result.replayed) {
        await appendMembershipAudit({
          repository: input.auditRepository,
          actorContext: value.actorContext,
          membership: result.membership,
          action: "revoke",
          idempotencyKey: request.idempotencyKey,
          occurredAt: now(),
          reason: request.reason,
        });
      }
      return { membership: toManagedMembership(result.membership), replayed: result.replayed };
    },
  };
}

function assertAdminStore(actorContext: AuthorizedActorContext, storeId: string): void {
  if (actorContext.membership.storeId !== storeId || actorContext.membership.role !== "admin") {
    throw new Error("Membership administration is outside the authorized store scope.");
  }
}

async function appendMembershipAudit(input: {
  repository: AuditEventRepository;
  actorContext: AuthorizedActorContext;
  membership: ManagedMembershipRecord;
  action: "grant" | "change_role" | "revoke";
  idempotencyKey: string;
  occurredAt: Date;
  reason?: string;
}): Promise<void> {
  await input.repository.append(
    AuditEventRecordSchema.parse({
      eventId: `audit:membership:${sanitizeIdentifier(input.idempotencyKey)}`,
      idempotencyKey: `audit:membership:${input.idempotencyKey}`,
      type: "membership.changed",
      store: { storeId: input.membership.storeId, storeName: input.membership.storeName },
      actor: {
        actorId: input.actorContext.identity.subjectId,
        displayName:
          input.actorContext.identity.displayName ?? input.actorContext.membership.subjectId,
        roleSnapshot: input.actorContext.membership.role,
      },
      target: {
        type: "membership",
        id: input.membership.membershipId,
        label: "Vinculo operacional",
      },
      occurredAt: input.occurredAt.toISOString(),
      receivedAt: input.occurredAt.toISOString(),
      summary: membershipSummary(input.action),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      status: "received",
      metadata: {
        action: `membership.${input.action}`,
        role: input.membership.role,
        version: input.membership.version,
      },
    }),
  );
}

function membershipSummary(action: "grant" | "change_role" | "revoke"): string {
  if (action === "grant") return "Vinculo operacional concedido.";
  if (action === "change_role") return "Papel operacional atualizado.";
  return "Vinculo operacional revogado.";
}

function toManagedMembership(record: ManagedMembershipRecord): ManagedStoreMembership {
  return ManagedStoreMembershipSchema.parse({
    membershipId: record.membershipId,
    subjectId: record.subjectId,
    displayName: record.displayName,
    role: record.role,
    storeId: record.storeId,
    storeName: record.storeName,
    status: record.status,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
  if (sanitized.length === 0)
    throw new Error("Membership identifier cannot be empty after sanitization.");
  return sanitized;
}
