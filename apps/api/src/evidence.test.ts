import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createInMemoryAuditRepository } from "./audit";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import { createApiApp } from "./index";

const NOW = new Date("2030-01-10T12:00:02.000Z");
const BODY = new TextEncoder().encode("fictitious evidence bytes");
const SHA256 = createHash("sha256").update(BODY).digest("hex");

function createEvidenceApp() {
  const auditRepository = createInMemoryAuditRepository();
  const app = createApiApp({
    auditRepository,
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      {
        subjectId: "collaborator-local",
        role: "collaborator",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "lead-outra",
        role: "lead",
        storeId: "loja-outra",
        storeName: "Loja Ficticia Outra",
        status: "active",
      },
      {
        subjectId: "admin-local",
        role: "admin",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
    ]),
    now: () => NOW,
  });

  return { app, auditRepository };
}

async function createIntent(app: ReturnType<typeof createApiApp>) {
  const response = await app.request("/evidence/upload-intents", {
    method: "POST",
    headers: {
      authorization: "Bearer fake:collaborator-local",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      localEvidenceId: "local-evidence-001",
      storeId: "loja-piloto",
      target: { type: "task", id: "task-evidence-001", label: "Ovos FICTICIOS" },
      mimeType: "image/jpeg",
      sizeBytes: BODY.byteLength,
      sha256: SHA256,
      capturedAt: "2030-01-10T12:00:00.000Z",
      idempotencyKey: "evidence:local-evidence-001",
    }),
  });

  return {
    response,
    body: (await response.json()) as {
      evidence: { assetId: string; state: string; uploadedAt?: string };
      uploadPath: string;
      replayed: boolean;
    },
  };
}

describe("evidence API seam", () => {
  it("moves evidence from local intent to uploaded only after private store acknowledgement", async () => {
    const { app, auditRepository } = createEvidenceApp();
    const intent = await createIntent(app);

    expect(intent.response.status).toBe(200);
    expect(intent.body.evidence).toMatchObject({
      state: "upload_requested",
      localEvidenceId: "local-evidence-001",
      storeId: "loja-piloto",
    });
    expect(intent.body.evidence.uploadedAt).toBeUndefined();
    expect(JSON.stringify(intent.body)).not.toMatch(
      /"(localUri|uri|base64|objectKey|signedUrl|imageBytes)":/i,
    );

    const upload = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/content?storeId=loja-piloto`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer fake:collaborator-local",
          "content-type": "image/jpeg",
          "x-evidence-sha256": SHA256,
        },
        body: BODY,
      },
    );
    const uploadBody = (await upload.json()) as unknown;

    expect(upload.status).toBe(200);
    expect(uploadBody).toMatchObject({
      assetId: intent.body.evidence.assetId,
      state: "uploaded",
      uploadedAt: "2030-01-10T12:00:02.000Z",
      replayed: false,
    });

    const metadata = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/metadata?storeId=loja-piloto`,
      {
        headers: { authorization: "Bearer fake:lead-local" },
      },
    );
    const metadataBody = (await metadata.json()) as unknown;

    expect(metadata.status).toBe(200);
    expect(metadataBody).toMatchObject({
      assetId: intent.body.evidence.assetId,
      state: "uploaded",
      uploadedAt: "2030-01-10T12:00:02.000Z",
    });
    expect(JSON.stringify(metadataBody)).not.toMatch(
      /"(localUri|uri|base64|objectKey|signedUrl|imageBytes)":/i,
    );
    expect(auditRepository.readEvents().map((event) => event.summary)).toEqual([
      "Envio de evidencia solicitado.",
      "Evidencia recebida pelo armazenamento central.",
    ]);
  });

  it("denies unauthorized evidence reads without leaking the evidence id", async () => {
    const { app } = createEvidenceApp();
    const intent = await createIntent(app);
    const response = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/metadata?storeId=loja-piloto`,
      {
        headers: { authorization: "Bearer fake:collaborator-local" },
      },
    );
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain(intent.body.evidence.assetId);
  });

  it("requires reasoned lead invalidation and preserves replacement metadata fields", async () => {
    const { app } = createEvidenceApp();
    const intent = await createIntent(app);

    await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/content?storeId=loja-piloto`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer fake:collaborator-local",
          "content-type": "image/jpeg",
          "x-evidence-sha256": SHA256,
        },
        body: BODY,
      },
    );

    const invalidation = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/invalidation`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer fake:lead-local",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          storeId: "loja-piloto",
          reason: "Foto desfocada; substituição será coletada.",
          occurredAt: "2030-01-10T12:03:00.000Z",
          idempotencyKey: "invalidate:local-evidence-001",
        }),
      },
    );
    const body = (await invalidation.json()) as unknown;

    expect(invalidation.status).toBe(200);
    expect(body).toMatchObject({
      state: "invalidated",
      invalidatedBy: "lead-local",
      invalidationReason: "Foto desfocada; substituição será coletada.",
      sha256: SHA256,
    });
  });

  it("requires explicit confirmation before global admin evidence access and audits it", async () => {
    const { app, auditRepository } = createEvidenceApp();
    const intent = await createIntent(app);

    await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/content?storeId=loja-piloto`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer fake:collaborator-local",
          "content-type": "image/jpeg",
          "x-evidence-sha256": SHA256,
        },
        body: BODY,
      },
    );

    const blocked = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/metadata?storeId=loja-piloto`,
      {
        headers: { authorization: "Bearer fake:admin-local" },
      },
    );
    expect(blocked.status).toBe(409);

    const confirmed = await app.request(
      `/evidence/assets/${intent.body.evidence.assetId}/metadata?storeId=loja-piloto&confirmedTargetStore=true&reason=Auditoria%20ficticia`,
      {
        headers: { authorization: "Bearer fake:admin-local" },
      },
    );
    const confirmedBody = (await confirmed.json()) as unknown;

    expect(confirmed.status).toBe(200);
    expect(confirmedBody).toMatchObject({ assetId: intent.body.evidence.assetId });
    expect(auditRepository.readEvents().at(-1)).toMatchObject({
      summary: "Acesso administrativo excepcional a evidência confirmado.",
      metadata: {
        action: "evidence.accessed_exceptionally",
        targetStore: "loja-piloto",
      },
    });
  });
});
