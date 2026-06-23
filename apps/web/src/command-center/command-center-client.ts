import {
  CommandCenterProjectionSchema,
  type CommandCenterProjection,
} from "@validade-zero/contracts";

export interface CommandCenterClient {
  read(input: { storeId: string }): Promise<CommandCenterProjection>;
}

export function createFetchCommandCenterClient(fetcher: typeof fetch = fetch): CommandCenterClient {
  return {
    async read(input) {
      const response = await fetcher(`/command-center?storeId=${encodeURIComponent(input.storeId)}`);
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error("Nao foi possivel atualizar o Command Center.");
      }

      return CommandCenterProjectionSchema.parse(payload);
    },
  };
}
