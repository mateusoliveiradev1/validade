import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createInMemoryAuthRepository } from "@validade-zero/database/auth-repository";
import type { AuthorizationRole } from "@validade-zero/domain";
import { createDefaultMemberships, createInMemoryMembershipRepository } from "./src/auth";
import { createApiApp } from "./src/index";

const PASSWORD = "senha-piloto-forte-123";
const PORT = 8790;
const STORE_ID = "loja-piloto";
const STORE_NAME = "Loja Ficticia Piloto";

const TEST_SECRETS = {
  tokenPepper: "local-memory-token-pepper-for-phase-18",
  passwordPepper: "local-memory-password-pepper-for-phase-18",
};

const memberships = createInMemoryMembershipRepository([
  ...createDefaultMemberships(),
  {
    subjectId: "setor-local",
    role: "collaborator",
    storeId: STORE_ID,
    storeName: STORE_NAME,
    status: "active",
  },
  {
    subjectId: "gpp-local",
    role: "gpp",
    storeId: STORE_ID,
    storeName: STORE_NAME,
    status: "active",
  },
]);

const authRepository = createInMemoryAuthRepository({
  memberships,
  secrets: TEST_SECRETS,
});

await seedAccount({
  identifier: "setor@example.invalid",
  subjectId: "setor-local",
  displayName: "Pessoa Setor",
  role: "collaborator",
});

await seedAccount({
  identifier: "gpp@example.invalid",
  subjectId: "gpp-local",
  displayName: "Pessoa GPP",
  role: "gpp",
});

const app = createApiApp({
  authRepository,
  membershipRepository: memberships,
  runtimeConfig: {
    appEnv: "local",
    controleGppEnabled: true,
  },
  now: () => new Date(),
});

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const origin = `http://${request.headers.host ?? `127.0.0.1:${PORT}`}`;
    const url = new URL(request.url ?? "/", origin);
    const body = chunks.length === 0 ? undefined : Buffer.concat(chunks);
    const fetchResponse = await app.fetch(
      new Request(url, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body,
      }),
    );

    console.log(`[phase-18] ${request.method ?? "GET"} ${url.pathname} -> ${fetchResponse.status}`);
    response.statusCode = fetchResponse.status;
    fetchResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(Buffer.from(await fetchResponse.arrayBuffer()));
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "local_memory_api_failed" }));
    console.error(error);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[phase-18] API local em http://127.0.0.1:${PORT}`);
  console.log(`[phase-18] Android emulator em http://10.0.2.2:${PORT}`);
  console.log(`[phase-18] setor@example.invalid / ${PASSWORD}`);
  console.log(`[phase-18] gpp@example.invalid / ${PASSWORD}`);
});

async function seedAccount(input: {
  identifier: string;
  subjectId: string;
  displayName: string;
  role: AuthorizationRole;
}): Promise<void> {
  const token = `${input.role}-invite-token-with-at-least-thirty-two-chars`;
  const seededAt = new Date("2026-07-03T12:00:00.000-03:00");

  await authRepository.createInvite({
    inviteId: `invite-${input.role}`,
    idempotencyKey: `phase-18-${input.role}-invite`,
    token,
    identifier: input.identifier,
    subjectId: input.subjectId,
    displayName: input.displayName,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    role: input.role,
    expiresAt: new Date("2030-01-17T10:00:00.000Z"),
    createdBy: "phase-18-local-seed",
    createdAt: seededAt,
  });

  await authRepository.activateAccount({
    token,
    password: PASSWORD,
    activatedAt: seededAt,
  });
}
