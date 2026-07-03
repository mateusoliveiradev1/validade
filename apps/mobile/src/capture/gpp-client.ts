import {
  GppAvariaCreateRequestSchema,
  GppMutationResponseSchema,
  GppPurchaseCreateRequestSchema,
  type GppAvariaCreateRequest,
  type GppMutationResponse,
  type GppPurchaseCreateRequest,
} from "@validade-zero/contracts";

import { GPP_COPY } from "./gpp-copy";

type GppHeaders = Record<string, string>;
type GppRequestKind = "avaria" | "purchase";

export type GppCreateRequest = GppAvariaCreateRequest | GppPurchaseCreateRequest;

export type GppCentralSuccess = {
  state: "central_success";
  response: Extract<GppMutationResponse, { state: "central_confirmed" | "replayed" }>;
  copy: typeof GPP_COPY.centralSuccess | typeof GPP_COPY.replayedSuccess;
};

export type GppCentralFailure = {
  state: "central_failure";
  status?: number;
  reason:
    | "validation"
    | "authorization"
    | "feature_disabled"
    | "business_rule"
    | "central_reachable_failure";
  message: string;
  retryable: boolean;
  response?: Extract<GppMutationResponse, { state: "central_failed" }>;
};

export type GppOfflinePendingCandidate = {
  state: "offline_pending_candidate";
  kind: GppRequestKind;
  request: GppCreateRequest;
  idempotencyKey: string;
  message: typeof GPP_COPY.localPending;
  error: Error;
};

export type GppCreateResult = GppCentralSuccess | GppCentralFailure | GppOfflinePendingCandidate;

export interface GppClient {
  createGppAvaria(request: GppAvariaCreateRequest): Promise<GppCreateResult>;
  createGppPurchaseRequest(request: GppPurchaseCreateRequest): Promise<GppCreateResult>;
}

export function createFetchGppClient(input: {
  baseUrl: string;
  headers?: GppHeaders | (() => GppHeaders | Promise<GppHeaders>) | undefined;
  fetcher?: typeof fetch | undefined;
}): GppClient {
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(input.baseUrl);

  return {
    createGppAvaria(request) {
      const parsed = GppAvariaCreateRequestSchema.parse(request);
      return postGppMutation({
        fetcher,
        headers: input.headers,
        baseUrl,
        path: "/gpp/avarias",
        kind: "avaria",
        request: parsed,
      });
    },
    createGppPurchaseRequest(request) {
      const parsed = GppPurchaseCreateRequestSchema.parse(request);
      return postGppMutation({
        fetcher,
        headers: input.headers,
        baseUrl,
        path: "/gpp/purchases",
        kind: "purchase",
        request: parsed,
      });
    },
  };
}

export function classifyGppMutationResponse(
  response: GppMutationResponse,
  status = 200,
): GppCentralSuccess | GppCentralFailure {
  if (response.state === "central_confirmed") {
    return { state: "central_success", response, copy: GPP_COPY.centralSuccess };
  }
  if (response.state === "replayed") {
    return { state: "central_success", response, copy: GPP_COPY.replayedSuccess };
  }
  return {
    state: "central_failure",
    status,
    reason: "business_rule",
    message: response.message,
    retryable: response.retryable,
    response,
  };
}

export function classifyGppHttpFailure(input: {
  status: number;
  payload: unknown;
}): GppCentralFailure {
  const message = centralFailureMessage(input.payload);
  if (input.status === 401 || input.status === 403) {
    return {
      state: "central_failure",
      status: input.status,
      reason: "authorization",
      message: GPP_COPY.permissionFailure,
      retryable: false,
    };
  }
  if (input.status === 404 || input.status === 503) {
    return {
      state: "central_failure",
      status: input.status,
      reason: "feature_disabled",
      message: message ?? GPP_COPY.featureDisabled,
      retryable: false,
    };
  }
  if (input.status === 400 || input.status === 422) {
    return {
      state: "central_failure",
      status: input.status,
      reason: "validation",
      message: message ?? GPP_COPY.centralFailure,
      retryable: false,
    };
  }
  return {
    state: "central_failure",
    status: input.status,
    reason: "central_reachable_failure",
    message: message ?? GPP_COPY.centralFailure,
    retryable: false,
  };
}

async function postGppMutation(input: {
  fetcher: typeof fetch;
  headers?: GppHeaders | (() => GppHeaders | Promise<GppHeaders>) | undefined;
  baseUrl: string;
  path: string;
  kind: GppRequestKind;
  request: GppCreateRequest;
}): Promise<GppCreateResult> {
  try {
    const response = await input.fetcher(`${input.baseUrl}${input.path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(await resolveHeaders(input.headers)),
      },
      body: JSON.stringify(input.request),
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      return classifyGppHttpFailure({ status: response.status, payload });
    }
    const mutation = parseMutationPayload(payload);
    return classifyGppMutationResponse(mutation, response.status);
  } catch (error) {
    return {
      state: "offline_pending_candidate",
      kind: input.kind,
      request: input.request,
      idempotencyKey: input.request.idempotencyKey,
      message: GPP_COPY.localPending,
      error: normalizeTransportError(error),
    };
  }
}

function parseMutationPayload(payload: unknown): GppMutationResponse {
  const candidate = isRecord(payload) && "response" in payload ? payload.response : payload;
  return GppMutationResponseSchema.parse(candidate);
}

async function resolveHeaders(
  headers: GppHeaders | (() => GppHeaders | Promise<GppHeaders>) | undefined,
): Promise<GppHeaders> {
  return typeof headers === "function" ? await headers() : (headers ?? {});
}

function centralFailureMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const value = payload.message ?? payload.error ?? payload.reason;
  return typeof value === "string" && value.trim().length > 0 ? value.slice(0, 280) : undefined;
}

function normalizeTransportError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("GPP central transport failed.");
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error("GPP API base URL must be an absolute HTTP URL.");
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
