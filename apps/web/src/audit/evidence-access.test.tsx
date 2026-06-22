import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditTimelineItem } from "@validade-zero/contracts";
import { AuditEventDetail } from "./AuditEventDetail";
import { EvidenceAccessConfirm } from "./EvidenceAccessConfirm";

const evidenceEvent: AuditTimelineItem = {
  eventId: "audit-evidence-001",
  type: "evidence.changed",
  store: {
    storeId: "loja-piloto",
    storeName: "Loja Ficticia Piloto",
  },
  actor: {
    actorId: "collaborator-local",
    displayName: "Colaborador local",
    roleSnapshot: "collaborator",
  },
  target: {
    type: "evidence",
    id: "evidence-001",
    label: "Foto da retirada",
  },
  occurredAt: "2030-01-10T12:00:00.000Z",
  receivedAt: "2030-01-10T12:00:02.000Z",
  summary: "Evidencia recebida pelo armazenamento central.",
  status: "received",
  metadata: {
    state: "uploaded",
    targetType: "task",
    targetId: "task-001",
  },
};

afterEach(() => {
  cleanup();
});

describe("EvidenceAccessConfirm", () => {
  it("opens same-store evidence without revealing object keys or signed URLs", () => {
    const opened = vi.fn();

    render(
      <EvidenceAccessConfirm
        evidenceId="evidence-001"
        evidenceLabel="Foto da retirada"
        targetStoreId="loja-piloto"
        targetStoreName="Loja Ficticia Piloto"
        mode="same_store"
        onOpenEvidence={opened}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir evidência" }));

    expect(opened).toHaveBeenCalledWith({
      evidenceId: "evidence-001",
      confirmedTargetStore: false,
    });
    expect(document.body.textContent).not.toMatch(/objectKey|signedUrl|https?:\/\/|uri|base64/i);
  });

  it("requires explicit reason and target-store confirmation for admin exceptional access", () => {
    const opened = vi.fn();

    render(
      <EvidenceAccessConfirm
        evidenceId="evidence-001"
        evidenceLabel="Foto da retirada"
        targetStoreId="loja-piloto"
        targetStoreName="Loja Ficticia Piloto"
        mode="admin_exceptional"
        onOpenEvidence={opened}
      />,
    );

    const button = screen.getByRole("button", { name: "Abrir evidência desta loja" });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/loja Loja Ficticia Piloto/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Motivo do acesso"), {
      target: { value: "Auditoria fictícia de fechamento" },
    });
    fireEvent.click(button);

    expect(opened).toHaveBeenCalledWith({
      evidenceId: "evidence-001",
      confirmedTargetStore: true,
      reason: "Auditoria fictícia de fechamento",
    });
  });

  it("denies access without exposing storage details", () => {
    render(
      <EvidenceAccessConfirm
        evidenceId="evidence-001"
        evidenceLabel="Foto da retirada"
        targetStoreId="loja-piloto"
        targetStoreName="Loja Ficticia Piloto"
        mode="denied"
      />,
    );

    expect(screen.getByRole("alertdialog").textContent).toContain("Evidência protegida");
    expect(document.body.textContent).not.toMatch(/objectKey|signedUrl|https?:\/\/|uri|base64/i);
  });
});

describe("AuditEventDetail evidence access", () => {
  it("renders evidence access confirmation inside evidence audit details", () => {
    const opened = vi.fn();

    render(
      <AuditEventDetail
        event={evidenceEvent}
        evidenceAccessMode="admin_exceptional"
        onClose={() => undefined}
        onOpenEvidence={opened}
      />,
    );

    expect(screen.getByText("Acesso administrativo excepcional")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Motivo do acesso"), {
      target: { value: "Conferência de auditoria" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Abrir evidência desta loja" }));

    expect(opened).toHaveBeenCalledWith({
      evidenceId: "evidence-001",
      confirmedTargetStore: true,
      reason: "Conferência de auditoria",
    });
  });
});
