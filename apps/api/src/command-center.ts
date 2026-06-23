import {
  CommandCenterProjectionSchema,
  type CommandCenterProjection,
} from "@validade-zero/contracts";

export interface CommandCenterService {
  read(input: { storeId: string; storeName: string }): Promise<CommandCenterProjection>;
}

export function createInMemoryCommandCenterService(input?: {
  projection?: CommandCenterProjection;
  now?: () => Date;
}): CommandCenterService {
  const now = input?.now ?? (() => new Date());

  return {
    read(scope) {
      if (input?.projection !== undefined) {
        if (input.projection.storeId !== scope.storeId) {
          throw new Error("Command Center projection is outside the authorized store scope.");
        }

        return Promise.resolve(CommandCenterProjectionSchema.parse(input.projection));
      }

      return Promise.resolve(
        CommandCenterProjectionSchema.parse({
          storeId: scope.storeId,
          storeName: scope.storeName,
          refreshedAt: now().toISOString(),
          freshness: "stale",
          verdict: {
            state: "needs_review",
            title: "Area de venda precisa de conferencia",
            detail:
              "Ainda nao ha uma leitura central suficiente para confirmar a seguranca. Confira as tarefas no dispositivo da operacao.",
          },
          criticalLots: [],
          overdueTasks: [],
          pendingMarkdowns: [],
          pendingEvidence: [],
          syncConflicts: [],
          pendingShiftCloses: [],
          shiftHistory: [],
        }),
      );
    },
  };
}
