import {
  CommandCenterProjectionSchema,
  SafePushTestResultSchema,
  type CommandCenterProjection,
  type SafePushTestResult,
} from "@validade-zero/contracts";

export interface CommandCenterClient {
  read(input: { storeId: string }): Promise<CommandCenterProjection>;
  sendSafePushTest(input: {
    storeId: string;
    deviceIdMasked: string;
    deviceLabel?: string;
  }): Promise<SafePushTestResult>;
}

export function createFetchCommandCenterClient(fetcher: typeof fetch = fetch): CommandCenterClient {
  return {
    async read(input) {
      const response = await fetcher(
        `/command-center?storeId=${encodeURIComponent(input.storeId)}`,
      );
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error("Nao foi possivel atualizar o Command Center.");
      }

      return CommandCenterProjectionSchema.parse(payload);
    },
    async sendSafePushTest(input) {
      const response = await fetcher("/pilot/push-tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error("Nao foi possivel enviar o teste seguro de push.");
      }

      return SafePushTestResultSchema.parse(payload);
    },
  };
}
