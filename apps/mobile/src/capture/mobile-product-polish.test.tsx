import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("mobile product polish", () => {
  it("keeps the main operational surfaces inside the approved token and type system", () => {
    const surfaces = [
      source("./CaptureApp.tsx"),
      source("./TodayScreen.tsx"),
      source("./TaskResolutionPanel.tsx"),
      source("./ShiftCloseScreen.tsx"),
      source("./offline-sync-ui.tsx"),
    ].join("\n");

    expect(surfaces).not.toContain('fontWeight: "700"');
    expect(surfaces).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(surfaces).not.toMatch(/smoke|expo default|fake-auth/i);
    expect(surfaces).toContain("captureColors");
    expect(surfaces).toContain("captureSpacing");
  });

  it("keeps account identity, safety loading, sync, evidence, and close truth explicit", () => {
    const app = source("../../App.tsx");
    const capture = source("./CaptureApp.tsx");
    const today = source("./TodayScreen.tsx");
    const task = source("./TaskResolutionPanel.tsx");
    const shiftClose = source("./ShiftCloseScreen.tsx");
    const copy = source("./today-copy.ts");

    expect(app).toContain("actorLabel={session.actor.displayName");
    expect(capture).toContain("actorLabel = todayCopy.fallbackActor");
    expect(today).toContain("Carregando riscos da area de venda");
    expect(today).toContain(
      "Aguarde a leitura das tarefas antes de concluir que a area esta segura.",
    );
    expect(task).toContain("actorLabel = todayCopy.fallbackActor");
    expect(copy).toContain("Ainda falta sincronizar para confirmacao central.");
    expect(task).toContain('evidence.kind === "photo_pending"');
    expect(shiftClose).toContain("Bloqueios atuais");
    expect(shiftClose).toContain("O horário de saída não transforma pendências em área segura.");
  });
});
