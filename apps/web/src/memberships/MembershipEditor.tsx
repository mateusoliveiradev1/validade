import { useState } from "react";
import type { AuthorizationRole, ManagedStoreMembership } from "@validade-zero/contracts";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

export function MembershipEditor(input: {
  storeId: string;
  storeName: string;
  onCreated: (membership: ManagedStoreMembership) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AuthorizationRole>("collaborator");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch("/memberships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeId: input.storeId,
          storeName: input.storeName,
          subjectId,
          displayName,
          role,
          idempotencyKey: `membership-grant:${input.storeId}:${subjectId}:${role}`,
        }),
      });
      if (!response.ok) throw new Error("Nao foi possivel criar o vinculo agora.");
      const payload = (await response.json()) as { membership: ManagedStoreMembership };
      input.onCreated(payload.membership);
      setSubjectId("");
      setDisplayName("");
      setRole("collaborator");
      setConfirming(false);
      setMessage("Vinculo operacional salvo e auditado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nao foi possivel criar o vinculo agora.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="membership-editor-title"
      className="grid gap-4 rounded-lg border border-border bg-card p-5"
    >
      <div className="grid gap-1">
        <h2 id="membership-editor-title" className="m-0 text-lg font-semibold">
          Novo vinculo operacional
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          Identidade e unidade ficam explicitas. O papel nao herda autoridade de outro vinculo.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Identificador da pessoa
          <Input
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Nome exibido
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Unidade
          <Input value={input.storeName} readOnly aria-label="Unidade do vinculo" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Papel
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as AuthorizationRole)}
          >
            <option value="collaborator">Colaborador</option>
            <option value="lead">Lideranca</option>
            <option value="admin">Administracao</option>
          </Select>
        </label>
      </div>
      <p className="m-0 text-sm text-muted-foreground" data-testid="membership-capability-summary">
        {capabilitySummary(role)}
      </p>
      {confirming ? (
        <AlertDialog>
          <AlertDialogTitle>Confirmar novo vinculo</AlertDialogTitle>
          <AlertDialogDescription>
            {displayName || "Esta pessoa"} recebera o papel de {roleLabel(role)} em{" "}
            {input.storeName}.
          </AlertDialogDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              Confirmar vinculo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
          </div>
        </AlertDialog>
      ) : (
        <Button
          type="button"
          className="w-fit"
          disabled={subjectId.trim().length === 0 || displayName.trim().length === 0}
          onClick={() => setConfirming(true)}
        >
          Revisar novo vinculo
        </Button>
      )}
      {message === undefined ? null : (
        <p aria-live="polite" className="m-0 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

function roleLabel(role: AuthorizationRole): string {
  if (role === "lead") return "Lideranca";
  if (role === "admin") return "Administracao";
  return "Colaborador";
}

function capabilitySummary(role: AuthorizationRole): string {
  if (role === "lead") {
    return "Lideranca pode assumir tarefas e fechar turno nesta loja; a autoridade nao se estende a outras lojas.";
  }
  if (role === "admin") {
    return "Administracao governa vinculos e politicas; este papel sozinho nao permite fechar turno.";
  }
  return "Colaborador registra a execucao fisica; nao recebe encerramento de turno nem administracao.";
}
