import {
  SyncTransportBatchSchema,
  SyncTransportResultSchema,
  type SyncCommandRecord,
  type SyncCommandSummary,
  type SyncTransportBatch,
  type SyncTransportResult,
} from "@validade-zero/contracts";
import type { CaptureRepository } from "./repository";
import type { NetworkState, NetworkStateProvider } from "./network-state";

const DEFAULT_MAX_BATCH_SIZE = 10;
const DEFAULT_MAX_ATTEMPTS = 3;

export interface SyncTransport {
  sendBatch(batch: SyncTransportBatch): Promise<readonly SyncTransportResult[]>;
}

export interface SyncEngine {
  syncPendingCommands(input?: SyncEngineRunInput): Promise<SyncEngineRunResult>;
}

export interface SyncEngineRunInput {
  deviceId?: string;
  manual?: boolean;
  maxBatchSize?: number;
}

export interface SyncEngineRunResult {
  state: "skipped_offline" | "skipped_degraded" | "empty" | "sent" | "transport_failed";
  network: NetworkState;
  selectedCommandIds: readonly string[];
  attemptedCommandIds: readonly string[];
  appliedResults: readonly SyncTransportResult[];
}

export function createSyncEngine(input: {
  repository: CaptureRepository;
  network: NetworkStateProvider;
  transport: SyncTransport;
  createId: () => string;
  now?: () => string;
  deviceId?: string;
  maxAttempts?: number;
}): SyncEngine {
  const now = input.now ?? (() => new Date().toISOString());
  const deviceId = input.deviceId ?? "validade-zero-mobile";
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  return {
    async syncPendingCommands(runInput) {
      const network = await input.network.read();

      if (network.kind === "offline") {
        return emptyResult("skipped_offline", network);
      }

      if (network.kind === "degraded" && runInput?.manual !== true) {
        return emptyResult("skipped_degraded", network);
      }

      const queue = await input.repository.listSyncQueue();
      const selected = queue.commands
        .filter(isSendableCommand)
        .slice(0, runInput?.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE);

      if (selected.length === 0) {
        return emptyResult("empty", network);
      }

      const attemptedAt = now();
      const attempted = await input.repository.markSyncCommandAttempt(
        selected.map((command) => command.id),
        attemptedAt,
      );
      const batch = SyncTransportBatchSchema.parse({
        batchId: input.createId(),
        deviceId: runInput?.deviceId ?? deviceId,
        commands: attempted,
        sentAt: attemptedAt,
      });

      try {
        const results = await input.transport.sendBatch(batch);
        const appliedResults = await applyTransportResults(input.repository, results);

        return {
          state: "sent",
          network,
          selectedCommandIds: selected.map((command) => command.id),
          attemptedCommandIds: attempted.map((command) => command.id),
          appliedResults,
        };
      } catch (error) {
        const retryResults = await applyTransportResults(
          input.repository,
          attempted.map((command) =>
            buildRetryResult(command, {
              error,
              maxAttempts,
            }),
          ),
        );

        return {
          state: "transport_failed",
          network,
          selectedCommandIds: selected.map((command) => command.id),
          attemptedCommandIds: attempted.map((command) => command.id),
          appliedResults: retryResults,
        };
      }
    },
  };
}

function emptyResult(
  state: SyncEngineRunResult["state"],
  network: NetworkState,
): SyncEngineRunResult {
  return {
    state,
    network,
    selectedCommandIds: [],
    attemptedCommandIds: [],
    appliedResults: [],
  };
}

function isSendableCommand(command: SyncCommandSummary): boolean {
  return command.state === "pending_sync" || command.state === "sync_failed";
}

async function applyTransportResults(
  repository: CaptureRepository,
  results: readonly SyncTransportResult[],
): Promise<readonly SyncTransportResult[]> {
  const appliedResults: SyncTransportResult[] = [];

  for (const result of results) {
    const parsed = SyncTransportResultSchema.parse(result);
    await repository.applySyncTransportResult(parsed);
    appliedResults.push(parsed);
  }

  return appliedResults;
}

function buildRetryResult(
  command: SyncCommandRecord,
  input: { error: unknown; maxAttempts: number },
): SyncTransportResult {
  const retryAfterSeconds = Math.min(30 * 2 ** Math.max(command.attemptCount - 1, 0), 900);
  const exhausted = command.attemptCount >= input.maxAttempts;
  const message = exhausted
    ? `Sync failed after ${command.attemptCount} attempts.`
    : normalizeError(input.error);

  return SyncTransportResultSchema.parse({
    status: "retry",
    commandId: command.id,
    idempotencyKey: command.idempotencyKey,
    retryAfterSeconds,
    error: message,
  });
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, 240);
  }

  return "Sync transport failed.";
}
