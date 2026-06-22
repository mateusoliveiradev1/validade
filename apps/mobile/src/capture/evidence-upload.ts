import type {
  EvidenceUploadAck,
  EvidenceUploadIntentRequest,
  EvidenceUploadIntentResponse,
} from "@validade-zero/contracts";
import type { EvidenceUploadQueueRecord } from "./repository";

export interface EvidenceUploadRepository {
  listEvidenceUploads(): Promise<readonly EvidenceUploadQueueRecord[]>;
  markEvidenceUploadAttempt(
    localEvidenceId: string,
    attemptedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  applyEvidenceUploadIntent(
    localEvidenceId: string,
    response: EvidenceUploadIntentResponse,
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  applyEvidenceUploadAck(
    localEvidenceId: string,
    ack: EvidenceUploadAck,
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  markEvidenceUploadFailed(
    localEvidenceId: string,
    error: string,
    failedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
}

export interface LocalEvidenceBlob {
  bytes: Uint8Array;
  mimeType: EvidenceUploadIntentRequest["mimeType"];
  sizeBytes: number;
  sha256: string;
}

export interface EvidenceUploadApiClient {
  createUploadIntent(request: EvidenceUploadIntentRequest): Promise<EvidenceUploadIntentResponse>;
  uploadContent(input: {
    assetId: string;
    storeId: string;
    bytes: Uint8Array;
    mimeType: EvidenceUploadIntentRequest["mimeType"];
    sizeBytes: number;
    sha256: string;
  }): Promise<EvidenceUploadAck>;
}

export interface EvidenceUploadRunner {
  runOnce(): Promise<EvidenceUploadRunResult>;
}

export interface EvidenceUploadRunResult {
  checked: number;
  uploaded: number;
  failed: number;
  skipped: number;
}

export function createEvidenceUploadRunner(input: {
  repository: EvidenceUploadRepository;
  client: EvidenceUploadApiClient;
  readLocalEvidence: (localUri: string) => Promise<LocalEvidenceBlob>;
  now?: () => string;
}): EvidenceUploadRunner {
  const now = input.now ?? (() => new Date().toISOString());

  return {
    async runOnce() {
      const queue = await input.repository.listEvidenceUploads();
      let uploaded = 0;
      let failed = 0;
      let skipped = 0;

      for (const queued of queue) {
        if (
          queued.state === "uploaded" ||
          queued.state === "invalidated" ||
          queued.state === "expired"
        ) {
          skipped += 1;
          continue;
        }

        try {
          let current = await input.repository.markEvidenceUploadAttempt(
            queued.localEvidenceId,
            now(),
          );
          const local = await input.readLocalEvidence(queued.localUri);
          assertLocalEvidenceMatchesQueue(queued, local);

          if (current.assetId === undefined || current.uploadPath === undefined) {
            const intent = await input.client.createUploadIntent({
              localEvidenceId: queued.localEvidenceId,
              storeId: queued.storeId,
              target: queued.target,
              mimeType: queued.mimeType,
              sizeBytes: queued.sizeBytes,
              sha256: queued.sha256,
              capturedAt: queued.capturedAt,
              idempotencyKey: `evidence:${queued.localEvidenceId}`,
            });

            current = await input.repository.applyEvidenceUploadIntent(
              queued.localEvidenceId,
              intent,
              now(),
            );
          }

          if (current.assetId === undefined) {
            throw new Error("Evidence upload intent did not return an asset id.");
          }

          const ack = await input.client.uploadContent({
            assetId: current.assetId,
            storeId: queued.storeId,
            bytes: local.bytes,
            mimeType: local.mimeType,
            sizeBytes: local.sizeBytes,
            sha256: local.sha256,
          });

          await input.repository.applyEvidenceUploadAck(queued.localEvidenceId, ack, now());
          uploaded += 1;
        } catch (error) {
          failed += 1;
          await input.repository.markEvidenceUploadFailed(
            queued.localEvidenceId,
            error instanceof Error ? error.message : "Falha ao enviar evidência.",
            now(),
          );
        }
      }

      return {
        checked: queue.length,
        uploaded,
        failed,
        skipped,
      };
    },
  };
}

function assertLocalEvidenceMatchesQueue(
  queued: EvidenceUploadQueueRecord,
  local: LocalEvidenceBlob,
): void {
  if (
    queued.mimeType !== local.mimeType ||
    queued.sizeBytes !== local.sizeBytes ||
    queued.sha256.toLowerCase() !== local.sha256.toLowerCase()
  ) {
    throw new Error("Local evidence file no longer matches the queued upload metadata.");
  }
}
